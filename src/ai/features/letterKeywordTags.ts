import "server-only";

import {
  readAiProviderNumber,
  readAiProviderString,
  requestAiChatCompletion,
} from "@/src/ai/client";
import { getPlainText } from "@/src/lib/richText";
import {
  normalizeLetterTagKey,
  uniqueLetterTagNames,
} from "@/src/lib/letterTags";

const AI_TAG_TIMEOUT_MS = 120_000;
const AI_TAG_MAX_TOKENS = 250;
const AI_TAG_CONTENT_CHAR_LIMIT = 3000;
const AI_TAG_MAX_COUNT = 6;

const GENERIC_TAG_KEYS = new Set(
  [
    "نامه",
    "مکاتبه",
    "مکاتبات",
    "موضوع نامه",
    "متن نامه",
    "درخواست",
    "درخواست ها",
    "درخواست‌ها",
    "پاسخ",
    "پاسخ نامه",
    "پیگیری",
    "پیگیری نامه",
    "اقدام",
    "اقدامات",
    "بررسی",
    "تایید",
    "تأیید",
    "هماهنگی",
    "همکاری",
    "گزارش",
    "اطلاع رسانی",
    "اطلاع‌رسانی",
    "مدیریت",
    "اداری",
    "امور اداری",
    "سازمان",
    "شرکت",
    "واحد",
    "بخش",
    "اداره",
    "موضوع",
    "وضعیت",
    "فرایند",
    "فرآیند",
    "مستندات",
    "مدارک",
  ].map(normalizeLetterTagKey)
);

export type LetterKeywordTagsResult =
  | {
      success: true;
      tags: string[];
    }
  | {
      success: false;
      error: string;
      tags: string[];
    };

function truncatePromptText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength).trim()}...`;
}

function parseJsonObjectOrArray(value: string) {
  const cleanedValue = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleanedValue) as unknown;
  } catch {
    const objectStart = cleanedValue.indexOf("{");
    const objectEnd = cleanedValue.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(cleanedValue.slice(objectStart, objectEnd + 1)) as unknown;
      } catch {
        return null;
      }
    }

    const arrayStart = cleanedValue.indexOf("[");
    const arrayEnd = cleanedValue.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(cleanedValue.slice(arrayStart, arrayEnd + 1)) as unknown;
      } catch {
        return null;
      }
    }

    return null;
  }
}

function parseAiTags(value: string) {
  const parsedValue = parseJsonObjectOrArray(value);

  if (Array.isArray(parsedValue)) {
    return uniqueLetterTagNames(
      parsedValue.map((tag) => (typeof tag === "string" ? tag : ""))
    );
  }

  if (parsedValue && typeof parsedValue === "object") {
    const tags = (parsedValue as { tags?: unknown }).tags;

    if (Array.isArray(tags)) {
      return uniqueLetterTagNames(
        tags.map((tag) => (typeof tag === "string" ? tag : ""))
      );
    }
  }

  return uniqueLetterTagNames(value.split(/[،,\n]/));
}

function isGenericTag(tagName: string) {
  const key = normalizeLetterTagKey(tagName);

  if (!key || key.length < 3 || GENERIC_TAG_KEYS.has(key)) return true;

  const words = key.split(/\s+/).filter(Boolean);

  return words.length === 1 && GENERIC_TAG_KEYS.has(words[0]);
}

function filterSubjectSpecificTags(tags: string[]) {
  return uniqueLetterTagNames(tags)
    .filter((tag) => !isGenericTag(tag))
    .slice(0, AI_TAG_MAX_COUNT);
}

export async function generateLetterKeywordTagsWithAi(
  title: string,
  content: string
): Promise<LetterKeywordTagsResult> {
  const plainContent = getPlainText(content);
  const plainTitle = getPlainText(title);

  if (!plainContent) {
    return {
      success: false,
      error: "برای تولید کلیدواژه، ابتدا متن نامه را وارد کنید.",
      tags: [],
    };
  }

  const systemPrompt =
    readAiProviderString(
      ["AI_LETTER_TAG_SYSTEM_PROMPT"],
      ["LM_STUDIO_AI_LETTER_TAG_SYSTEM_PROMPT"]
    ) ||
    [
      "You create concise Persian subject keywords for office letters.",
      "Use only the provided letter text.",
      "Choose only important, subject-specific technical/domain keywords.",
      "Prefer concrete terms such as project names, contract/budget/legal/security/procurement/HR/technical concepts, product/service names, risk names, systems, deliverables, or named work streams.",
      "Do not create generic office-process tags such as letter, request, response, follow-up, review, approval, coordination, report, organization, management, documents, status, or action.",
      "Return only valid JSON with a tags array.",
      "Tags must be short nouns or noun phrases, without #, punctuation, duplicates, or explanations.",
      "Return 3 to 6 tags. If the text has fewer important subject keywords, return fewer tags.",
      "Do not include hidden reasoning, chain-of-thought, markdown fences, or <think> blocks.",
    ].join(" ");
  const userPrompt = [
    "Create only important technical/domain keyword tags for this Persian office letter.",
    "Reject broad administrative labels. A good tag should help find letters about the same specific subject, not just any office correspondence.",
    'Return exactly this JSON shape: {"tags":["keyword","keyword"]}',
    "",
    "Letter title:",
    plainTitle || "-",
    "",
    "Letter text:",
    truncatePromptText(
      plainContent || "(No content registered.)",
      AI_TAG_CONTENT_CHAR_LIMIT
    ),
  ].join("\n");
  const aiResult = await requestAiChatCompletion(systemPrompt, userPrompt, {
    timeoutMs: readAiProviderNumber(
      ["AI_LETTER_TAG_TIMEOUT_MS"],
      ["LM_STUDIO_AI_LETTER_TAG_TIMEOUT_MS"],
      AI_TAG_TIMEOUT_MS
    ),
    retries: readAiProviderNumber(
      ["AI_LETTER_TAG_RETRIES"],
      ["LM_STUDIO_AI_LETTER_TAG_RETRIES"],
      0
    ),
    maxTokens: readAiProviderNumber(
      ["AI_LETTER_TAG_MAX_TOKENS"],
      ["LM_STUDIO_AI_LETTER_TAG_MAX_TOKENS"],
      AI_TAG_MAX_TOKENS
    ),
    temperature: readAiProviderNumber(
      ["AI_LETTER_TAG_TEMPERATURE"],
      ["LM_STUDIO_AI_LETTER_TAG_TEMPERATURE"],
      0.25
    ),
  });

  if (!aiResult.success) {
    return {
      success: false,
      error: aiResult.error,
      tags: [],
    };
  }

  const tags = filterSubjectSpecificTags(parseAiTags(aiResult.text));

  if (tags.length === 0) {
    return {
      success: false,
      error: "پاسخ هوش مصنوعی کلیدواژه معتبری نداشت.",
      tags: [],
    };
  }

  return {
    success: true,
    tags,
  };
}
