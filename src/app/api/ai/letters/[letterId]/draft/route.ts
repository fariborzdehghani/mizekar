import {
  readAiProviderNumber,
  streamAiChatCompletion,
} from "@/src/ai/client";
import {
  parseLetterResponseDraft,
  prepareLetterResponseDraft,
} from "@/src/ai/features/letterRelationSummary";
import { getCurrentUser } from "@/src/lib/auth";
import { reportError } from "@/src/lib/errors";
import { parsePositiveInteger, readJsonObject } from "@/src/lib/input";
import { createNdjsonStreamResponse } from "@/src/lib/ndjson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(
  request: Request,
  context: RouteContext<"/api/ai/letters/[letterId]/draft">,
) {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { letterId } = await context.params;
  const parsedLetterId = parsePositiveInteger(letterId);
  if (!parsedLetterId) {
    return Response.json({ error: "Invalid letter id." }, { status: 400 });
  }

  const body = await readJsonObject(request);
  if (!body) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const summary = typeof body.summary === "string" ? body.summary : "";
  const userInstruction =
    typeof body.userInstruction === "string" ? body.userInstruction : "";

  return createNdjsonStreamResponse<StreamEvent>(
    async (write) => {
      const preparedDraft = await prepareLetterResponseDraft(
        parsedLetterId,
        summary,
        userInstruction,
      );

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
          ["AI_LETTER_DRAFT_TIMEOUT_MS"],
          ["LM_STUDIO_AI_LETTER_DRAFT_TIMEOUT_MS"],
          240000
        ),
        maxTokens: readAiProviderNumber(
          ["AI_LETTER_DRAFT_MAX_TOKENS"],
          ["LM_STUDIO_AI_LETTER_DRAFT_MAX_TOKENS"],
          1800
        ),
        temperature: readAiProviderNumber(
          ["AI_LETTER_DRAFT_TEMPERATURE"],
          ["LM_STUDIO_AI_LETTER_DRAFT_TEMPERATURE"],
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
    },
    (error) => {
      reportError("api.ai.letter-response-draft", error);
      return { type: "error", error: "سرویس هوشمند پاسخ نداد. دوباره تلاش کنید." };
    },
  );
}
