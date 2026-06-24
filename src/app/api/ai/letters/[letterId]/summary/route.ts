import {
  readAiProviderNumber,
  streamAiChatCompletion,
} from "@/src/ai/client";
import {
  AI_SUMMARY_MAX_TOKENS,
  prepareLetterRelationSummary,
} from "@/src/ai/features/letterRelationSummary";
import { requireUser } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamEvent =
  | {
      type: "meta";
      letterCount: number;
      relatedLetterCount: number;
      relationCount: number;
      truncated: boolean;
    }
  | {
      type: "delta";
      text: string;
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

export async function POST(
  _request: Request,
  context: { params: Promise<{ letterId: string }> }
) {
  try {
    await requireUser();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { letterId } = await context.params;
  const parsedLetterId = Number(letterId);

  return createStreamResponse(async (write) => {
    const preparedSummary = await prepareLetterRelationSummary(parsedLetterId);

    if (!preparedSummary.success) {
      write({ type: "error", error: preparedSummary.error });
      return;
    }

    write({
      type: "meta",
      letterCount: preparedSummary.meta.letterCount,
      relatedLetterCount: preparedSummary.meta.relatedLetterCount,
      relationCount: preparedSummary.meta.relationCount,
      truncated: preparedSummary.meta.truncated,
    });

    if (preparedSummary.staticSummary) {
      write({ type: "delta", text: preparedSummary.staticSummary });
      return;
    }

    if (!preparedSummary.systemPrompt || !preparedSummary.userPrompt) {
      write({
        type: "error",
        error: "درخواست خلاصه هوشمند کامل نیست.",
      });
      return;
    }

    for await (const delta of streamAiChatCompletion(
      preparedSummary.systemPrompt,
      preparedSummary.userPrompt,
      {
        timeoutMs: readAiProviderNumber(
          ["AI_LETTER_SUMMARY_TIMEOUT_MS"],
          ["LM_STUDIO_AI_LETTER_SUMMARY_TIMEOUT_MS"],
          180000
        ),
        maxTokens: readAiProviderNumber(
          ["AI_LETTER_SUMMARY_MAX_TOKENS"],
          ["LM_STUDIO_AI_LETTER_SUMMARY_MAX_TOKENS"],
          AI_SUMMARY_MAX_TOKENS
        ),
        temperature: readAiProviderNumber(
          ["AI_LETTER_SUMMARY_TEMPERATURE"],
          ["LM_STUDIO_AI_LETTER_SUMMARY_TEMPERATURE"],
          0.3
        ),
      }
    )) {
      write({ type: "delta", text: delta });
    }
  });
}
