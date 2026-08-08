import {
  readAiProviderNumber,
  streamAiChatCompletion,
} from "@/src/ai/client";
import {
  parseLetterResponseDraft,
  prepareNewLetterDraft,
} from "@/src/ai/features/letterRelationSummary";
import { getCurrentUser } from "@/src/lib/auth";
import { reportError } from "@/src/lib/errors";
import { readJsonObject } from "@/src/lib/input";
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

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  if (!body) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const title = typeof body.title === "string" ? body.title : "";
  const content = typeof body.content === "string" ? body.content : "";

  return createNdjsonStreamResponse<StreamEvent>(
    async (write) => {
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
    },
    (error) => {
      reportError("api.ai.letter-draft", error);
      return { type: "error", error: "سرویس هوشمند پاسخ نداد. دوباره تلاش کنید." };
    },
  );
}
