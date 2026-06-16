"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser, requireUserId } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

const MESSAGE_IMPORTANCE_NORMAL = 1;
const MESSAGE_IMPORTANCE_IMPORTANT = 2;
const MESSAGE_IMPORTANCE_URGENT = 3;
const VALID_IMPORTANCE_VALUES = new Set([
  MESSAGE_IMPORTANCE_NORMAL,
  MESSAGE_IMPORTANCE_IMPORTANT,
  MESSAGE_IMPORTANCE_URGENT,
]);

type PersonRecipient = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
};

type UserForDisplay =
  | {
      id: number;
      user_id: string | null;
      persons_persons_user_idTousers?: Array<{
        id?: number;
        first_name: string | null;
        last_name: string | null;
        job?: string | null;
      }>;
    }
  | null
  | undefined;

function getPlainTextSnippet(value: string | null | undefined) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function hasRichTextContent(value: string | null | undefined) {
  const content = value || "";
  const plainText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.length > 0 || /<(img|table|ul|ol)\b/i.test(content);
}

function getUserDisplayName(user: UserForDisplay) {
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

function getImportanceLabel(importance: number | null | undefined) {
  if (importance === MESSAGE_IMPORTANCE_URGENT) return "فوری";
  if (importance === MESSAGE_IMPORTANCE_IMPORTANT) return "مهم";
  return "عادی";
}

function parsePositiveInt(value: FormDataEntryValue | null) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function normalizeImportance(value: FormDataEntryValue | null) {
  const importance = Number(value);

  return VALID_IMPORTANCE_VALUES.has(importance)
    ? importance
    : MESSAGE_IMPORTANCE_NORMAL;
}

function addSubjectPrefix(title: string | null, prefix: string) {
  const normalizedTitle = title?.trim() || "(بدون عنوان)";

  return normalizedTitle.toLocaleLowerCase("fa-IR").startsWith(
    prefix.toLocaleLowerCase("fa-IR")
  )
    ? normalizedTitle
    : `${prefix} ${normalizedTitle}`;
}

async function canAccessMessage(messageId: number, userId: number) {
  const message = await prisma.messages.findFirst({
    where: {
      id: messageId,
      OR: [
        { sender_id: userId },
        {
          message_recipients: {
            some: {
              user_id: userId,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(message);
}

async function getPersonRecipientForUser(
  userId: number
): Promise<PersonRecipient | null> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      user_id: true,
      persons_persons_user_idTousers: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          job: true,
        },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const person = user.persons_persons_user_idTousers[0];

  return {
    id: person?.id || user.id,
    first_name: person?.first_name || user.user_id || null,
    last_name: person?.last_name || null,
    job: person?.job || null,
    user_id: user.id,
  } satisfies PersonRecipient;
}

function parseRecipients(recipientsJson: string | null) {
  if (!recipientsJson) {
    return {
      success: false as const,
      error: "حداقل یک گیرنده انتخاب کنید",
      userIds: [] as number[],
    };
  }

  let recipients: PersonRecipient[] = [];
  try {
    recipients = JSON.parse(recipientsJson) as PersonRecipient[];
  } catch {
    return {
      success: false as const,
      error: "داده گیرندگان نامعتبر است",
      userIds: [] as number[],
    };
  }

  const userIds = [
    ...new Set(
      recipients
        .map((recipient) => Number(recipient.user_id))
        .filter((userId) => Number.isInteger(userId) && userId > 0)
    ),
  ];

  if (userIds.length === 0) {
    return {
      success: false as const,
      error: "گیرنده پیام باید کاربر سیستم باشد",
      userIds: [] as number[],
    };
  }

  return {
    success: true as const,
    userIds,
  };
}

async function validateRecipientUsers(userIds: number[]) {
  const users = await prisma.users.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: { id: true },
  });

  return users.length === userIds.length;
}

function revalidateMessagePaths() {
  revalidatePath("/new-message");
  revalidatePath("/message");
  revalidatePath("/incoming-messages");
  revalidatePath("/outgoing-messages");
}

export async function createMessage(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const title = String(formData.get("title") || "").trim();
    const content = String(formData.get("content") || "");
    const recipientsResult = parseRecipients(
      formData.get("recipients") as string | null
    );
    const importance = normalizeImportance(formData.get("importance"));
    const parentMessageId = parsePositiveInt(formData.get("parentMessageId"));
    const forwardedFromMessageId = parsePositiveInt(
      formData.get("forwardedFromMessageId")
    );

    if (!title) {
      return {
        success: false,
        error: "عنوان پیام را وارد کنید",
      };
    }

    if (!hasRichTextContent(content)) {
      return {
        success: false,
        error: "متن پیام را وارد کنید",
      };
    }

    if (!recipientsResult.success) {
      return {
        success: false,
        error: recipientsResult.error,
      };
    }

    if (!(await validateRecipientUsers(recipientsResult.userIds))) {
      return {
        success: false,
        error: "داده گیرندگان نامعتبر است",
      };
    }

    if (
      parentMessageId &&
      !(await canAccessMessage(parentMessageId, currentUserId))
    ) {
      return {
        success: false,
        error: "پیام اصلی برای پاسخ یافت نشد",
      };
    }

    if (
      forwardedFromMessageId &&
      !(await canAccessMessage(forwardedFromMessageId, currentUserId))
    ) {
      return {
        success: false,
        error: "پیام اصلی برای ارجاع یافت نشد",
      };
    }

    await prisma.$transaction(async (tx) => {
      const message = await tx.messages.create({
        data: {
          title,
          contents: content,
          importance,
          sender_id: currentUserId,
          create_date: new Date(),
          parent_message_id: parentMessageId,
          forwarded_from_message_id: forwardedFromMessageId,
        },
        select: { id: true },
      });

      await tx.message_recipients.createMany({
        data: recipientsResult.userIds.map((userId) => ({
          message_id: message.id,
          user_id: userId,
        })),
      });
    });

    revalidateMessagePaths();

    return {
      success: true,
      redirectTo: "/outgoing-messages",
    };
  } catch (error) {
    console.error("Error creating message:", error);
    return {
      success: false,
      error: "خطا در ارسال پیام",
    };
  }
}

const messageInclude = {
  sender: {
    include: {
      persons_persons_user_idTousers: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          job: true,
        },
        take: 1,
      },
    },
  },
  message_recipients: {
    include: {
      user: {
        include: {
          persons_persons_user_idTousers: {
            select: {
              id: true,
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
      id: "asc" as const,
    },
  },
};

function mapMessageListItem(
  message: {
    id: number;
    title: string;
    contents: string | null;
    importance: number;
    sender_id: number | null;
    create_date: Date | null;
    sender: UserForDisplay;
    message_recipients: Array<{
      id: number;
      user_id: number;
      read_at: Date | null;
      read_notification_seen_at: Date | null;
      user: UserForDisplay;
    }>;
  },
  currentUserId: number
) {
  const currentRecipient = message.message_recipients.find(
    (recipient) => recipient.user_id === currentUserId
  );
  const recipientNames = message.message_recipients.map((recipient) =>
    getUserDisplayName(recipient.user)
  );
  const readByCount = message.message_recipients.filter(
    (recipient) => recipient.read_at
  ).length;

  return {
    id: message.id,
    title: message.title,
    contentSnippet: getPlainTextSnippet(message.contents),
    importance: message.importance,
    importanceLabel: getImportanceLabel(message.importance),
    sender_id: message.sender_id,
    senderName: getUserDisplayName(message.sender),
    recipientNames,
    create_date: message.create_date,
    read_at: currentRecipient?.read_at || null,
    totalRecipients: message.message_recipients.length,
    readByCount,
    hasUnreadReadReceipts: message.message_recipients.some(
      (recipient) => recipient.read_at && !recipient.read_notification_seen_at
    ),
  };
}

type MessageListItem = ReturnType<typeof mapMessageListItem>;

function normalizeSearchValue(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fa-IR");
}

function formatSearchDate(value: Date | string | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function messageMatchesQuickSearch(
  message: MessageListItem,
  searchQuery: string
) {
  const query = normalizeSearchValue(searchQuery.trim());
  if (!query) return true;

  const fields = [
    message.title,
    message.contentSnippet,
    message.importanceLabel,
    message.senderName,
    message.recipientNames.join(" "),
    formatSearchDate(message.create_date),
  ];

  return fields.some((field) => normalizeSearchValue(field).includes(query));
}

export async function getIncomingMessages(searchQuery = "") {
  const currentUserId = await requireUserId();

  try {
    const messages = await prisma.messages.findMany({
      where: {
        message_recipients: {
          some: {
            user_id: currentUserId,
          },
        },
      },
      include: messageInclude,
      orderBy: [{ create_date: "desc" }, { id: "desc" }],
      take: 200,
    });
    const mappedMessages = messages.map((message) =>
      mapMessageListItem(message, currentUserId)
    );

    return {
      success: true,
      messages: mappedMessages.filter((message) =>
        messageMatchesQuickSearch(message, searchQuery)
      ),
    };
  } catch (error) {
    console.error("Error getting incoming messages:", error);
    return {
      success: false,
      error: "خطا در دریافت پیام‌های ورودی",
      messages: [],
    };
  }
}

export async function getOutgoingMessages(searchQuery = "") {
  const currentUserId = await requireUserId();

  try {
    const messages = await prisma.messages.findMany({
      where: {
        sender_id: currentUserId,
      },
      include: messageInclude,
      orderBy: [{ create_date: "desc" }, { id: "desc" }],
      take: 200,
    });
    const mappedMessages = messages.map((message) =>
      mapMessageListItem(message, currentUserId)
    );

    return {
      success: true,
      messages: mappedMessages.filter((message) =>
        messageMatchesQuickSearch(message, searchQuery)
      ),
    };
  } catch (error) {
    console.error("Error getting outgoing messages:", error);
    return {
      success: false,
      error: "خطا در دریافت پیام‌های خروجی",
      messages: [],
    };
  }
}

export async function getMessage(messageId: number) {
  try {
    const currentUserId = await requireUserId();
    const message = await prisma.messages.findUnique({
      where: { id: messageId },
      include: {
        ...messageInclude,
        parent_message: {
          select: {
            id: true,
            title: true,
            contents: true,
            create_date: true,
          },
        },
        forwarded_from_message: {
          select: {
            id: true,
            title: true,
            contents: true,
            create_date: true,
          },
        },
      },
    });

    if (!message) {
      return {
        success: false,
        error: "پیام یافت نشد",
        message: null,
      };
    }

    const isSender = message.sender_id === currentUserId;
    const currentRecipient = message.message_recipients.find(
      (recipient) => recipient.user_id === currentUserId
    );

    if (!isSender && !currentRecipient) {
      return {
        success: false,
        error: "شما به این پیام دسترسی ندارید",
        message: null,
      };
    }

    const currentReadAt = currentRecipient?.read_at || null;

    return {
      success: true,
      message: {
        id: message.id,
        title: message.title,
        contents: message.contents,
        importance: message.importance,
        importanceLabel: getImportanceLabel(message.importance),
        sender_id: message.sender_id,
        senderName: getUserDisplayName(message.sender),
        create_date: message.create_date,
        parent_message_id: message.parent_message_id,
        forwarded_from_message_id: message.forwarded_from_message_id,
        isSender,
        currentUserReadAt: currentReadAt,
        recipients: message.message_recipients.map((recipient) => ({
          id: recipient.id,
          user_id: recipient.user_id,
          name: getUserDisplayName(recipient.user),
          read_at:
            recipient.id === currentRecipient?.id
              ? currentReadAt
              : recipient.read_at,
        })),
        parentMessage: message.parent_message
          ? {
              id: message.parent_message.id,
              title: message.parent_message.title,
              contentSnippet: getPlainTextSnippet(message.parent_message.contents),
              create_date: message.parent_message.create_date,
            }
          : null,
        forwardedFromMessage: message.forwarded_from_message
          ? {
              id: message.forwarded_from_message.id,
              title: message.forwarded_from_message.title,
              contentSnippet: getPlainTextSnippet(
                message.forwarded_from_message.contents
              ),
              create_date: message.forwarded_from_message.create_date,
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Error getting message:", error);
    return {
      success: false,
      error: "خطا در دریافت پیام",
      message: null,
    };
  }
}

export async function getMessageComposePrefill(
  messageId: number,
  mode: "reply" | "forward"
) {
  try {
    const currentUserId = await requireUserId();
    const message = await prisma.messages.findFirst({
      where: {
        id: messageId,
        OR: [
          { sender_id: currentUserId },
          {
            message_recipients: {
              some: {
                user_id: currentUserId,
              },
            },
          },
        ],
      },
      include: {
        sender: true,
        message_recipients: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!message) {
      return {
        success: false,
        error: "پیام اصلی یافت نشد",
        prefill: null,
      };
    }

    if (mode === "forward") {
      return {
        success: true,
        prefill: {
          mode,
          sourceMessageId: message.id,
          title: addSubjectPrefix(message.title, "Fwd:"),
          content: `<p></p><hr><p><strong>پیام ارجاع شده:</strong></p>${
            message.contents || ""
          }`,
          recipients: [] as PersonRecipient[],
          parentMessageId: null,
          forwardedFromMessageId: message.id,
        },
      };
    }

    if (!message.sender_id) {
      return {
        success: false,
        error: "فرستنده پیام اصلی یافت نشد",
        prefill: null,
      };
    }

    const replyRecipient = await getPersonRecipientForUser(message.sender_id);
    if (!replyRecipient) {
      return {
        success: false,
        error: "فرستنده پیام اصلی یافت نشد",
        prefill: null,
      };
    }

    return {
      success: true,
      prefill: {
        mode,
        sourceMessageId: message.id,
        title: addSubjectPrefix(message.title, "Re:"),
        content: "",
        recipients: [replyRecipient],
        parentMessageId: message.id,
        forwardedFromMessageId: null,
      },
    };
  } catch (error) {
    console.error("Error getting message compose prefill:", error);
    return {
      success: false,
      error: "خطا در آماده‌سازی پیام",
      prefill: null,
    };
  }
}

export async function getMessageReadNotifications() {
  try {
    const currentUserId = await requireUserId();
    const receipts = await prisma.message_recipients.findMany({
      where: {
        read_at: {
          not: null,
        },
        read_notification_seen_at: null,
        message: {
          sender_id: currentUserId,
        },
      },
      include: {
        message: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
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
        read_at: "desc",
      },
      take: 20,
    });

    return {
      success: true,
      notifications: receipts.map((receipt) => ({
        id: receipt.id,
        messageId: receipt.message_id,
        messageTitle: receipt.message.title,
        readerName: getUserDisplayName(receipt.user),
        readAt: receipt.read_at?.toISOString() || null,
      })),
    };
  } catch (error) {
    console.error("Error getting message read notifications:", error);
    return {
      success: false,
      error: "خطا در دریافت اعلان‌ها",
      notifications: [],
    };
  }
}

export async function markMessageReadNotificationsSeen(receiptIds?: number[]) {
  try {
    const currentUserId = await requireUserId();
    const validReceiptIds = (receiptIds || []).filter(
      (id) => Number.isInteger(id) && id > 0
    );

    await prisma.message_recipients.updateMany({
      where: {
        ...(validReceiptIds.length > 0
          ? {
              id: {
                in: validReceiptIds,
              },
            }
          : {}),
        read_at: {
          not: null,
        },
        read_notification_seen_at: null,
        message: {
          sender_id: currentUserId,
        },
      },
      data: {
        read_notification_seen_at: new Date(),
      },
    });

    revalidatePath("/outgoing-messages");

    return { success: true };
  } catch (error) {
    console.error("Error marking message read notifications seen:", error);
    return {
      success: false,
      error: "خطا در بروزرسانی اعلان‌ها",
    };
  }
}

export async function getMessageImportanceOptions() {
  await requireUser();

  return [
    { value: MESSAGE_IMPORTANCE_NORMAL, label: "عادی" },
    { value: MESSAGE_IMPORTANCE_IMPORTANT, label: "مهم" },
    { value: MESSAGE_IMPORTANCE_URGENT, label: "فوری" },
  ];
}
