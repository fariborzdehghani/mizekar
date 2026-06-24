"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { markLetterViewed } from "@/src/actions/notificationActions";
import {
  readAiProviderNumber,
  readAiProviderString,
  requestAiChatCompletion,
} from "@/src/ai/client";
import { getPlainText } from "@/src/lib/richText";

export type ArchiveFolderNode = {
  id: number;
  title: string;
  parent_id: number | null;
  sort_order: number;
  archivedLetterCount: number;
  children: ArchiveFolderNode[];
};

export type ArchiveItemType = "letter" | "form" | "meeting";

export type ArchivedItemListItem = {
  archiveItemId: number;
  folder_id: number;
  archivedAt: Date | null;
} & (
  | {
      type: "letter";
      letter: {
        id: number;
        title: string | null;
        internal_number: string | null;
        external_number: string | null;
        create_date: Date | null;
        contentSnippet: string;
      };
    }
  | {
      type: "form";
      form: {
        id: number;
        title: string;
        templateTitle: string;
        status: number;
        createDate: Date | null;
        submitDate: Date | null;
      };
    }
  | {
      type: "meeting";
      meeting: {
        id: number;
        title: string;
        locationType: number;
        locationTitle: string | null;
        meetingAt: Date;
        approvalStatus: number;
        descriptionSnippet: string;
      };
    }
);

export type ArchivedLetterListItem = Extract<
  ArchivedItemListItem,
  { type: "letter" }
>;

type ArchiveFolderPromptItem = {
  id: number;
  title: string;
  path: string;
};

export type LetterArchiveSuggestionResult =
  | {
      success: true;
      folderId: number;
      folderTitle: string;
      folderPath: string;
      reason: string;
      alreadyArchived?: boolean;
    }
  | {
      success: false;
      error: string;
    };

type SuccessfulLetterArchiveSuggestion = Extract<
  LetterArchiveSuggestionResult,
  { success: true }
>;

export type LetterOpenArchiveSuggestionResult =
  | ({ success: true; shouldSuggest: true } & Omit<
      SuccessfulLetterArchiveSuggestion,
      "success"
    >)
  | {
      success: true;
      shouldSuggest: false;
    }
  | {
      success: false;
      error: string;
    };

const AI_ARCHIVE_SUGGESTION_TIMEOUT_MS = 120_000;
const AI_ARCHIVE_SUGGESTION_MAX_TOKENS = 350;
const AI_ARCHIVE_LETTER_CONTENT_CHAR_LIMIT = 4000;

function revalidateArchiveViews() {
  revalidatePath("/");
  revalidatePath("/incoming-letters");
  revalidatePath("/outgoing-letters");
  revalidatePath("/archive");
  revalidatePath("/meetings");
  revalidatePath("/letter");
}

function normalizeFolderTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 200);
}

function truncatePromptText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
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

function getStringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function buildFolderPromptItems(
  folders: Array<{
    id: number;
    title: string;
    parent_id: number | null;
    sort_order: number;
  }>
) {
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const pathCache = new Map<number, string>();

  const getPath = (folderId: number, seen = new Set<number>()): string => {
    const cachedPath = pathCache.get(folderId);
    if (cachedPath) return cachedPath;

    const folder = folderMap.get(folderId);
    if (!folder) return "";

    if (seen.has(folderId) || !folder.parent_id) {
      pathCache.set(folderId, folder.title);
      return folder.title;
    }

    seen.add(folderId);
    const parentPath = getPath(folder.parent_id, seen);
    const path = parentPath ? `${parentPath} / ${folder.title}` : folder.title;
    pathCache.set(folderId, path);
    return path;
  };

  return folders
    .map((folder) => ({
      id: folder.id,
      title: folder.title,
      path: getPath(folder.id),
    }))
    .sort((first, second) => first.path.localeCompare(second.path));
}

function parseArchiveSuggestion(
  aiText: string,
  folders: ArchiveFolderPromptItem[]
) {
  const parsed = parseJsonObject(aiText);
  if (!parsed || typeof parsed !== "object") return null;

  const data = parsed as Record<string, unknown>;
  const folderId = Number(data.folderId);
  if (!Number.isInteger(folderId)) return null;

  const folder = folders.find((item) => item.id === folderId);
  if (!folder) return null;

  return {
    folder,
    reason: getStringField(data.reason, "پیشنهاد هوش مصنوعی برای این نامه."),
  };
}

function buildArchiveSuggestionPrompt(input: {
  letter: {
    id: number;
    title: string | null;
    contents: string | null;
    internal_number: string | null;
    external_number: string | null;
  };
  folders: ArchiveFolderPromptItem[];
}) {
  const number =
    input.letter.internal_number || input.letter.external_number || `#${input.letter.id}`;

  return [
    "برای این نامه اداری، مناسب‌ترین پوشه بایگانی را از فهرست پوشه‌های مجاز انتخاب کن.",
    "فقط از folderId های موجود در ورودی استفاده کن. حتی اگر پوشه دقیقا مناسب نبود، نزدیک‌ترین پوشه موجود را انتخاب کن و هرگز پوشه جدید پیشنهاد نده.",
    "پاسخ فقط JSON معتبر باشد، بدون markdown و بدون توضیح اضافه.",
    'ساختار دقیق پاسخ: {"folderId":123,"reason":"دلیل کوتاه فارسی"}',
    "",
    "نامه:",
    JSON.stringify(
      {
        number,
        title: input.letter.title || "",
        content: truncatePromptText(
          getPlainText(input.letter.contents) || "(متنی ثبت نشده است)",
          AI_ARCHIVE_LETTER_CONTENT_CHAR_LIMIT
        ),
      },
      null,
      2
    ),
    "",
    "پوشه‌های مجاز:",
    JSON.stringify(input.folders, null, 2),
  ].join("\n");
}

function getPlainTextSnippet(value: string | null | undefined) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function buildFolderTree(
  folders: Array<{
    id: number;
    title: string;
    parent_id: number | null;
    sort_order: number;
  }>,
  itemCounts: Map<number, number>
) {
  const nodeMap = new Map<number, ArchiveFolderNode>();
  const roots: ArchiveFolderNode[] = [];

  for (const folder of folders) {
    nodeMap.set(folder.id, {
      id: folder.id,
      title: folder.title,
      parent_id: folder.parent_id,
      sort_order: folder.sort_order,
      archivedLetterCount: itemCounts.get(folder.id) || 0,
      children: [],
    });
  }

  for (const folder of folders) {
    const node = nodeMap.get(folder.id);
    if (!node) continue;

    const parent = folder.parent_id ? nodeMap.get(folder.parent_id) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: ArchiveFolderNode[]) => {
    nodes.sort(
      (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)
    );
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);

  return roots;
}

async function getOwnFolder(userId: number, folderId: number) {
  return prisma.letter_archive_folders.findFirst({
    where: {
      id: folderId,
      user_id: userId,
    },
    select: {
      id: true,
      title: true,
    },
  });
}

async function userCanArchiveLetter(userId: number, letterId: number) {
  const letter = await prisma.letters.findFirst({
    where: {
      id: letterId,
      OR: [
        { creator_id: userId },
        { sender_id: userId },
        {
          letter_recipients: {
            some: {
              user_id: userId,
            },
          },
        },
        {
          letter_referrals: {
            some: {
              OR: [{ sender_id: userId }, { receiver_id: userId }],
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(letter);
}

async function userCanArchiveForm(userId: number, formId: number) {
  const form = await prisma.form_instances.findFirst({
    where: {
      id: formId,
      OR: [
        { creator_id: userId },
        { form_instance_steps: { some: { approver_user_id: userId } } },
        {
          form_referrals: {
            some: {
              OR: [{ sender_id: userId }, { receiver_id: userId }],
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(form);
}

async function userCanArchiveMeeting(userId: number, meetingId: number) {
  const meeting = await prisma.meetings.findFirst({
    where: {
      id: meetingId,
      OR: [
        { creator_id: userId },
        { chair_user_id: userId },
        { secretary_user_id: userId },
        {
          meeting_attendees: {
            some: {
              user_id: userId,
            },
          },
        },
        {
          meeting_referrals: {
            some: {
              OR: [{ sender_id: userId }, { receiver_id: userId }],
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(meeting);
}

export async function getLetterArchiveFolders() {
  const currentUserId = await requireUserId();

  try {
    const [folders, letterCounts, formCounts, meetingCounts] = await Promise.all([
      prisma.letter_archive_folders.findMany({
        where: {
          user_id: currentUserId,
        },
        select: {
          id: true,
          title: true,
          parent_id: true,
          sort_order: true,
        },
        orderBy: [{ sort_order: "asc" }, { title: "asc" }],
      }),
      prisma.letter_archive_items.groupBy({
        by: ["folder_id"],
        where: {
          user_id: currentUserId,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.form_archive_items.groupBy({
        by: ["folder_id"],
        where: {
          user_id: currentUserId,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.$queryRaw<Array<{ folder_id: number; item_count: number }>>`
        SELECT [folder_id], COUNT(*) AS [item_count]
        FROM [dbo].[meeting_archive_items]
        WHERE [user_id] = ${currentUserId}
        GROUP BY [folder_id]
      `,
    ]);

    const itemCounts = new Map<number, number>();
    for (const count of letterCounts) {
      itemCounts.set(count.folder_id, count._count._all);
    }
    for (const count of formCounts) {
      itemCounts.set(
        count.folder_id,
        (itemCounts.get(count.folder_id) || 0) + count._count._all
      );
    }
    for (const count of meetingCounts) {
      itemCounts.set(
        count.folder_id,
        (itemCounts.get(count.folder_id) || 0) + Number(count.item_count)
      );
    }

    return {
      success: true,
      folders: buildFolderTree(folders, itemCounts),
    };
  } catch (error) {
    console.error("Error getting archive folders:", error);
    return {
      success: false,
      error: "خطا در دریافت پوشه‌های بایگانی",
      folders: [],
    };
  }
}

export async function createLetterArchiveFolder(input: {
  title: string;
  parentId?: number | null;
}) {
  const currentUserId = await requireUserId();
  const title = normalizeFolderTitle(input.title);
  const parentId =
    Number.isInteger(Number(input.parentId)) && Number(input.parentId) > 0
      ? Number(input.parentId)
      : null;

  if (!title) {
    return { success: false, error: "عنوان پوشه را وارد کنید" };
  }

  try {
    if (parentId) {
      const parent = await getOwnFolder(currentUserId, parentId);
      if (!parent) {
        return { success: false, error: "پوشه والد معتبر نیست" };
      }
    }

    const sortOrder = await prisma.letter_archive_folders.count({
      where: {
        user_id: currentUserId,
        parent_id: parentId,
      },
    });

    await prisma.letter_archive_folders.create({
      data: {
        user_id: currentUserId,
        parent_id: parentId,
        title,
        sort_order: sortOrder,
        create_date: new Date(),
        update_date: new Date(),
      },
    });

    revalidateArchiveViews();

    return { success: true };
  } catch (error) {
    console.error("Error creating archive folder:", error);
    return { success: false, error: "خطا در ایجاد پوشه بایگانی" };
  }
}

export async function renameLetterArchiveFolder(input: {
  folderId: number;
  title: string;
}) {
  const currentUserId = await requireUserId();
  const folderId = Number(input.folderId);
  const title = normalizeFolderTitle(input.title);

  if (!Number.isInteger(folderId) || folderId <= 0) {
    return { success: false, error: "پوشه معتبر نیست" };
  }

  if (!title) {
    return { success: false, error: "عنوان پوشه را وارد کنید" };
  }

  try {
    const folder = await getOwnFolder(currentUserId, folderId);
    if (!folder) {
      return { success: false, error: "پوشه یافت نشد" };
    }

    await prisma.letter_archive_folders.update({
      where: {
        id: folderId,
      },
      data: {
        title,
        update_date: new Date(),
      },
    });

    revalidateArchiveViews();

    return { success: true };
  } catch (error) {
    console.error("Error renaming archive folder:", error);
    return { success: false, error: "خطا در تغییر نام پوشه" };
  }
}

export async function deleteLetterArchiveFolder(folderIdInput: number) {
  const currentUserId = await requireUserId();
  const folderId = Number(folderIdInput);

  if (!Number.isInteger(folderId) || folderId <= 0) {
    return { success: false, error: "پوشه معتبر نیست" };
  }

  try {
    const folder = await getOwnFolder(currentUserId, folderId);
    if (!folder) {
      return { success: false, error: "پوشه یافت نشد" };
    }

    const [childCount, letterItemCount, formItemCount, meetingItemCounts] = await prisma.$transaction([
      prisma.letter_archive_folders.count({
        where: {
          user_id: currentUserId,
          parent_id: folderId,
        },
      }),
      prisma.letter_archive_items.count({
        where: {
          user_id: currentUserId,
          folder_id: folderId,
        },
      }),
      prisma.form_archive_items.count({
        where: {
          user_id: currentUserId,
          folder_id: folderId,
        },
      }),
      prisma.$queryRaw<Array<{ item_count: number }>>`
        SELECT COUNT(*) AS [item_count]
        FROM [dbo].[meeting_archive_items]
        WHERE [user_id] = ${currentUserId}
          AND [folder_id] = ${folderId}
      `,
    ]);
    const meetingItemCount = Number(meetingItemCounts[0]?.item_count || 0);

    if (
      childCount > 0 ||
      letterItemCount > 0 ||
      formItemCount > 0 ||
      meetingItemCount > 0
    ) {
      return {
        success: false,
        error: "برای حذف پوشه، ابتدا زیرپوشه‌ها و موارد داخل آن را جابه‌جا یا حذف کنید",
      };
    }

    await prisma.letter_archive_folders.delete({
      where: {
        id: folderId,
      },
    });

    revalidateArchiveViews();

    return { success: true };
  } catch (error) {
    console.error("Error deleting archive folder:", error);
    return { success: false, error: "خطا در حذف پوشه" };
  }
}

export async function archiveLetterInFolder(input: {
  letterId: number;
  folderId: number;
}) {
  const currentUserId = await requireUserId();
  const letterId = Number(input.letterId);
  const folderId = Number(input.folderId);

  if (!Number.isInteger(letterId) || letterId <= 0) {
    return { success: false, error: "نامه معتبر نیست" };
  }

  if (!Number.isInteger(folderId) || folderId <= 0) {
    return { success: false, error: "پوشه معتبر نیست" };
  }

  try {
    const [folder, canArchive] = await Promise.all([
      getOwnFolder(currentUserId, folderId),
      userCanArchiveLetter(currentUserId, letterId),
    ]);

    if (!folder) {
      return { success: false, error: "پوشه یافت نشد" };
    }

    if (!canArchive) {
      return { success: false, error: "دسترسی به این نامه برای بایگانی ندارید" };
    }

    const now = new Date();
    await prisma.letter_archive_items.upsert({
      where: {
        user_id_letter_id: {
          user_id: currentUserId,
          letter_id: letterId,
        },
      },
      update: {
        folder_id: folderId,
        update_date: now,
      },
      create: {
        user_id: currentUserId,
        folder_id: folderId,
        letter_id: letterId,
        create_date: now,
        update_date: now,
      },
    });

    revalidateArchiveViews();

    return { success: true, message: "نامه بایگانی شد" };
  } catch (error) {
    console.error("Error archiving letter:", error);
    return { success: false, error: "خطا در بایگانی نامه" };
  }
}

export async function suggestLetterArchiveFolder(
  letterIdInput: number
): Promise<LetterArchiveSuggestionResult> {
  const currentUserId = await requireUserId();
  const letterId = Number(letterIdInput);

  if (!Number.isInteger(letterId) || letterId <= 0) {
    return { success: false, error: "نامه معتبر نیست" };
  }

  try {
    const [letter, folders, existingArchiveItem, canArchive] = await Promise.all([
      prisma.letters.findFirst({
        where: { id: letterId },
        select: {
          id: true,
          title: true,
          contents: true,
          internal_number: true,
          external_number: true,
        },
      }),
      prisma.letter_archive_folders.findMany({
        where: { user_id: currentUserId },
        select: {
          id: true,
          title: true,
          parent_id: true,
          sort_order: true,
        },
        orderBy: [{ sort_order: "asc" }, { title: "asc" }],
      }),
      prisma.letter_archive_items.findFirst({
        where: {
          user_id: currentUserId,
          letter_id: letterId,
        },
        include: {
          folder: {
            select: {
              id: true,
              title: true,
              parent_id: true,
              sort_order: true,
            },
          },
        },
      }),
      userCanArchiveLetter(currentUserId, letterId),
    ]);

    if (!letter) {
      return { success: false, error: "نامه یافت نشد" };
    }

    if (!canArchive) {
      return {
        success: false,
        error: "دسترسی به این نامه برای بایگانی ندارید",
      };
    }

    if (folders.length === 0) {
      return {
        success: false,
        error: "پوشه موجودی برای پیشنهاد بایگانی وجود ندارد.",
      };
    }

    const promptFolders = buildFolderPromptItems(folders);

    if (existingArchiveItem?.folder) {
      const existingFolder = promptFolders.find(
        (folder) => folder.id === existingArchiveItem.folder_id
      );

      if (existingFolder) {
        return {
          success: true,
          folderId: existingFolder.id,
          folderTitle: existingFolder.title,
          folderPath: existingFolder.path,
          reason: "این نامه قبلا در این پوشه بایگانی شده است.",
          alreadyArchived: true,
        };
      }
    }

    const systemPrompt =
      readAiProviderString(
        ["AI_ARCHIVE_SUGGESTION_SYSTEM_PROMPT"],
        ["LM_STUDIO_AI_ARCHIVE_SUGGESTION_SYSTEM_PROMPT"]
      ) ||
      [
        "تو دستیار بایگانی نامه‌های اداری فارسی هستی.",
        "باید فقط از پوشه‌های موجود یکی را انتخاب کنی و اجازه پیشنهاد یا ایجاد پوشه جدید نداری.",
        "پاسخ فقط JSON معتبر با folderId و reason باشد.",
        "reason کوتاه و فارسی باشد.",
        "هیچ reasoning مخفی، markdown fence یا متن اضافه ننویس.",
      ].join(" ");

    const aiResult = await requestAiChatCompletion(
      systemPrompt,
      buildArchiveSuggestionPrompt({ letter, folders: promptFolders }),
      {
        timeoutMs: readAiProviderNumber(
          ["AI_ARCHIVE_SUGGESTION_TIMEOUT_MS"],
          ["LM_STUDIO_AI_ARCHIVE_SUGGESTION_TIMEOUT_MS"],
          AI_ARCHIVE_SUGGESTION_TIMEOUT_MS
        ),
        retries: readAiProviderNumber(
          ["AI_ARCHIVE_SUGGESTION_RETRIES"],
          ["LM_STUDIO_AI_ARCHIVE_SUGGESTION_RETRIES"],
          0
        ),
        maxTokens: readAiProviderNumber(
          ["AI_ARCHIVE_SUGGESTION_MAX_TOKENS"],
          ["LM_STUDIO_AI_ARCHIVE_SUGGESTION_MAX_TOKENS"],
          AI_ARCHIVE_SUGGESTION_MAX_TOKENS
        ),
        temperature: readAiProviderNumber(
          ["AI_ARCHIVE_SUGGESTION_TEMPERATURE"],
          ["LM_STUDIO_AI_ARCHIVE_SUGGESTION_TEMPERATURE"],
          0.15
        ),
      }
    );

    if (!aiResult.success) {
      return { success: false, error: aiResult.error };
    }

    const parsedSuggestion = parseArchiveSuggestion(aiResult.text, promptFolders);
    if (!parsedSuggestion) {
      return {
        success: false,
        error: "پاسخ هوش مصنوعی شامل پوشه معتبر برای بایگانی نبود.",
      };
    }

    return {
      success: true,
      folderId: parsedSuggestion.folder.id,
      folderTitle: parsedSuggestion.folder.title,
      folderPath: parsedSuggestion.folder.path,
      reason: parsedSuggestion.reason,
    };
  } catch (error) {
    console.error("Error suggesting archive folder:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "خطا در پیشنهاد پوشه بایگانی با هوش مصنوعی",
    };
  }
}

export async function suggestArchiveForUnreadLetterOpen(
  letterIdInput: number
): Promise<LetterOpenArchiveSuggestionResult> {
  const viewResult = await markLetterViewed(letterIdInput);

  if (!viewResult.success) {
    return {
      success: false,
      error: viewResult.error || "خطا در ثبت مشاهده نامه",
    };
  }

  if (!viewResult.wasUnread) {
    return { success: true, shouldSuggest: false };
  }

  const suggestionResult = await suggestLetterArchiveFolder(letterIdInput);

  if (!suggestionResult.success) {
    return { success: false, error: suggestionResult.error };
  }

  if (suggestionResult.alreadyArchived) {
    return { success: true, shouldSuggest: false };
  }

  return {
    ...suggestionResult,
    shouldSuggest: true,
  };
}

export async function archiveFormInFolder(input: {
  formId: number;
  folderId: number;
}) {
  const currentUserId = await requireUserId();
  const formId = Number(input.formId);
  const folderId = Number(input.folderId);

  if (!Number.isInteger(formId) || formId <= 0) {
    return { success: false, error: "فرم معتبر نیست" };
  }

  if (!Number.isInteger(folderId) || folderId <= 0) {
    return { success: false, error: "پوشه معتبر نیست" };
  }

  try {
    const [folder, canArchive] = await Promise.all([
      getOwnFolder(currentUserId, folderId),
      userCanArchiveForm(currentUserId, formId),
    ]);

    if (!folder) {
      return { success: false, error: "پوشه یافت نشد" };
    }

    if (!canArchive) {
      return {
        success: false,
        error: "دسترسی به این فرم برای بایگانی ندارید",
      };
    }

    const now = new Date();
    await prisma.form_archive_items.upsert({
      where: {
        user_id_form_instance_id: {
          user_id: currentUserId,
          form_instance_id: formId,
        },
      },
      update: {
        folder_id: folderId,
        update_date: now,
      },
      create: {
        user_id: currentUserId,
        folder_id: folderId,
        form_instance_id: formId,
        create_date: now,
        update_date: now,
      },
    });

    revalidateArchiveViews();

    return { success: true, message: "فرم بایگانی شد" };
  } catch (error) {
    console.error("Error archiving form:", error);
    return { success: false, error: "خطا در بایگانی فرم" };
  }
}

export async function archiveMeetingInFolder(input: {
  meetingId: number;
  folderId: number;
}) {
  const currentUserId = await requireUserId();
  const meetingId = Number(input.meetingId);
  const folderId = Number(input.folderId);

  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    return { success: false, error: "جلسه معتبر نیست" };
  }

  if (!Number.isInteger(folderId) || folderId <= 0) {
    return { success: false, error: "پوشه معتبر نیست" };
  }

  try {
    const [folder, canArchive] = await Promise.all([
      getOwnFolder(currentUserId, folderId),
      userCanArchiveMeeting(currentUserId, meetingId),
    ]);

    if (!folder) {
      return { success: false, error: "پوشه یافت نشد" };
    }

    if (!canArchive) {
      return {
        success: false,
        error: "دسترسی به این جلسه برای بایگانی ندارید",
      };
    }

    const now = new Date();
    await prisma.$executeRaw`
      MERGE [dbo].[meeting_archive_items] WITH (HOLDLOCK) AS [target]
      USING (
        SELECT
          ${currentUserId} AS [user_id],
          ${meetingId} AS [meeting_id]
      ) AS [source]
      ON [target].[user_id] = [source].[user_id]
        AND [target].[meeting_id] = [source].[meeting_id]
      WHEN MATCHED THEN
        UPDATE SET
          [folder_id] = ${folderId},
          [update_date] = ${now}
      WHEN NOT MATCHED THEN
        INSERT ([user_id], [folder_id], [meeting_id], [create_date], [update_date])
        VALUES (${currentUserId}, ${folderId}, ${meetingId}, ${now}, ${now});
    `;

    revalidateArchiveViews();

    return { success: true, message: "جلسه بایگانی شد" };
  } catch (error) {
    console.error("Error archiving meeting:", error);
    return { success: false, error: "خطا در بایگانی جلسه" };
  }
}

export async function archiveItemInFolder(input: {
  itemType: ArchiveItemType;
  itemId: number;
  folderId: number;
}) {
  if (input.itemType === "meeting") {
    return archiveMeetingInFolder({
      meetingId: input.itemId,
      folderId: input.folderId,
    });
  }

  if (input.itemType === "form") {
    return archiveFormInFolder({
      formId: input.itemId,
      folderId: input.folderId,
    });
  }

  return archiveLetterInFolder({
    letterId: input.itemId,
    folderId: input.folderId,
  });
}

export async function removeLetterFromArchive(archiveItemIdInput: number) {
  const currentUserId = await requireUserId();
  const archiveItemId = Number(archiveItemIdInput);

  if (!Number.isInteger(archiveItemId) || archiveItemId <= 0) {
    return { success: false, error: "رکورد بایگانی معتبر نیست" };
  }

  try {
    const item = await prisma.letter_archive_items.findFirst({
      where: {
        id: archiveItemId,
        user_id: currentUserId,
      },
      select: {
        id: true,
      },
    });

    if (!item) {
      return { success: false, error: "نامه بایگانی شده یافت نشد" };
    }

    await prisma.letter_archive_items.delete({
      where: {
        id: archiveItemId,
      },
    });

    revalidateArchiveViews();

    return { success: true };
  } catch (error) {
    console.error("Error removing archived letter:", error);
    return { success: false, error: "خطا در حذف نامه از بایگانی" };
  }
}

export async function removeFormFromArchive(archiveItemIdInput: number) {
  const currentUserId = await requireUserId();
  const archiveItemId = Number(archiveItemIdInput);

  if (!Number.isInteger(archiveItemId) || archiveItemId <= 0) {
    return { success: false, error: "رکورد بایگانی معتبر نیست" };
  }

  try {
    const item = await prisma.form_archive_items.findFirst({
      where: {
        id: archiveItemId,
        user_id: currentUserId,
      },
      select: {
        id: true,
      },
    });

    if (!item) {
      return { success: false, error: "فرم بایگانی شده یافت نشد" };
    }

    await prisma.form_archive_items.delete({
      where: {
        id: archiveItemId,
      },
    });

    revalidateArchiveViews();

    return { success: true };
  } catch (error) {
    console.error("Error removing archived form:", error);
    return { success: false, error: "خطا در حذف فرم از بایگانی" };
  }
}

export async function removeMeetingFromArchive(archiveItemIdInput: number) {
  const currentUserId = await requireUserId();
  const archiveItemId = Number(archiveItemIdInput);

  if (!Number.isInteger(archiveItemId) || archiveItemId <= 0) {
    return { success: false, error: "رکورد بایگانی معتبر نیست" };
  }

  try {
    const deletedCount = await prisma.$executeRaw`
      DELETE FROM [dbo].[meeting_archive_items]
      WHERE [id] = ${archiveItemId}
        AND [user_id] = ${currentUserId}
    `;

    if (deletedCount === 0) {
      return { success: false, error: "جلسه بایگانی شده یافت نشد" };
    }

    revalidateArchiveViews();

    return { success: true };
  } catch (error) {
    console.error("Error removing archived meeting:", error);
    return { success: false, error: "خطا در حذف جلسه از بایگانی" };
  }
}

export async function removeItemFromArchive(input: {
  itemType: ArchiveItemType;
  archiveItemId: number;
}) {
  if (input.itemType === "meeting") {
    return removeMeetingFromArchive(input.archiveItemId);
  }

  if (input.itemType === "form") {
    return removeFormFromArchive(input.archiveItemId);
  }

  return removeLetterFromArchive(input.archiveItemId);
}

export async function getArchivedLetters(folderIdInput?: number | null) {
  const currentUserId = await requireUserId();
  const folderId = Number(folderIdInput);

  if (!Number.isInteger(folderId) || folderId <= 0) {
    return {
      success: true,
      selectedFolder: null,
      letters: [] as ArchivedLetterListItem[],
    };
  }

  try {
    const selectedFolder = await getOwnFolder(currentUserId, folderId);
    if (!selectedFolder) {
      return {
        success: false,
        error: "پوشه یافت نشد",
        selectedFolder: null,
        letters: [] as ArchivedLetterListItem[],
      };
    }

    const items = await prisma.letter_archive_items.findMany({
      where: {
        user_id: currentUserId,
        folder_id: folderId,
      },
      include: {
        letter: {
          select: {
            id: true,
            title: true,
            internal_number: true,
            external_number: true,
            contents: true,
            create_date: true,
          },
        },
      },
      orderBy: [{ update_date: "desc" }, { create_date: "desc" }],
      take: 100,
    });

    return {
      success: true,
      selectedFolder,
      letters: items.map((item) => ({
        archiveItemId: item.id,
        folder_id: item.folder_id,
        archivedAt: item.update_date || item.create_date,
        letter: {
          id: item.letter.id,
          title: item.letter.title,
          internal_number: item.letter.internal_number,
          external_number: item.letter.external_number,
          create_date: item.letter.create_date,
          contentSnippet: getPlainTextSnippet(item.letter.contents),
        },
      })),
    };
  } catch (error) {
    console.error("Error getting archived letters:", error);
    return {
      success: false,
      error: "خطا در دریافت نامه‌های بایگانی",
      selectedFolder: null,
      letters: [] as ArchivedLetterListItem[],
    };
  }
}

export async function getArchivedItems(folderIdInput?: number | null) {
  const currentUserId = await requireUserId();
  const folderId = Number(folderIdInput);

  if (!Number.isInteger(folderId) || folderId <= 0) {
    return {
      success: true,
      selectedFolder: null,
      items: [] as ArchivedItemListItem[],
    };
  }

  try {
    const selectedFolder = await getOwnFolder(currentUserId, folderId);
    if (!selectedFolder) {
      return {
        success: false,
        error: "پوشه یافت نشد",
        selectedFolder: null,
        items: [] as ArchivedItemListItem[],
      };
    }

    const [letterItems, formItems, meetingItems] = await Promise.all([
      prisma.letter_archive_items.findMany({
        where: {
          user_id: currentUserId,
          folder_id: folderId,
        },
        include: {
          letter: {
            select: {
              id: true,
              title: true,
              internal_number: true,
              external_number: true,
              contents: true,
              create_date: true,
            },
          },
        },
        orderBy: [{ update_date: "desc" }, { create_date: "desc" }],
        take: 100,
      }),
      prisma.form_archive_items.findMany({
        where: {
          user_id: currentUserId,
          folder_id: folderId,
        },
        include: {
          form_instance: {
            include: {
              form_templates: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: [{ update_date: "desc" }, { create_date: "desc" }],
        take: 100,
      }),
      prisma.$queryRaw<
        Array<{
          archiveItemId: number;
          folder_id: number;
          archivedAt: Date | null;
          meetingId: number;
          title: string;
          description: string | null;
          location_type: number;
          location_title: string | null;
          meeting_at: Date;
          approval_status: number;
        }>
      >`
        SELECT TOP (100)
          [mai].[id] AS [archiveItemId],
          [mai].[folder_id],
          COALESCE([mai].[update_date], [mai].[create_date]) AS [archivedAt],
          [m].[id] AS [meetingId],
          [m].[title],
          [m].[description],
          [m].[location_type],
          [m].[location_title],
          [m].[meeting_at],
          [m].[approval_status]
        FROM [dbo].[meeting_archive_items] AS [mai]
        INNER JOIN [dbo].[meetings] AS [m]
          ON [m].[id] = [mai].[meeting_id]
        WHERE [mai].[user_id] = ${currentUserId}
          AND [mai].[folder_id] = ${folderId}
        ORDER BY [mai].[update_date] DESC, [mai].[create_date] DESC
      `,
    ]);

    const items: ArchivedItemListItem[] = [
      ...letterItems.map((item) => ({
        type: "letter" as const,
        archiveItemId: item.id,
        folder_id: item.folder_id,
        archivedAt: item.update_date || item.create_date,
        letter: {
          id: item.letter.id,
          title: item.letter.title,
          internal_number: item.letter.internal_number,
          external_number: item.letter.external_number,
          create_date: item.letter.create_date,
          contentSnippet: getPlainTextSnippet(item.letter.contents),
        },
      })),
      ...formItems.map((item) => ({
        type: "form" as const,
        archiveItemId: item.id,
        folder_id: item.folder_id,
        archivedAt: item.update_date || item.create_date,
        form: {
          id: item.form_instance.id,
          title: item.form_instance.title,
          templateTitle: item.form_instance.form_templates.title,
          status: item.form_instance.status,
          createDate: item.form_instance.create_date,
          submitDate: item.form_instance.submit_date,
        },
      })),
      ...meetingItems.map((item) => ({
        type: "meeting" as const,
        archiveItemId: item.archiveItemId,
        folder_id: item.folder_id,
        archivedAt: item.archivedAt,
        meeting: {
          id: item.meetingId,
          title: item.title,
          locationType: item.location_type,
          locationTitle: item.location_title,
          meetingAt: item.meeting_at,
          approvalStatus: item.approval_status,
          descriptionSnippet: getPlainTextSnippet(item.description),
        },
      })),
    ].sort(
      (firstItem, secondItem) =>
        (secondItem.archivedAt?.getTime() || 0) -
        (firstItem.archivedAt?.getTime() || 0)
    );

    return {
      success: true,
      selectedFolder,
      items: items.slice(0, 100),
    };
  } catch (error) {
    console.error("Error getting archived items:", error);
    return {
      success: false,
      error: "خطا در دریافت موارد بایگانی",
      selectedFolder: null,
      items: [] as ArchivedItemListItem[],
    };
  }
}
