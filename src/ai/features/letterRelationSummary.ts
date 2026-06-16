import "server-only";

import { prisma } from "@/src/lib/prisma";
import {
  readAiProviderNumber,
  readAiProviderString,
  requestAiChatCompletion,
} from "@/src/ai/client";
import { getPlainText } from "@/src/lib/richText";

const AI_SUMMARY_MAX_LETTERS = 12;
const AI_SUMMARY_MAX_DEPTH = 5;
const AI_SUMMARY_CONTENT_CHAR_LIMIT = 700;
const AI_SUMMARY_TIMEOUT_MS = 180_000;
const AI_SUMMARY_MAX_TOKENS = 900;
const AI_DRAFT_TIMEOUT_MS = 240_000;
const AI_DRAFT_MAX_TOKENS = 1800;
const AI_DRAFT_SUMMARY_CHAR_LIMIT = 5000;
const AI_DRAFT_USER_PROMPT_CHAR_LIMIT = 2500;
const AI_DRAFT_SOURCE_CONTENT_CHAR_LIMIT = 1200;

type LetterRelationTreeNode = {
  id: number;
  title: string | null;
  internal_number: string | null;
  external_number: string | null;
  contents: string | null;
  create_date: Date | null;
};

type LetterRelationTreeEdge = {
  mainLetterId: number;
  relatedLetterId: number;
};

type LetterRelationTree = {
  letters: LetterRelationTreeNode[];
  edges: LetterRelationTreeEdge[];
  depthById: Map<number, number>;
  parentById: Map<number, number>;
  truncated: boolean;
};

export type LetterRelationSummaryResult = {
  success: boolean;
  summary?: string;
  error?: string;
  letterCount?: number;
  relatedLetterCount?: number;
  relationCount?: number;
  truncated?: boolean;
};

export type LetterRelationSummaryMeta = {
  letterCount: number;
  relatedLetterCount: number;
  relationCount: number;
  truncated: boolean;
};

export type LetterRelationSummaryPreparationResult =
  | {
      success: true;
      meta: LetterRelationSummaryMeta;
      staticSummary?: string;
      systemPrompt?: string;
      userPrompt?: string;
    }
  | {
      success: false;
      error: string;
    };

export type LetterResponseDraftResult =
  | {
      success: true;
      title: string;
      content: string;
    }
  | {
      success: false;
      error: string;
    };

export type LetterResponseDraftPreparationResult =
  | {
      success: true;
      systemPrompt: string;
      userPrompt: string;
      fallbackTitle: string;
    }
  | {
      success: false;
      error: string;
    };

function getRelationEdgeKey(firstId: number, secondId: number) {
  return firstId < secondId ? `${firstId}:${secondId}` : `${secondId}:${firstId}`;
}

function getLetterSummaryNumber(letter: LetterRelationTreeNode) {
  return letter.internal_number || letter.external_number || `#${letter.id}`;
}

function getLetterSummaryLabel(
  letter: LetterRelationTreeNode | undefined,
  id: number
) {
  if (!letter) return `#${id}`;

  return `${getLetterSummaryNumber(letter)} (ID ${letter.id})`;
}

function formatPromptDate(value: Date | null) {
  if (!value) return "-";

  return Number.isNaN(value.getTime()) ? "-" : value.toISOString().slice(0, 10);
}

function truncatePromptText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength).trim()}...`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToDraftHtml(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return "<p></p>";

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sanitizeDraftHtml(value: string) {
  const trimmedValue = value.trim();
  const html = /<\/?[a-z][\s\S]*>/i.test(trimmedValue)
    ? trimmedValue
    : textToDraftHtml(trimmedValue);

  const sanitized = html
    .replace(/```(?:html)?/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src)=["']\s*javascript:[^"']*["']/gi, "");

  return sanitized.trim() || "<p></p>";
}

function parseJsonObject(value: string) {
  const cleanedValue = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleanedValue) as unknown;
  } catch {
    const startIndex = cleanedValue.indexOf("{");
    const endIndex = cleanedValue.lastIndexOf("}");

    if (startIndex >= 0 && endIndex > startIndex) {
      try {
        return JSON.parse(cleanedValue.slice(startIndex, endIndex + 1)) as unknown;
      } catch {
        return null;
      }
    }

    return null;
  }
}

function getDraftField(data: unknown, key: "title" | "content" | "html") {
  if (!data || typeof data !== "object") return "";

  const value = (data as Record<string, unknown>)[key];

  return typeof value === "string" ? value.trim() : "";
}

function buildPathIds(letterId: number, parentById: Map<number, number>) {
  const pathIds: number[] = [];
  const seenIds = new Set<number>();
  let currentId: number | undefined = letterId;

  while (currentId && !seenIds.has(currentId)) {
    pathIds.push(currentId);
    seenIds.add(currentId);
    currentId = parentById.get(currentId);
  }

  return pathIds.reverse();
}

async function collectRelatedLetterTree(
  rootLetterId: number
): Promise<LetterRelationTree> {
  const visitedIds = new Set<number>([rootLetterId]);
  const depthById = new Map<number, number>([[rootLetterId, 0]]);
  const parentById = new Map<number, number>();
  const edgesByKey = new Map<string, LetterRelationTreeEdge>();
  let frontierIds = [rootLetterId];
  let truncated = false;

  while (frontierIds.length > 0) {
    const frontierSet = new Set(frontierIds);
    const maxFrontierDepth = Math.max(
      ...frontierIds.map((id) => depthById.get(id) || 0)
    );

    if (maxFrontierDepth >= AI_SUMMARY_MAX_DEPTH) {
      truncated = true;
      break;
    }

    const relationRows = await prisma.letter_related_letters.findMany({
      where: {
        OR: [
          { main_letter_id: { in: frontierIds } },
          { related_letter_id: { in: frontierIds } },
        ],
      },
      select: {
        main_letter_id: true,
        related_letter_id: true,
      },
    });

    const nextFrontierIds: number[] = [];

    for (const relation of relationRows) {
      const mainLetterId = relation.main_letter_id;
      const relatedLetterId = relation.related_letter_id;

      if (
        !mainLetterId ||
        !relatedLetterId ||
        mainLetterId === relatedLetterId
      ) {
        continue;
      }

      edgesByKey.set(getRelationEdgeKey(mainLetterId, relatedLetterId), {
        mainLetterId,
        relatedLetterId,
      });

      const candidates: Array<[number, number]> = [];
      if (frontierSet.has(mainLetterId)) {
        candidates.push([mainLetterId, relatedLetterId]);
      }
      if (frontierSet.has(relatedLetterId)) {
        candidates.push([relatedLetterId, mainLetterId]);
      }

      for (const [sourceId, targetId] of candidates) {
        if (visitedIds.has(targetId)) continue;

        if (visitedIds.size >= AI_SUMMARY_MAX_LETTERS) {
          truncated = true;
          continue;
        }

        visitedIds.add(targetId);
        parentById.set(targetId, sourceId);
        depthById.set(targetId, (depthById.get(sourceId) || 0) + 1);
        nextFrontierIds.push(targetId);
      }
    }

    if (nextFrontierIds.length === 0) break;

    frontierIds = nextFrontierIds;
  }

  const letters = await prisma.letters.findMany({
    where: {
      id: {
        in: Array.from(visitedIds),
      },
    },
    select: {
      id: true,
      title: true,
      internal_number: true,
      external_number: true,
      contents: true,
      create_date: true,
    },
  });
  const existingIds = new Set(letters.map((letter) => letter.id));
  const edges = Array.from(edgesByKey.values()).filter(
    (edge) =>
      existingIds.has(edge.mainLetterId) && existingIds.has(edge.relatedLetterId)
  );

  return {
    letters,
    edges,
    depthById,
    parentById,
    truncated,
  };
}

function buildLetterRelationSummaryPrompt(
  rootLetterId: number,
  tree: LetterRelationTree
) {
  const lettersById = new Map(tree.letters.map((letter) => [letter.id, letter]));
  const rootLetter = lettersById.get(rootLetterId);
  const sortedLetters = [...tree.letters].sort((first, second) => {
    const depthDiff =
      (tree.depthById.get(first.id) || 0) - (tree.depthById.get(second.id) || 0);

    if (depthDiff !== 0) return depthDiff;

    return first.id - second.id;
  });
  const relationsText =
    tree.edges.length > 0
      ? tree.edges
          .map((edge) => {
            const mainLabel = getLetterSummaryLabel(
              lettersById.get(edge.mainLetterId),
              edge.mainLetterId
            );
            const relatedLabel = getLetterSummaryLabel(
              lettersById.get(edge.relatedLetterId),
              edge.relatedLetterId
            );

            return `- ${mainLabel} <-> ${relatedLabel}`;
          })
          .join("\n")
      : "- No related-letter edges found.";
  const lettersText = sortedLetters
    .map((letter) => {
      const path = buildPathIds(letter.id, tree.parentById)
        .map((id) => getLetterSummaryLabel(lettersById.get(id), id))
        .join(" -> ");
      const content = getPlainText(letter.contents);

      return [
        `Letter: ${getLetterSummaryLabel(letter, letter.id)}`,
        `Depth from current letter: ${tree.depthById.get(letter.id) || 0}`,
        `Path from current letter: ${path}`,
        `Title: ${letter.title || "-"}`,
        `Create date: ${formatPromptDate(letter.create_date)}`,
        "Content:",
        truncatePromptText(
          content || "(No content registered.)",
          AI_SUMMARY_CONTENT_CHAR_LIMIT
        ),
      ].join("\n");
    })
    .join("\n\n---\n\n");
  const truncationNote = tree.truncated
    ? "The relation tree was truncated because it exceeded the configured traversal limit."
    : "The full discovered relation tree is included.";

  return [
    "Summarize the full related-letter tree for the current letter.",
    "Answer in Persian. Use only the provided letter data. Do not invent missing details.",
    "Include: overall subject, key requests/decisions/status, important timeline, how letters are connected, and open follow-ups.",
    "Keep the result concise and useful for someone viewing the letter. Use no more than 8 short bullets.",
    "",
    `Current letter: ${getLetterSummaryLabel(rootLetter, rootLetterId)}`,
    `Included letters: ${tree.letters.length}`,
    `Included relation edges: ${tree.edges.length}`,
    truncationNote,
    "",
    "Relations:",
    relationsText,
    "",
    "Letters:",
    lettersText,
  ].join("\n");
}

export async function summarizeRelatedLetterTreeWithAi(
  letterId: number
): Promise<LetterRelationSummaryResult> {
  const preparedSummary = await prepareLetterRelationSummary(letterId);

  if (!preparedSummary.success) {
    return preparedSummary;
  }

  if (preparedSummary.staticSummary) {
    return {
      success: true,
      summary: preparedSummary.staticSummary,
      ...preparedSummary.meta,
    };
  }

  if (!preparedSummary.systemPrompt || !preparedSummary.userPrompt) {
    return {
      success: false,
      error: "درخواست خلاصه هوشمند کامل نیست.",
      ...preparedSummary.meta,
    };
  }

  const aiResult = await requestAiChatCompletion(
    preparedSummary.systemPrompt,
    preparedSummary.userPrompt,
    {
      timeoutMs: readAiProviderNumber(
        ["AI_LETTER_SUMMARY_TIMEOUT_MS"],
        ["LM_STUDIO_AI_LETTER_SUMMARY_TIMEOUT_MS"],
        AI_SUMMARY_TIMEOUT_MS
      ),
      retries: readAiProviderNumber(
        ["AI_LETTER_SUMMARY_RETRIES"],
        ["LM_STUDIO_AI_LETTER_SUMMARY_RETRIES"],
        0
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
  );

  if (!aiResult.success) {
    return {
      success: false,
      error: aiResult.error,
      ...preparedSummary.meta,
    };
  }

  return {
    success: true,
    summary: aiResult.text,
    ...preparedSummary.meta,
  };
}

export async function prepareLetterResponseDraft(
  letterId: number,
  summary: string,
  userInstruction: string
): Promise<LetterResponseDraftPreparationResult> {
  if (!Number.isInteger(letterId) || letterId <= 0) {
    return {
      success: false,
      error: "نامه معتبر نیست.",
    };
  }

  const trimmedSummary = summary.trim();
  const trimmedInstruction = userInstruction.trim();

  if (!trimmedSummary) {
    return {
      success: false,
      error: "ابتدا خلاصه هوشمند نامه‌های مرتبط را تولید کنید.",
    };
  }

  if (!trimmedInstruction) {
    return {
      success: false,
      error: "درخواست خود برای پیش‌نویس پاسخ را وارد کنید.",
    };
  }

  const sourceLetter = await prisma.letters.findUnique({
    where: { id: letterId },
    select: {
      id: true,
      title: true,
      internal_number: true,
      external_number: true,
      contents: true,
      create_date: true,
    },
  });

  if (!sourceLetter) {
    return {
      success: false,
      error: "نامه یافت نشد.",
    };
  }

  const sourceNumber = getLetterSummaryNumber(sourceLetter);
  const fallbackTitle = `پاسخ به ${sourceLetter.title || sourceNumber}`;
  const systemPrompt =
    readAiProviderString(
      ["AI_LETTER_DRAFT_SYSTEM_PROMPT"],
      ["LM_STUDIO_AI_LETTER_DRAFT_SYSTEM_PROMPT"]
    ) ||
    [
      "You draft Persian office correspondence responses.",
      "Use only the provided source letter, relation summary, and user instruction.",
      "Do not invent facts, dates, approvals, or commitments.",
      "Return only valid JSON with keys title and content.",
      "The content value must be clean HTML suitable for a rich text editor, using p, ul, ol, li, strong, and br tags only.",
      "Do not include hidden reasoning, chain-of-thought, markdown fences, or <think> blocks.",
    ].join(" ");
  const sourceContent = getPlainText(sourceLetter.contents);
  const userPrompt = [
    "Create a response-letter draft in Persian.",
    "The user instruction is the highest priority, but the draft must remain consistent with the summary and source letter.",
    "Return exactly this JSON shape:",
    '{"title":"short Persian title","content":"<p>draft body</p>"}',
    "",
    `Source letter: ${sourceNumber} (ID ${sourceLetter.id})`,
    `Source title: ${sourceLetter.title || "-"}`,
    `Source create date: ${formatPromptDate(sourceLetter.create_date)}`,
    "Source content excerpt:",
    truncatePromptText(
      sourceContent || "(No content registered.)",
      AI_DRAFT_SOURCE_CONTENT_CHAR_LIMIT
    ),
    "",
    "Generated relation-tree summary:",
    truncatePromptText(trimmedSummary, AI_DRAFT_SUMMARY_CHAR_LIMIT),
    "",
    "User instruction for the response draft:",
    truncatePromptText(trimmedInstruction, AI_DRAFT_USER_PROMPT_CHAR_LIMIT),
  ].join("\n");

  return {
    success: true,
    systemPrompt,
    userPrompt,
    fallbackTitle,
  };
}

export function parseLetterResponseDraft(
  aiText: string,
  fallbackTitle: string
): LetterResponseDraftResult {
  const parsedDraft = parseJsonObject(aiText);
  const title = getDraftField(parsedDraft, "title") || fallbackTitle;
  const content =
    getDraftField(parsedDraft, "content") ||
    getDraftField(parsedDraft, "html") ||
    aiText;

  return {
    success: true,
    title: title.slice(0, 300),
    content: sanitizeDraftHtml(content),
  };
}

export async function generateLetterResponseDraftWithAi(
  letterId: number,
  summary: string,
  userInstruction: string
): Promise<LetterResponseDraftResult> {
  const preparedDraft = await prepareLetterResponseDraft(
    letterId,
    summary,
    userInstruction
  );

  if (!preparedDraft.success) {
    return preparedDraft;
  }

  const aiResult = await requestAiChatCompletion(
    preparedDraft.systemPrompt,
    preparedDraft.userPrompt,
    {
      timeoutMs: readAiProviderNumber(
        ["AI_LETTER_DRAFT_TIMEOUT_MS"],
        ["LM_STUDIO_AI_LETTER_DRAFT_TIMEOUT_MS"],
        AI_DRAFT_TIMEOUT_MS
      ),
      retries: readAiProviderNumber(
        ["AI_LETTER_DRAFT_RETRIES"],
        ["LM_STUDIO_AI_LETTER_DRAFT_RETRIES"],
        0
      ),
      maxTokens: readAiProviderNumber(
        ["AI_LETTER_DRAFT_MAX_TOKENS"],
        ["LM_STUDIO_AI_LETTER_DRAFT_MAX_TOKENS"],
        AI_DRAFT_MAX_TOKENS
      ),
      temperature: readAiProviderNumber(
        ["AI_LETTER_DRAFT_TEMPERATURE"],
        ["LM_STUDIO_AI_LETTER_DRAFT_TEMPERATURE"],
        0.45
      ),
    }
  );

  if (!aiResult.success) {
    return {
      success: false,
      error: aiResult.error,
    };
  }

  return parseLetterResponseDraft(aiResult.text, preparedDraft.fallbackTitle);
}

export async function prepareLetterRelationSummary(
  letterId: number
): Promise<LetterRelationSummaryPreparationResult> {
  if (!Number.isInteger(letterId) || letterId <= 0) {
    return {
      success: false,
      error: "نامه معتبر نیست.",
    };
  }

  const tree = await collectRelatedLetterTree(letterId);
  const letterCount = tree.letters.length;
  const relatedLetterCount = Math.max(letterCount - 1, 0);
  const relationCount = tree.edges.length;

  if (!tree.letters.some((letter) => letter.id === letterId)) {
    return {
      success: false,
      error: "نامه یافت نشد.",
    };
  }

  if (relatedLetterCount === 0 || relationCount === 0) {
    return {
      success: true,
      staticSummary: "برای این نامه، نامه مرتبطی ثبت نشده است.",
      meta: {
        letterCount,
        relatedLetterCount,
        relationCount,
        truncated: tree.truncated,
      },
    };
  }

  const userPrompt = buildLetterRelationSummaryPrompt(letterId, tree);
  const systemPrompt =
    readAiProviderString(
      ["AI_LETTER_SUMMARY_SYSTEM_PROMPT"],
      ["LM_STUDIO_AI_LETTER_SUMMARY_SYSTEM_PROMPT"]
    ) ||
    [
      "You summarize Persian office correspondence and relationship trees.",
      "Answer directly in Persian.",
      "Do not include hidden reasoning, chain-of-thought, or <think> blocks.",
    ].join(" ");

  return {
    success: true,
    systemPrompt,
    userPrompt,
    meta: {
      letterCount,
      relatedLetterCount,
      relationCount,
      truncated: tree.truncated,
    },
  };
}
