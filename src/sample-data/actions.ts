"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/src/lib/auth";
import {
  readAiProviderString,
  requestAiChatCompletion,
} from "@/src/ai/client";
import {
  SAMPLE_DATA_DEFAULTS,
  SAMPLE_DATA_LIMITS,
  removeAllSampleData,
  seedSampleData,
  type SampleDataStats,
  type SampleDataSeedOptions,
  type SampleDataSeedSummary,
} from "@/src/sample-data/seed";

export type SampleDataActionState = {
  error?: string;
  success?: string;
  summary?: SampleDataSeedSummary;
  deleted?: SampleDataStats;
};

export type AiPromptActionState = {
  error?: string;
  response?: string;
  prompt?: string;
};

function readNumber(
  formData: FormData,
  key: keyof typeof SAMPLE_DATA_LIMITS,
  fallback: number
) {
  const value = Number(formData.get(key));
  const limits = SAMPLE_DATA_LIMITS[key];

  if (!Number.isFinite(value)) return fallback;

  return Math.min(Math.max(Math.trunc(value), limits.min), limits.max);
}

function readCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function revalidateSampleDataViews() {
  [
    "/",
    "/incoming-letters",
    "/outgoing-letters",
    "/letter-search",
    "/form-templates",
    "/new-form",
    "/incoming-forms",
    "/outgoing-forms",
    "/meetings",
    "/meeting",
    "/incoming-messages",
    "/outgoing-messages",
    "/archive",
    "/settings/users",
    "/sample-data",
  ].forEach((route) => revalidatePath(route));
}

export async function sendAiPromptAction(
  _previousState: AiPromptActionState,
  formData: FormData
): Promise<AiPromptActionState> {
  await requireUser();

  const prompt = String(formData.get("prompt") || "").trim();

  if (!prompt) {
    return { error: "Please enter a prompt." };
  }

  const systemPrompt =
    readAiProviderString(["AI_SYSTEM_PROMPT"], ["LM_STUDIO_AI_SYSTEM_PROMPT"]) ||
    "Answer directly. Do not include hidden reasoning, chain-of-thought, or <think> blocks in the response.";

  const aiResult = await requestAiChatCompletion(systemPrompt, prompt);

  if (!aiResult.success) {
    return {
      error: aiResult.error,
      prompt,
    };
  }

  return { response: aiResult.text, prompt };
}

export async function createSampleDataAction(
  _previousState: SampleDataActionState,
  formData: FormData
): Promise<SampleDataActionState> {
  const currentUser = await requireUser();
  const sampleUserPassword = String(
    formData.get("sampleUserPassword") ||
      SAMPLE_DATA_DEFAULTS.sampleUserPassword
  ).trim();

  if (sampleUserPassword.length < 8) {
    return {
      error: "رمز عبور کاربران نمونه باید حداقل ۸ کاراکتر باشد.",
    };
  }

  const options: SampleDataSeedOptions = {
    subjectCount: readNumber(
      formData,
      "subjectCount",
      SAMPLE_DATA_DEFAULTS.subjectCount
    ),
    lettersPerSubject: readNumber(
      formData,
      "lettersPerSubject",
      SAMPLE_DATA_DEFAULTS.lettersPerSubject
    ),
    formsPerSubject: readNumber(
      formData,
      "formsPerSubject",
      SAMPLE_DATA_DEFAULTS.formsPerSubject
    ),
    meetingsPerSubject: readNumber(
      formData,
      "meetingsPerSubject",
      SAMPLE_DATA_DEFAULTS.meetingsPerSubject
    ),
    messageThreadsPerSubject: readNumber(
      formData,
      "messageThreadsPerSubject",
      SAMPLE_DATA_DEFAULTS.messageThreadsPerSubject
    ),
    sampleUserCount: readNumber(
      formData,
      "sampleUserCount",
      SAMPLE_DATA_DEFAULTS.sampleUserCount
    ),
    sampleUserPassword,
    resetExisting: readCheckbox(formData, "resetExisting"),
    archiveSamples: readCheckbox(formData, "archiveSamples"),
  };

  try {
    const summary = await seedSampleData(
      {
        id: currentUser.id,
        displayName: currentUser.displayName,
      },
      options
    );

    revalidateSampleDataViews();

    return {
      success: `ایجاد داده نمونه با شناسه ${summary.runKey} کامل شد.`,
      summary,
    };
  } catch (error) {
    console.error("Error creating sample data:", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "ایجاد داده نمونه انجام نشد.",
    };
  }
}

export async function removeSampleDataAction(
  previousState: SampleDataActionState,
  formData: FormData
): Promise<SampleDataActionState> {
  void previousState;
  void formData;

  await requireUser();

  try {
    const deleted = await removeAllSampleData();
    revalidateSampleDataViews();

    return {
      success: "همه داده‌های نمونه حذف شدند.",
      deleted,
    };
  } catch (error) {
    console.error("Error removing sample data:", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "حذف داده‌های نمونه انجام نشد.",
    };
  }
}
