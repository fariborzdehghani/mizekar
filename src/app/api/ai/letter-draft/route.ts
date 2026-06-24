import {
  readAiProviderNumber,
  streamAiChatCompletion,
} from "@/src/ai/client";
import {
  parseLetterResponseDraft,
  prepareNewLetterDraft,
} from "@/src/ai/features/letterRelationSummary";
import { requireUser } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DraftRequestBody = {
  prompt?: unknown;
  title?: unknown;
  content?: unknown;
};

type StreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "draft";
      title: string;
      content: string;
    }
  | {
      type: "error";
      error: string;
    };

function createStreamResponse(
  handler: (write: (event: StreamEvent) => void) => Promise<void>
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await handler(write);
      } catch (error) {
        write({
          type: "error",
          error: error instanceof Error ? error.message : "AI stream failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DraftRequestBody;

  try {
    body = (await request.json()) as DraftRequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const title = typeof body.title === "string" ? body.title : "";
  const content = typeof body.content === "string" ? body.content : "";

  return createStreamResponse(async (write) => {
    const preparedDraft = await prepareNewLetterDraft(prompt, title, content);

    if (!preparedDraft.success) {
      write({ type: "error", error: preparedDraft.error });
      return;
    }

    let fullText = "";

    for await (const delta of streamAiChatCompletion(
      preparedDraft.systemPrompt,
      preparedDraft.userPrompt,
      {
        timeoutMs: readAiProviderNumber(
          ["AI_NEW_LETTER_DRAFT_TIMEOUT_MS", "AI_LETTER_DRAFT_TIMEOUT_MS"],
          [
            "LM_STUDIO_AI_NEW_LETTER_DRAFT_TIMEOUT_MS",
            "LM_STUDIO_AI_LETTER_DRAFT_TIMEOUT_MS",
          ],
          240000
        ),
        maxTokens: readAiProviderNumber(
          ["AI_NEW_LETTER_DRAFT_MAX_TOKENS", "AI_LETTER_DRAFT_MAX_TOKENS"],
          [
            "LM_STUDIO_AI_NEW_LETTER_DRAFT_MAX_TOKENS",
            "LM_STUDIO_AI_LETTER_DRAFT_MAX_TOKENS",
          ],
          1800
        ),
        temperature: readAiProviderNumber(
          ["AI_NEW_LETTER_DRAFT_TEMPERATURE", "AI_LETTER_DRAFT_TEMPERATURE"],
          [
            "LM_STUDIO_AI_NEW_LETTER_DRAFT_TEMPERATURE",
            "LM_STUDIO_AI_LETTER_DRAFT_TEMPERATURE",
          ],
          0.45
        ),
      }
    )) {
      fullText += delta;
      write({ type: "delta", text: delta });
    }

    const draft = parseLetterResponseDraft(
      fullText,
      preparedDraft.fallbackTitle
    );

    if (!draft.success) {
      write({ type: "error", error: draft.error });
      return;
    }

    write({
      type: "draft",
      title: draft.title,
      content: draft.content,
    });
  });
}
