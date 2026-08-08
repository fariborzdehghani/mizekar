import {
  readAiProviderNumber,
  streamAiChatCompletion,
} from "@/src/ai/client";
import {
  AI_SUMMARY_MAX_TOKENS,
  prepareLetterRelationSummary,
} from "@/src/ai/features/letterRelationSummary";
import { getCurrentUser } from "@/src/lib/auth";
import { reportError } from "@/src/lib/errors";
import { parsePositiveInteger } from "@/src/lib/input";
import { createNdjsonStreamResponse } from "@/src/lib/ndjson";

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

export async function POST(
  _request: Request,
  context: RouteContext<"/api/ai/letters/[letterId]/summary">,
) {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { letterId } = await context.params;
  const parsedLetterId = parsePositiveInteger(letterId);
  if (!parsedLetterId) {
    return Response.json({ error: "Invalid letter id." }, { status: 400 });
  }

  return createNdjsonStreamResponse<StreamEvent>(
    async (write) => {
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
            180000,
          ),
          maxTokens: readAiProviderNumber(
            ["AI_LETTER_SUMMARY_MAX_TOKENS"],
            ["LM_STUDIO_AI_LETTER_SUMMARY_MAX_TOKENS"],
            AI_SUMMARY_MAX_TOKENS,
          ),
          temperature: readAiProviderNumber(
            ["AI_LETTER_SUMMARY_TEMPERATURE"],
            ["LM_STUDIO_AI_LETTER_SUMMARY_TEMPERATURE"],
            0.3,
          ),
        },
      )) {
        write({ type: "delta", text: delta });
      }
    },
    (error) => {
      reportError("api.ai.letter-summary", error);
      return { type: "error", error: "سرویس هوشمند پاسخ نداد. دوباره تلاش کنید." };
    },
  );
}
