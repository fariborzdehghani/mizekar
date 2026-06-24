"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

const REFERRAL_STATUS_IN_PROGRESS = 0;
const FORM_REFERRAL_OPEN = 0;

type UserForDisplay =
  | {
      id: number;
      user_id: string | null;
      persons_persons_user_idTousers?: Array<{
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
    .slice(0, 120);
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

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getLetterNumber(letter: {
  id: number;
  internal_number: string | null;
  external_number: string | null;
}) {
  return letter.internal_number || letter.external_number || `#${letter.id}`;
}

async function getArchivedMeetingIdsForUser(userId: number) {
  const rows = await prisma.$queryRaw<Array<{ meeting_id: number }>>`
    SELECT [meeting_id]
    FROM [dbo].[meeting_archive_items]
    WHERE [user_id] = ${userId}
  `;

  return rows
    .map((row) => Number(row.meeting_id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export type HeaderNotificationItem = {
  id: string;
  type: "letter" | "form" | "meeting" | "message" | "message-read";
  title: string;
  description: string;
  href: string;
  createdAt: string | null;
  sourceId: number;
};

export async function getHeaderNotifications() {
  try {
    const currentUserId = await requireUserId();
    const archivedMeetingIds = await getArchivedMeetingIdsForUser(currentUserId);
    const [
      letterReferrals,
      formReferrals,
      meetingReferrals,
      messageRecipients,
      messageReadReceipts,
    ] =
      await Promise.all([
        prisma.letter_referrals.findMany({
          where: {
            receiver_id: currentUserId,
            status: REFERRAL_STATUS_IN_PROGRESS,
            read_at: null,
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
          },
          orderBy: {
            date_time: "desc",
          },
          take: 20,
        }),
        prisma.form_referrals.findMany({
          where: {
            receiver_id: currentUserId,
            status: FORM_REFERRAL_OPEN,
            read_at: null,
            form_instances: {
              form_archive_items: {
                none: {
                  user_id: currentUserId,
                },
              },
            },
          },
          include: {
            form_instances: {
              select: {
                id: true,
                title: true,
                create_date: true,
                form_templates: {
                  select: {
                    title: true,
                  },
                },
              },
            },
            users_form_referrals_sender_idTousers: {
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
          take: 20,
        }),
        prisma.meeting_referrals.findMany({
          where: {
            receiver_id: currentUserId,
            status: REFERRAL_STATUS_IN_PROGRESS,
            read_at: null,
            ...(archivedMeetingIds.length > 0
              ? {
                  meeting_id: {
                    notIn: archivedMeetingIds,
                  },
                }
              : {}),
          },
          include: {
            meetings: {
              select: {
                id: true,
                title: true,
                meeting_at: true,
                location_type: true,
                location_title: true,
                approval_status: true,
              },
            },
            users_meeting_referrals_sender_idTousers: {
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
          take: 20,
        }),
        prisma.message_recipients.findMany({
          where: {
            user_id: currentUserId,
            read_at: null,
          },
          include: {
            message: {
              include: {
                sender: {
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
            },
          },
          orderBy: {
            id: "desc",
          },
          take: 20,
        }),
        prisma.message_recipients.findMany({
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
        }),
      ]);

    const items: HeaderNotificationItem[] = [
      ...letterReferrals
        .filter((referral) => referral.letters)
        .map((referral) => {
          const letter = referral.letters!;
          const letterNumber = getLetterNumber(letter);

          return {
            id: `letter-${referral.id}`,
            type: "letter" as const,
            sourceId: referral.id,
            title: letter.title || "(بدون عنوان)",
            description: `نامه خوانده‌نشده از ${getUserDisplayName(
              referral.users_letter_referrals_sender_idTousers
            )} - ${letterNumber}${
              getPlainTextSnippet(letter.contents)
                ? ` - ${getPlainTextSnippet(letter.contents)}`
                : ""
            }`,
            href: `/letter?id=${letter.id}&viewOnly=true`,
            createdAt: toIsoString(referral.date_time || letter.create_date),
          };
        }),
      ...formReferrals.map((referral) => ({
        id: `form-${referral.id}`,
        type: "form" as const,
        sourceId: referral.id,
        title: referral.form_instances.title || "(بدون عنوان)",
        description: `فرم خوانده‌نشده از ${getUserDisplayName(
          referral.users_form_referrals_sender_idTousers
        )} - ${referral.form_instances.form_templates.title}${
          getPlainTextSnippet(referral.contents)
            ? ` - ${getPlainTextSnippet(referral.contents)}`
            : ""
        }`,
        href: `/form?id=${referral.instance_id}`,
        createdAt: toIsoString(
          referral.date_time || referral.form_instances.create_date
        ),
      })),
      ...meetingReferrals.map((referral) => ({
        id: `meeting-${referral.id}`,
        type: "meeting" as const,
        sourceId: referral.id,
        title: referral.meetings.title || "(بدون عنوان)",
        description: `جلسه خوانده‌نشده از ${getUserDisplayName(
          referral.users_meeting_referrals_sender_idTousers
        )} - ${
          referral.meetings.location_type === 1 ? "آنلاین" : "حضوری"
        }${
          referral.meetings.location_title
            ? ` - ${referral.meetings.location_title}`
            : ""
        }`,
        href: `/meeting?id=${referral.meetings.id}&viewOnly=true`,
        createdAt: toIsoString(referral.date_time || referral.meetings.meeting_at),
      })),
      ...messageRecipients.map((recipient) => ({
        id: `message-${recipient.id}`,
        type: "message" as const,
        sourceId: recipient.id,
        title: recipient.message.title || "(بدون عنوان)",
        description: `پیام خوانده‌نشده از ${getUserDisplayName(
          recipient.message.sender
        )}${
          getPlainTextSnippet(recipient.message.contents)
            ? ` - ${getPlainTextSnippet(recipient.message.contents)}`
            : ""
        }`,
        href: `/message?id=${recipient.message_id}`,
        createdAt: toIsoString(recipient.message.create_date),
      })),
      ...messageReadReceipts.map((receipt) => ({
        id: `message-read-${receipt.id}`,
        type: "message-read" as const,
        sourceId: receipt.id,
        title: receipt.message.title || "(بدون عنوان)",
        description: `${getUserDisplayName(
          receipt.user
        )} پیام شما را مشاهده کرد`,
        href: `/message?id=${receipt.message_id}`,
        createdAt: toIsoString(receipt.read_at),
      })),
    ].sort((firstItem, secondItem) => {
      const firstTime = firstItem.createdAt
        ? new Date(firstItem.createdAt).getTime()
        : 0;
      const secondTime = secondItem.createdAt
        ? new Date(secondItem.createdAt).getTime()
        : 0;

      return secondTime - firstTime;
    });

    return {
      success: true,
      unreadCount: items.length,
      notifications: items.slice(0, 30),
    };
  } catch (error) {
    console.error("Error getting header notifications:", error);
    return {
      success: false,
      error: "خطا در دریافت اعلان‌ها",
      unreadCount: 0,
      notifications: [] as HeaderNotificationItem[],
    };
  }
}

export async function markHeaderReadReceiptNotificationsSeen(
  receiptIds: number[]
) {
  try {
    const currentUserId = await requireUserId();
    const validReceiptIds = receiptIds.filter(
      (id) => Number.isInteger(id) && id > 0
    );

    if (validReceiptIds.length === 0) {
      return { success: true };
    }

    await prisma.message_recipients.updateMany({
      where: {
        id: {
          in: validReceiptIds,
        },
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
    console.error("Error marking read receipt notifications seen:", error);
    return {
      success: false,
      error: "خطا در بروزرسانی اعلان‌ها",
    };
  }
}

export async function markHeaderNotificationClicked(
  notification: Pick<HeaderNotificationItem, "type" | "sourceId">
) {
  try {
    const currentUserId = await requireUserId();

    if (notification.type === "letter") {
      // Letter view handles the read transition so archive suggestions can
      // reliably start only when an unread letter is opened.
      return { success: true };
    }

    if (notification.type === "message") {
      await prisma.message_recipients.updateMany({
        where: {
          id: notification.sourceId,
          user_id: currentUserId,
          read_at: null,
        },
        data: {
          read_at: new Date(),
        },
      });

      revalidatePath("/incoming-messages");
      revalidatePath("/outgoing-messages");

      return { success: true };
    }

    if (notification.type === "form") {
      await prisma.form_referrals.updateMany({
        where: {
          id: notification.sourceId,
          receiver_id: currentUserId,
          read_at: null,
        },
        data: {
          read_at: new Date(),
        },
      });

      revalidatePath("/");
      revalidatePath("/incoming-letters");

      return { success: true };
    }

    if (notification.type === "meeting") {
      await prisma.meeting_referrals.updateMany({
        where: {
          id: notification.sourceId,
          receiver_id: currentUserId,
          read_at: null,
        },
        data: {
          read_at: new Date(),
        },
      });

      revalidatePath("/");
      revalidatePath("/incoming-letters");
      revalidatePath("/meeting");

      return { success: true };
    }

    await prisma.message_recipients.updateMany({
      where: {
        id: notification.sourceId,
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
    console.error("Error marking header notification clicked:", error);
    return {
      success: false,
      error: "خطا در بروزرسانی اعلان",
    };
  }
}

export async function markLetterViewed(letterId: number) {
  try {
    const currentUserId = await requireUserId();

    const updatedReferrals = await prisma.letter_referrals.updateMany({
      where: {
        letter_id: letterId,
        receiver_id: currentUserId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/incoming-letters");

    return { success: true, wasUnread: updatedReferrals.count > 0 };
  } catch (error) {
    console.error("Error marking letter viewed:", error);
    return {
      success: false,
      error: "خطا در ثبت مشاهده نامه",
    };
  }
}

export async function markLetterUnread(referralId: number) {
  try {
    const currentUserId = await requireUserId();
    const parsedReferralId = Number(referralId);

    if (!Number.isInteger(parsedReferralId) || parsedReferralId <= 0) {
      return { success: false, error: "ارجاع نامه معتبر نیست" };
    }

    const updatedReferrals = await prisma.letter_referrals.updateMany({
      where: {
        id: parsedReferralId,
        receiver_id: currentUserId,
        read_at: {
          not: null,
        },
      },
      data: {
        read_at: null,
      },
    });

    revalidatePath("/");
    revalidatePath("/incoming-letters");
    revalidatePath("/letter");

    return { success: true, changed: updatedReferrals.count > 0 };
  } catch (error) {
    console.error("Error marking letter unread:", error);
    return {
      success: false,
      error: "خطا در ثبت نامه به عنوان خوانده نشده",
    };
  }
}

export async function markFormViewed(formId: number) {
  try {
    const currentUserId = await requireUserId();

    await prisma.form_referrals.updateMany({
      where: {
        instance_id: formId,
        receiver_id: currentUserId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/incoming-letters");

    return { success: true };
  } catch (error) {
    console.error("Error marking form viewed:", error);
    return {
      success: false,
      error: "خطا در ثبت مشاهده فرم",
    };
  }
}

export async function markMessageViewed(messageId: number) {
  try {
    const currentUserId = await requireUserId();

    await prisma.message_recipients.updateMany({
      where: {
        message_id: messageId,
        user_id: currentUserId,
        read_at: null,
        message: {
          sender_id: {
            not: currentUserId,
          },
        },
      },
      data: {
        read_at: new Date(),
      },
    });

    revalidatePath("/incoming-messages");
    revalidatePath("/outgoing-messages");

    return { success: true };
  } catch (error) {
    console.error("Error marking message viewed:", error);
    return {
      success: false,
      error: "خطا در ثبت مشاهده پیام",
    };
  }
}
