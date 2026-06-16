"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser, requireUserId } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import {
  generateLetterResponseDraftWithAi,
  summarizeRelatedLetterTreeWithAi,
  type LetterResponseDraftResult,
  type LetterRelationSummaryResult,
} from "@/src/ai/features/letterRelationSummary";
import {
  getPlainTextSnippet,
  hasRichTextContent,
} from "@/src/lib/richText";

interface PersonRecipient {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
}

interface RelatedLetterInput {
  id: number;
}

interface ReferralReceiverInput {
  user_id: number | null;
}

const REFERRAL_STATUS_IN_PROGRESS = 0;
const REFERRAL_STATUS_DONE = 1;
const DEFAULT_INTERNAL_LETTER_TEMPLATE = "{سال}/ص/{شماره}";

function toLatinDigits(value: string) {
  const digitMap: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };

  return value.replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit]);
}

function getCurrentShamsiYear() {
  const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "year")?.value;

  return toLatinDigits(year || "");
}

function replaceTemplateToken(template: string, token: string, value: string) {
  return template
    .replaceAll(`{${token}}`, value)
    .replaceAll(`}${token}{`, value);
}

async function buildInternalLetterNumber(letterId: number) {
  const templateSetting = await prisma.general_settings.findFirst({
    where: { code: "internal_letter_number" },
    select: { value: true },
  });
  const template =
    templateSetting?.value?.trim() || DEFAULT_INTERNAL_LETTER_TEMPLATE;

  return replaceTemplateToken(
    replaceTemplateToken(template, "سال", getCurrentShamsiYear()),
    "شماره",
    String(letterId)
  );
}

export async function createLetter(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const recipientsJson = formData.get("recipients") as string;
    const relatedLettersJson = formData.get("relatedLetters") as string | null;

    // Validate required fields
    if (!title || !content || !recipientsJson) {
      return {
        success: false,
        error: "تمام فیلدها اجباری هستند",
      };
    }

    // Parse recipients
    let recipients: PersonRecipient[] = [];
    try {
      recipients = JSON.parse(recipientsJson);
    } catch {
      return {
        success: false,
        error: "داده های گیرندگان نامعتبر است",
      };
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error: "لطفاً حداقل یک گیرنده انتخاب کنید",
      };
    }

    const recipientUserIds = recipients.map((recipient) => {
      const userId = Number(recipient.user_id);
      return Number.isInteger(userId) && userId > 0 ? userId : null;
    });

    if (recipientUserIds.some((userId) => userId === null)) {
      return {
        success: false,
        error: "Ú¯ÛŒØ±Ù†Ø¯Ù‡ Ø§Ø±Ø¬Ø§Ø¹ Ø¨Ø§ÛŒØ¯ Ú©Ø§Ø±Ø¨Ø± Ø³ÛŒØ³ØªÙ… Ø¨Ø§Ø´Ø¯",
      };
    }

    const validRecipientUserIds = recipientUserIds.filter(
      (userId): userId is number => userId !== null
    );
    const uniqueRecipientUserIds = [...new Set(validRecipientUserIds)];
    const existingRecipientUsers = await prisma.users.findMany({
      where: {
        id: {
          in: uniqueRecipientUserIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingRecipientUsers.length !== uniqueRecipientUserIds.length) {
      return {
        success: false,
        error: "Ø¯Ø§Ø¯Ù‡ Ù‡Ø§ÛŒ Ú¯ÛŒØ±Ù†Ø¯Ú¯Ø§Ù† Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª",
      };
    }

    let relatedLetterIds: number[] = [];
    if (relatedLettersJson) {
      try {
        const relatedLetters = JSON.parse(
          relatedLettersJson
        ) as RelatedLetterInput[];
        relatedLetterIds = [
          ...new Set(
            relatedLetters
              .map((letter) => Number(letter.id))
              .filter((id) => Number.isInteger(id) && id > 0)
          ),
        ];
      } catch {
        return {
          success: false,
          error: "Ø¯Ø§Ø¯Ù‡ Ù‡Ø§ÛŒ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø±ØªØ¨Ø· Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª",
        };
      }
    }

    // Get all files from FormData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "files" && value instanceof File && value.size > 0) {
        files.push(value);
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch {
      console.log("Uploads directory already exists");
    }

    // Handle file uploads and get file IDs
    const fileIds: number[] = [];
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Create unique filename with timestamp and random suffix
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const filename = `${timestamp}_${randomSuffix}`;

        // Save file to public/uploads
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, bytes);

        // Store file metadata in database
        const dbFile = await prisma.files.create({
          data: {
            file_name: filename,
            file_title: file.name,
            create_date: new Date(),
            creator_id: currentUserId,
          },
        });

        fileIds.push(dbFile.id);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        // Continue with other files
      }
    }

    // Create the letter first so its id can be used in the internal number.
    const letter = await prisma.letters.create({
      data: {
        title,
        contents: content,
        creator_id: currentUserId,
        create_date: new Date(),
        source_type: 1, // Default source type
        classification: 1, // Default classification
      },
    });

    const internalNumber = await buildInternalLetterNumber(letter.id);
    await prisma.letters.update({
      where: { id: letter.id },
      data: { internal_number: internalNumber },
    });

    // Create letter attachments for all files
    for (const fileId of fileIds) {
      await prisma.letter_attachments.create({
        data: {
          letter_id: letter.id,
          file_id: fileId,
        },
      });
    }

    // Create letter recipients entries
    // Store the actual user_id from the persons table
    for (const userId of validRecipientUserIds) {
      await prisma.letter_recipients.create({
        data: {
          letter_id: letter.id,
          user_id: userId,
        },
      });
    }

    const now = new Date();
    await prisma.letter_referrals.createMany({
      data: validRecipientUserIds.map((receiverId) => ({
        letter_id: letter.id,
        sender_id: currentUserId,
        receiver_id: receiverId,
        date_time: now,
        contents: "",
        due_date: null,
        status: REFERRAL_STATUS_IN_PROGRESS,
      })),
    });

    for (const relatedLetterId of relatedLetterIds) {
      if (relatedLetterId === letter.id) continue;

      await prisma.letter_related_letters.create({
        data: {
          main_letter_id: letter.id,
          related_letter_id: relatedLetterId,
        },
      });
    }
  } catch (error) {
    console.error("Error creating letter:", error);
    return {
      success: false,
      error: "خطا در ایجاد نامه. لطفاً دوباره تلاش کنید.",
    };
  }

  revalidatePath("/");
  revalidatePath("/incoming-letters");
  revalidatePath("/outgoing-letters");

  return {
    success: true,
    redirectTo: "/",
  };
}

export async function getLetterAttachments(letterId: number) {
  try {
    await requireUser();
    const attachments = await prisma.letter_attachments.findMany({
      where: { letter_id: letterId },
      include: { files: true },
    });

    return {
      success: true,
      attachments: attachments.map((att) => ({
        id: att.id,
        fileId: att.file_id,
        fileName: att.files?.file_title,
        fileSize: 0, // Size not available in metadata, would need to read from disk
      })),
    };
  } catch (error) {
    console.error("Error getting letter attachments:", error);
    return {
      success: false,
      error: "خطا در بارگیری پیوست‌ها",
      attachments: [],
    };
  }
}

export async function deleteLetterAttachment(attachmentId: number) {
  try {
    await requireUser();
    // Get the attachment to find the file
    const attachment = await prisma.letter_attachments.findUnique({
      where: { id: attachmentId },
      include: { files: true },
    });

    if (!attachment || !attachment.files) {
      return {
        success: false,
        error: "پیوست یافت نشد",
      };
    }

    // Delete from physical disk
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, attachment.files.file_name || "");

    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file from disk:", error);
      // Continue anyway - still try to remove from database
    }

    // Delete the attachment record
    await prisma.letter_attachments.delete({
      where: { id: attachmentId },
    });

    // Delete the file record if it has no other attachments
    const otherAttachments = await prisma.letter_attachments.findMany({
      where: { file_id: attachment.file_id },
    });

    if (otherAttachments.length === 0) {
      await prisma.files.delete({
        where: { id: attachment.file_id! },
      });
    }

    return {
      success: true,
      message: "پیوست با موفقیت حذف شد",
    };
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return {
      success: false,
      error: "خطا در حذف پیوست",
    };
  }
}

export async function searchPersons(query: string) {
  try {
    await requireUser();
    if (query.length < 1) {
      return {
        success: true,
        persons: [],
      };
    }

    const persons = await prisma.persons.findMany({
      where: {
        OR: [
          {
            first_name: {
              contains: query,
            },
          },
          {
            last_name: {
              contains: query,
            },
          },
          {
            job: {
              contains: query,
            },
          },
        ],
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        job: true,
        user_id: true,
      },
      take: 10,
      orderBy: {
        first_name: "asc",
      },
    });

    return {
      success: true,
      persons,
    };
  } catch (error) {
    console.error("Error searching persons:", error);
    return {
      success: false,
      error: "خطا در جستجوی افراد",
      persons: [],
    };
  }
}

function getUserDisplayName(
  user:
    | {
        id: number;
        user_id: string | null;
        persons_persons_user_idTousers?: Array<{
          first_name: string | null;
          last_name: string | null;
          job: string | null;
        }>;
      }
    | null
    | undefined
) {
  const person = user?.persons_persons_user_idTousers?.[0];
  const fullName = [person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const job = person?.job?.trim();

  if (fullName) {
    return job ? `${fullName} - ${job}` : fullName;
  }

  const fallbackName = user?.user_id || (user?.id ? `User #${user.id}` : "-");

  return job && fallbackName !== "-" ? `${fallbackName} - ${job}` : fallbackName;
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export async function searchLetters(query: string, excludeLetterId?: number) {
  try {
    await requireUser();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 1) {
      return {
        success: true,
        letters: [],
      };
    }

    const letters = await prisma.letters.findMany({
      where: {
        AND: [
          excludeLetterId
            ? {
                id: {
                  not: excludeLetterId,
                },
              }
            : {},
          {
            OR: [
              {
                internal_number: {
                  contains: trimmedQuery,
                },
              },
              {
                external_number: {
                  contains: trimmedQuery,
                },
              },
              {
                title: {
                  contains: trimmedQuery,
                },
              },
              {
                contents: {
                  contains: trimmedQuery,
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        internal_number: true,
        external_number: true,
        contents: true,
        create_date: true,
      },
      take: 10,
      orderBy: {
        create_date: "desc",
      },
    });

    return {
      success: true,
      letters: letters.map((letter) => ({
        id: letter.id,
        title: letter.title,
        internal_number: letter.internal_number,
        external_number: letter.external_number,
        contentSnippet: getPlainTextSnippet(letter.contents),
        create_date: letter.create_date,
      })),
    };
  } catch (error) {
    console.error("Error searching letters:", error);
    return {
      success: false,
      error: "Ø®Ø·Ø§ Ø¯Ø± Ø¬Ø³ØªØ¬ÙˆÛŒ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§",
      letters: [],
    };
  }
}

export type AdvancedLetterSearchInput = {
  title?: string;
  content?: string;
  createDate?: string;
};

export type AdvancedLetterSearchResult = {
  id: number;
  title: string | null;
  internal_number: string | null;
  external_number: string | null;
  create_date: Date | null;
  contentSnippet: string;
  latestReferralAt: Date | null;
  isIncoming: boolean;
  isOutgoing: boolean;
  archiveFolderTitle: string | null;
};

export async function searchAccessibleLetters(input: AdvancedLetterSearchInput) {
  const currentUserId = await requireUserId();
  const title = input.title?.trim() || "";
  const content = input.content?.trim() || "";
  const createDate = parseDateOnly(input.createDate);
  const hasSearchCriteria = Boolean(title || content || createDate);

  if (!hasSearchCriteria) {
    return {
      success: true,
      letters: [] as AdvancedLetterSearchResult[],
      hasSearchCriteria,
    };
  }

  try {
    const letters = await prisma.letters.findMany({
      where: {
        AND: [
          {
            letter_referrals: {
              some: {
                OR: [{ sender_id: currentUserId }, { receiver_id: currentUserId }],
              },
            },
          },
          ...(title ? [{ title: { contains: title } }] : []),
          ...(content ? [{ contents: { contains: content } }] : []),
          ...(createDate
            ? [
                {
                  create_date: {
                    gte: createDate,
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        title: true,
        internal_number: true,
        external_number: true,
        contents: true,
        create_date: true,
        letter_referrals: {
          where: {
            OR: [{ sender_id: currentUserId }, { receiver_id: currentUserId }],
          },
          select: {
            sender_id: true,
            receiver_id: true,
            date_time: true,
          },
          orderBy: {
            date_time: "desc",
          },
        },
        letter_archive_items: {
          where: {
            user_id: currentUserId,
          },
          select: {
            folder: {
              select: {
                title: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ create_date: "desc" }, { id: "desc" }],
      take: 200,
    });

    return {
      success: true,
      letters: letters.map((letter) => ({
        id: letter.id,
        title: letter.title,
        internal_number: letter.internal_number,
        external_number: letter.external_number,
        create_date: letter.create_date,
        contentSnippet: getPlainTextSnippet(letter.contents),
        latestReferralAt: letter.letter_referrals[0]?.date_time || null,
        isIncoming: letter.letter_referrals.some(
          (referral) => referral.receiver_id === currentUserId
        ),
        isOutgoing: letter.letter_referrals.some(
          (referral) => referral.sender_id === currentUserId
        ),
        archiveFolderTitle: letter.letter_archive_items[0]?.folder.title || null,
      })),
      hasSearchCriteria,
    };
  } catch (error) {
    console.error("Error searching accessible letters:", error);
    return {
      success: false,
      error: "خطا در جستجوی پیشرفته نامه‌ها",
      letters: [] as AdvancedLetterSearchResult[],
      hasSearchCriteria,
    };
  }
}

export async function createLetterReferral(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const letterId = Number(formData.get("letterId"));
    const content = formData.get("content") as string | null;
    const receiversJson = formData.get("receivers") as string | null;
    const dueDate = parseDateOnly(formData.get("dueDate") as string | null);

    if (!Number.isInteger(letterId) || letterId <= 0) {
      return {
        success: false,
        error: "نامه معتبر نیست",
      };
    }

    if (!hasRichTextContent(content)) {
      return {
        success: false,
        error: "متن ارجاع را وارد کنید",
      };
    }

    if (!receiversJson) {
      return {
        success: false,
        error: "حداقل یک گیرنده ارجاع انتخاب کنید",
      };
    }

    let receivers: ReferralReceiverInput[] = [];
    try {
      receivers = JSON.parse(receiversJson);
    } catch {
      return {
        success: false,
        error: "داده گیرندگان ارجاع نامعتبر است",
      };
    }

    const receiverIds = [
      ...new Set(
        receivers
          .map((receiver) => Number(receiver.user_id))
          .filter((id) => Number.isInteger(id) && id > 0)
      ),
    ];

    if (receiverIds.length === 0) {
      return {
        success: false,
        error: "گیرنده ارجاع باید کاربر سیستم باشد",
      };
    }

    const letter = await prisma.letters.findUnique({
      where: { id: letterId },
      select: { id: true },
    });

    if (!letter) {
      return {
        success: false,
        error: "نامه یافت نشد",
      };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.letter_referrals.updateMany({
        where: {
          letter_id: letterId,
          receiver_id: currentUserId,
          status: REFERRAL_STATUS_IN_PROGRESS,
        },
        data: {
          status: REFERRAL_STATUS_DONE,
        },
      }),
      prisma.letter_referrals.createMany({
        data: receiverIds.map((receiverId) => ({
          letter_id: letterId,
          sender_id: currentUserId,
          receiver_id: receiverId,
          date_time: now,
          contents: content || "",
          due_date: dueDate,
          status: REFERRAL_STATUS_IN_PROGRESS,
        })),
      }),
    ]);

    revalidatePath("/letter");
    revalidatePath("/");
    revalidatePath("/incoming-letters");
    revalidatePath("/outgoing-letters");

    return {
      success: true,
      createdCount: receiverIds.length,
      message: "ارجاع نامه ثبت شد",
    };
  } catch (error) {
    console.error("Error creating letter referral:", error);
    return {
      success: false,
      error: "خطا در ثبت ارجاع نامه",
    };
  }
}

function mapReferralListItem(referral: {
  id: number;
  letter_id: number | null;
  sender_id: number | null;
  receiver_id: number | null;
  date_time: Date | null;
  contents: string | null;
  due_date: Date | null;
  status: number | null;
  read_at: Date | null;
  letters: {
    id: number;
    title: string | null;
    internal_number: string | null;
    external_number: string | null;
    contents: string | null;
    create_date: Date | null;
  } | null;
  users_letter_referrals_sender_idTousers:
    | Parameters<typeof getUserDisplayName>[0]
    | null;
  users_letter_referrals_receiver_idTousers:
    | Parameters<typeof getUserDisplayName>[0]
    | null;
}) {
  return {
    id: referral.id,
    letter_id: referral.letter_id,
    sender_id: referral.sender_id,
    receiver_id: referral.receiver_id,
    date_time: referral.date_time,
    contents: referral.contents,
    due_date: referral.due_date,
    status: referral.status,
    read_at: referral.read_at,
    senderName: getUserDisplayName(
      referral.users_letter_referrals_sender_idTousers
    ),
    receiverName: getUserDisplayName(
      referral.users_letter_referrals_receiver_idTousers
    ),
    contentSnippet: getPlainTextSnippet(referral.contents),
    letter: referral.letters
      ? {
          id: referral.letters.id,
          title: referral.letters.title,
          internal_number: referral.letters.internal_number,
          external_number: referral.letters.external_number,
          create_date: referral.letters.create_date,
          contentSnippet: getPlainTextSnippet(referral.letters.contents),
        }
      : null,
  };
}

type ReferralListItem = ReturnType<typeof mapReferralListItem>;

function normalizeQuickSearchValue(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fa-IR");
}

function getReferralStatusLabel(status: number | null) {
  if (status === 1) return "انجام شده";
  if (status === 2) return "بایگانی شده";
  return "در جریان";
}

function formatReferralSearchDate(value: Date | string | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getReferralLetterNumber(referral: ReferralListItem) {
  const letter = referral.letter;

  if (!letter) return referral.letter_id ? `#${referral.letter_id}` : "";

  return letter.internal_number || letter.external_number || `#${letter.id}`;
}

function referralMatchesQuickSearch(
  referral: ReferralListItem,
  perspective: "incoming" | "outgoing",
  searchQuery: string
) {
  const query = normalizeQuickSearchValue(searchQuery.trim());
  if (!query) return true;

  const letter = referral.letter;
  const personName =
    perspective === "incoming" ? referral.senderName : referral.receiverName;
  const fields = [
    getReferralLetterNumber(referral),
    letter?.title,
    letter?.internal_number,
    letter?.external_number,
    letter?.contentSnippet,
    referral.contentSnippet,
    personName,
    getReferralStatusLabel(referral.status),
    formatReferralSearchDate(referral.date_time),
  ];

  return fields.some((field) =>
    normalizeQuickSearchValue(field).includes(query)
  );
}

export async function getIncomingLetterReferrals(searchQuery = "") {
  const currentUserId = await requireUserId();

  try {
    const referrals = await prisma.letter_referrals.findMany({
      where: {
        receiver_id: currentUserId,
        status: REFERRAL_STATUS_IN_PROGRESS,
        letters: {
          is: {
            letter_archive_items: {
              none: {
                user_id: currentUserId,
              },
            },
          },
        },
      },
      include: {
        letters: {
          select: {
            id: true,
            title: true,
            internal_number: true,
            external_number: true,
            contents: true,
            create_date: true,
          },
        },
        users_letter_referrals_sender_idTousers: {
          include: {
            persons_persons_user_idTousers: {
              select: {
                first_name: true,
                last_name: true,
                job: true,
              },
              take: 1,
            },
          },
        },
        users_letter_referrals_receiver_idTousers: {
          include: {
            persons_persons_user_idTousers: {
              select: {
                first_name: true,
                last_name: true,
                job: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        date_time: "desc",
      },
      take: 100,
    });

    const mappedReferrals = referrals.map(mapReferralListItem);

    return {
      success: true,
      referrals: mappedReferrals.filter((referral) =>
        referralMatchesQuickSearch(referral, "incoming", searchQuery)
      ),
    };
  } catch (error) {
    console.error("Error getting incoming letter referrals:", error);
    return {
      success: false,
      error: "خطا در دریافت نامه‌های ورودی",
      referrals: [],
    };
  }
}

export async function getOutgoingLetterReferrals(searchQuery = "") {
  const currentUserId = await requireUserId();

  try {
    const referrals = await prisma.letter_referrals.findMany({
      where: {
        sender_id: currentUserId,
        letters: {
          is: {
            letter_archive_items: {
              none: {
                user_id: currentUserId,
              },
            },
          },
        },
      },
      include: {
        letters: {
          select: {
            id: true,
            title: true,
            internal_number: true,
            external_number: true,
            contents: true,
            create_date: true,
          },
        },
        users_letter_referrals_sender_idTousers: {
          include: {
            persons_persons_user_idTousers: {
              select: {
                first_name: true,
                last_name: true,
                job: true,
              },
              take: 1,
            },
          },
        },
        users_letter_referrals_receiver_idTousers: {
          include: {
            persons_persons_user_idTousers: {
              select: {
                first_name: true,
                last_name: true,
                job: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        date_time: "desc",
      },
      take: 100,
    });

    const mappedReferrals = referrals.map(mapReferralListItem);

    return {
      success: true,
      referrals: mappedReferrals.filter((referral) =>
        referralMatchesQuickSearch(referral, "outgoing", searchQuery)
      ),
    };
  } catch (error) {
    console.error("Error getting outgoing letter referrals:", error);
    return {
      success: false,
      error: "خطا در دریافت نامه‌های خروجی",
      referrals: [],
    };
  }
}

export async function summarizeRelatedLetterTree(
  letterId: number
): Promise<LetterRelationSummaryResult> {
  try {
    await requireUser();
    return await summarizeRelatedLetterTreeWithAi(letterId);
  } catch (error) {
    console.error("Error building related letter summary:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "خطا در تولید خلاصه هوشمند نامه‌های مرتبط.",
    };
  }
}

export async function generateLetterResponseDraft(
  letterId: number,
  summary: string,
  userInstruction: string
): Promise<LetterResponseDraftResult> {
  try {
    await requireUser();
    return await generateLetterResponseDraftWithAi(
      letterId,
      summary,
      userInstruction
    );
  } catch (error) {
    console.error("Error generating letter response draft:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "خطا در تولید پیش‌نویس پاسخ نامه.",
    };
  }
}

export async function getFileData(fileId: number) {
  try {
    await requireUser();
    // Get file metadata from database
    const fileRecord = await prisma.files.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord) {
      return {
        success: false,
        error: "فایل یافت نشد",
      };
    }

    // Read file from disk
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, fileRecord.file_name || "");

    try {
      const fileContent = await fs.readFile(filePath);

      // Determine MIME type based on file extension
      const ext = fileRecord.file_title?.split(".").pop()?.toLowerCase() || "";
      let mimeType = "application/octet-stream";

      const mimeTypes: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        txt: "text/plain",
        svg: "image/svg+xml",
        webp: "image/webp",
        zip: "application/zip",
      };

      mimeType = mimeTypes[ext] || mimeType;

      // Convert file to base64 for transfer
      const base64Content = fileContent.toString("base64");

      return {
        success: true,
        fileData: {
          content: base64Content,
          mimeType,
          fileName: fileRecord.file_title,
        },
      };
    } catch (error) {
      console.error("Error reading file:", error);
      return {
        success: false,
        error: "خطا در خواندن فایل",
      };
    }
  } catch (error) {
    console.error("Error getting file data:", error);
    return {
      success: false,
      error: "خطا در دریافت فایل",
    };
  }
}

export async function deleteFile(fileId: number) {
  try {
    await requireUser();
    // Get file metadata from database
    const fileRecord = await prisma.files.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord) {
      return {
        success: false,
        error: "فایل یافت نشد",
      };
    }

    // Delete from physical disk
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, fileRecord.file_name || "");

    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file from disk:", error);
      // Continue anyway - still try to remove from database
    }

    // Delete letter attachments that reference this file
    await prisma.letter_attachments.deleteMany({
      where: { file_id: fileId },
    });

    // Delete file record from database
    await prisma.files.delete({
      where: { id: fileId },
    });

    return {
      success: true,
      message: "فایل با موفقیت حذف شد",
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    return {
      success: false,
      error: "خطا در حذف فایل",
    };
  }
}

export async function getLetter(letterId: number) {
  try {
    await requireUser();
    const letter = await prisma.letters.findUnique({
      where: { id: letterId },
      include: {
        letter_attachments: {
          include: {
            files: true,
          },
        },
        letter_recipients: {
          include: {
            users: true,
          },
        },
        letter_referrals: {
          include: {
            users_letter_referrals_sender_idTousers: {
              include: {
                persons_persons_user_idTousers: {
                  select: {
                    first_name: true,
                    last_name: true,
                    job: true,
                  },
                  take: 1,
                },
              },
            },
            users_letter_referrals_receiver_idTousers: {
              include: {
                persons_persons_user_idTousers: {
                  select: {
                    first_name: true,
                    last_name: true,
                    job: true,
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: {
            date_time: "desc",
          },
        },
        letter_related_letters_letter_related_letters_main_letter_idToletters: {
          include: {
            letters_letter_related_letters_related_letter_idToletters: true,
          },
        },
        letter_related_letters_letter_related_letters_related_letter_idToletters: {
          include: {
            letters_letter_related_letters_main_letter_idToletters: true,
          },
        },
        users_letters_creator_idTousers: true,
      },
    });

    if (!letter) {
      return {
        success: false,
        error: "نامه یافت نشد",
        letter: null,
      };
    }

    // Fetch person data for each recipient
    const recipientsWithPersonData = await Promise.all(
      letter.letter_recipients.map(async (rec) => {
        let personData: PersonRecipient | null = null;
        
        if (rec.user_id) {
          // Find person by user_id
          const person = await prisma.persons.findFirst({
            where: { user_id: rec.user_id },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              job: true,
              user_id: true,
            },
          });
          personData = person;
        }
        
        return {
          id: personData?.id || 0,
          first_name: personData?.first_name || null,
          last_name: personData?.last_name || null,
          job: personData?.job || null,
          user_id: rec.user_id,
        };
      })
    );

    const relatedLetters = [
      ...letter.letter_related_letters_letter_related_letters_main_letter_idToletters.map(
        (related) =>
          related.letters_letter_related_letters_related_letter_idToletters
      ),
      ...letter.letter_related_letters_letter_related_letters_related_letter_idToletters.map(
        (related) =>
          related.letters_letter_related_letters_main_letter_idToletters
      ),
    ];
    const relatedLettersData = [
      ...new Map(
        relatedLetters
          .filter((relatedLetter) => relatedLetter && relatedLetter.id !== letter.id)
          .map((relatedLetter) => [
            relatedLetter!.id,
            {
              id: relatedLetter!.id,
              title: relatedLetter!.title,
              internal_number: relatedLetter!.internal_number,
              external_number: relatedLetter!.external_number,
              contentSnippet: getPlainTextSnippet(relatedLetter!.contents),
              create_date: relatedLetter!.create_date,
            },
          ])
      ).values(),
    ];

    return {
      success: true,
      letter: {
        id: letter.id,
        title: letter.title,
        contents: letter.contents,
        create_date: letter.create_date,
        creator_id: letter.creator_id,
        internal_number: letter.internal_number,
        external_number: letter.external_number,
        source_type: letter.source_type,
        classification: letter.classification,
        attachments: letter.letter_attachments.map((att) => ({
          id: att.id,
          fileId: att.file_id,
          fileName: att.files?.file_title,
        })),
        recipients: recipientsWithPersonData,
        relatedLetters: relatedLettersData,
        referrals: letter.letter_referrals.map((referral) => ({
          id: referral.id,
          letter_id: referral.letter_id,
          sender_id: referral.sender_id,
          receiver_id: referral.receiver_id,
          date_time: referral.date_time,
          contents: referral.contents,
          due_date: referral.due_date,
          status: referral.status,
          read_at: referral.read_at,
          senderName: getUserDisplayName(
            referral.users_letter_referrals_sender_idTousers
          ),
          receiverName: getUserDisplayName(
            referral.users_letter_referrals_receiver_idTousers
          ),
          contentSnippet: getPlainTextSnippet(referral.contents),
        })),
      },
    };
  } catch (error) {
    console.error("Error getting letter:", error);
    return {
      success: false,
      error: "خطا در دریافت نامه",
      letter: null,
    };
  }
}
