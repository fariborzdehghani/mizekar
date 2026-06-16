"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser, requireUserId } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

const REFERRAL_STATUS_IN_PROGRESS = 0;
const REFERRAL_STATUS_DONE = 1;
const MEETING_APPROVAL_PENDING = 0;
const MEETING_APPROVAL_APPROVED = 1;
const ATTENDEE_ROLE_MEMBER = 0;
const ATTENDEE_ROLE_CHAIR = 1;
const ATTENDEE_ROLE_SECRETARY = 2;

interface PersonInput {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
}

interface ReferralReceiverInput {
  user_id: number | null;
}

type UserForDisplay =
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
  | undefined;

function getPlainTextSnippet(value: string | null | undefined) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
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

function parseDateTime(dateValue: string | null, timeValue: string | null) {
  if (!dateValue || !timeValue) return null;

  const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeValue.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

function parsePeopleJson(value: string | null) {
  if (!value) return [] as PersonInput[];

  const people = JSON.parse(value) as PersonInput[];
  if (!Array.isArray(people)) return [];

  return people;
}

function getValidUserIds(people: Array<{ user_id: number | null }>) {
  return [
    ...new Set(
      people
        .map((person) => Number(person.user_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
}

async function validateExistingUsers(userIds: number[]) {
  if (userIds.length === 0) return false;

  const users = await prisma.users.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
    },
  });

  return users.length === userIds.length;
}

function refreshMeetingPaths() {
  revalidatePath("/");
  revalidatePath("/incoming-letters");
  revalidatePath("/outgoing-letters");
  revalidatePath("/meeting");
  revalidatePath("/meetings");
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

export async function createMeeting(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const locationType = Number(formData.get("locationType"));
    const locationTitle = String(formData.get("locationTitle") || "").trim();
    const minutes = String(formData.get("minutes") || "");
    const meetingAt = parseDateTime(
      formData.get("meetingDate") as string | null,
      formData.get("meetingTime") as string | null
    );

    if (!title || !meetingAt || !hasRichTextContent(minutes)) {
      return {
        success: false,
        error: "عنوان، تاریخ و ساعت دقیق، و صورتجلسه الزامی است",
      };
    }

    if (![0, 1].includes(locationType)) {
      return {
        success: false,
        error: "نوع جلسه معتبر نیست",
      };
    }

    if (!locationTitle) {
      return {
        success: false,
        error:
          locationType === 1
            ? "لینک یا آدرس جلسه آنلاین را وارد کنید"
            : "محل برگزاری جلسه را وارد کنید",
      };
    }

    let attendees: PersonInput[] = [];
    let chair: PersonInput[] = [];
    let secretary: PersonInput[] = [];

    try {
      attendees = parsePeopleJson(formData.get("attendees") as string | null);
      chair = parsePeopleJson(formData.get("chair") as string | null);
      secretary = parsePeopleJson(formData.get("secretary") as string | null);
    } catch {
      return {
        success: false,
        error: "داده کاربران جلسه نامعتبر است",
      };
    }

    const chairUserId = Number(chair[0]?.user_id);
    const secretaryUserId = Number(secretary[0]?.user_id);
    const attendeeUserIds = getValidUserIds(attendees);

    if (!Number.isInteger(chairUserId) || chairUserId <= 0) {
      return {
        success: false,
        error: "رئیس جلسه باید کاربر سیستم باشد",
      };
    }

    if (!Number.isInteger(secretaryUserId) || secretaryUserId <= 0) {
      return {
        success: false,
        error: "دبیر جلسه باید کاربر سیستم باشد",
      };
    }

    if (attendeeUserIds.length === 0) {
      return {
        success: false,
        error: "حداقل یک کاربر حاضر در جلسه انتخاب کنید",
      };
    }

    const allUserIds = [
      ...new Set([...attendeeUserIds, chairUserId, secretaryUserId]),
    ];

    if (!(await validateExistingUsers(allUserIds))) {
      return {
        success: false,
        error: "یک یا چند کاربر جلسه معتبر نیستند",
      };
    }

    const now = new Date();
    const meeting = await prisma.$transaction(async (tx) => {
      const createdMeeting = await tx.meetings.create({
        data: {
          title,
          description: description || null,
          location_type: locationType,
          location_title: locationTitle,
          meeting_at: meetingAt,
          minutes,
          creator_id: currentUserId,
          chair_user_id: chairUserId,
          secretary_user_id: secretaryUserId,
          approval_status: MEETING_APPROVAL_PENDING,
          create_date: now,
        },
      });

      await tx.meeting_attendees.createMany({
        data: allUserIds.map((userId) => ({
          meeting_id: createdMeeting.id,
          user_id: userId,
          role:
            userId === chairUserId
              ? ATTENDEE_ROLE_CHAIR
              : userId === secretaryUserId
                ? ATTENDEE_ROLE_SECRETARY
                : ATTENDEE_ROLE_MEMBER,
        })),
      });

      await tx.meeting_referrals.createMany({
        data: allUserIds.map((receiverId) => ({
          meeting_id: createdMeeting.id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          date_time: now,
          contents: "",
          status: REFERRAL_STATUS_IN_PROGRESS,
        })),
      });

      return createdMeeting;
    });

    refreshMeetingPaths();

    return {
      success: true,
      meetingId: meeting.id,
      redirectTo: `/meeting?id=${meeting.id}&viewOnly=true`,
    };
  } catch (error) {
    console.error("Error creating meeting:", error);
    return {
      success: false,
      error: "خطا در ایجاد جلسه",
    };
  }
}

export async function approveMeeting(meetingId: number) {
  try {
    const currentUserId = await requireUserId();
    const meeting = await prisma.meetings.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        chair_user_id: true,
        approval_status: true,
      },
    });

    if (!meeting) {
      return {
        success: false,
        error: "جلسه یافت نشد",
      };
    }

    if (meeting.chair_user_id !== currentUserId) {
      return {
        success: false,
        error: "فقط رئیس جلسه می‌تواند جلسه را تایید کند",
      };
    }

    await prisma.meetings.update({
      where: { id: meetingId },
      data: {
        approval_status: MEETING_APPROVAL_APPROVED,
        approved_at: new Date(),
      },
    });

    refreshMeetingPaths();

    return {
      success: true,
      message: "جلسه تایید شد",
    };
  } catch (error) {
    console.error("Error approving meeting:", error);
    return {
      success: false,
      error: "خطا در تایید جلسه",
    };
  }
}

export async function createMeetingReferral(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const meetingId = Number(formData.get("meetingId"));
    const content = formData.get("content") as string | null;
    const receiversJson = formData.get("receivers") as string | null;

    if (!Number.isInteger(meetingId) || meetingId <= 0) {
      return {
        success: false,
        error: "جلسه معتبر نیست",
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
      receivers = JSON.parse(receiversJson) as ReferralReceiverInput[];
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

    const meeting = await prisma.meetings.findFirst({
      where: {
        id: meetingId,
        OR: [
          { creator_id: currentUserId },
          { chair_user_id: currentUserId },
          { secretary_user_id: currentUserId },
          {
            meeting_attendees: {
              some: {
                user_id: currentUserId,
              },
            },
          },
          {
            meeting_referrals: {
              some: {
                OR: [
                  { sender_id: currentUserId },
                  { receiver_id: currentUserId },
                ],
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!meeting) {
      return {
        success: false,
        error: "جلسه یافت نشد یا دسترسی ندارید",
      };
    }

    if (!(await validateExistingUsers(receiverIds))) {
      return {
        success: false,
        error: "یک یا چند گیرنده ارجاع معتبر نیستند",
      };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.meeting_referrals.updateMany({
        where: {
          meeting_id: meetingId,
          receiver_id: currentUserId,
          status: REFERRAL_STATUS_IN_PROGRESS,
        },
        data: {
          status: REFERRAL_STATUS_DONE,
        },
      }),
      prisma.meeting_referrals.createMany({
        data: receiverIds.map((receiverId) => ({
          meeting_id: meetingId,
          sender_id: currentUserId,
          receiver_id: receiverId,
          date_time: now,
          contents: content || "",
          status: REFERRAL_STATUS_IN_PROGRESS,
        })),
      }),
    ]);

    refreshMeetingPaths();

    return {
      success: true,
      createdCount: receiverIds.length,
      message: "ارجاع جلسه ثبت شد",
    };
  } catch (error) {
    console.error("Error creating meeting referral:", error);
    return {
      success: false,
      error: "خطا در ثبت ارجاع جلسه",
    };
  }
}

function mapMeetingReferralListItem(referral: {
  id: number;
  meeting_id: number;
  sender_id: number | null;
  receiver_id: number | null;
  date_time: Date | null;
  contents: string | null;
  status: number | null;
  read_at: Date | null;
  meetings: {
    id: number;
    title: string;
    description: string | null;
    location_type: number;
    location_title: string | null;
    meeting_at: Date;
    minutes: string;
    approval_status: number;
    approved_at: Date | null;
  };
  users_meeting_referrals_sender_idTousers: UserForDisplay;
  users_meeting_referrals_receiver_idTousers: UserForDisplay;
}) {
  return {
    id: referral.id,
    meeting_id: referral.meeting_id,
    sender_id: referral.sender_id,
    receiver_id: referral.receiver_id,
    date_time: referral.date_time,
    contents: referral.contents,
    status: referral.status,
    read_at: referral.read_at,
    senderName: getUserDisplayName(
      referral.users_meeting_referrals_sender_idTousers
    ),
    receiverName: getUserDisplayName(
      referral.users_meeting_referrals_receiver_idTousers
    ),
    contentSnippet: getPlainTextSnippet(referral.contents),
    meeting: {
      id: referral.meetings.id,
      title: referral.meetings.title,
      descriptionSnippet: getPlainTextSnippet(referral.meetings.description),
      minutesSnippet: getPlainTextSnippet(referral.meetings.minutes),
      location_type: referral.meetings.location_type,
      location_title: referral.meetings.location_title,
      meeting_at: referral.meetings.meeting_at,
      approval_status: referral.meetings.approval_status,
      approved_at: referral.meetings.approved_at,
    },
  };
}

type MeetingReferralListItem = ReturnType<typeof mapMeetingReferralListItem>;

function normalizeQuickSearchValue(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fa-IR");
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

function getApprovalStatusLabel(status: number) {
  if (status === MEETING_APPROVAL_APPROVED) return "تایید شده";
  return "در انتظار تایید";
}

function referralMatchesQuickSearch(
  referral: MeetingReferralListItem,
  perspective: "incoming" | "outgoing",
  searchQuery: string
) {
  const query = normalizeQuickSearchValue(searchQuery.trim());
  if (!query) return true;

  const personName =
    perspective === "incoming" ? referral.senderName : referral.receiverName;
  const fields = [
    `#${referral.meeting.id}`,
    referral.meeting.title,
    referral.meeting.descriptionSnippet,
    referral.meeting.minutesSnippet,
    referral.meeting.location_title,
    referral.contentSnippet,
    personName,
    getApprovalStatusLabel(referral.meeting.approval_status),
    formatReferralSearchDate(referral.date_time),
    formatReferralSearchDate(referral.meeting.meeting_at),
    "جلسه",
  ];

  return fields.some((field) =>
    normalizeQuickSearchValue(field).includes(query)
  );
}

export async function getIncomingMeetingReferrals(searchQuery = "") {
  const currentUserId = await requireUserId();

  try {
    const archivedMeetingIds = await getArchivedMeetingIdsForUser(currentUserId);
    const referrals = await prisma.meeting_referrals.findMany({
      where: {
        receiver_id: currentUserId,
        status: REFERRAL_STATUS_IN_PROGRESS,
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
            description: true,
            location_type: true,
            location_title: true,
            meeting_at: true,
            minutes: true,
            approval_status: true,
            approved_at: true,
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
        users_meeting_referrals_receiver_idTousers: {
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

    const mappedReferrals = referrals.map(mapMeetingReferralListItem);

    return {
      success: true,
      referrals: mappedReferrals.filter((referral) =>
        referralMatchesQuickSearch(referral, "incoming", searchQuery)
      ),
    };
  } catch (error) {
    console.error("Error getting incoming meeting referrals:", error);
    return {
      success: false,
      error: "خطا در دریافت جلسات ورودی",
      referrals: [],
    };
  }
}

export async function getOutgoingMeetingReferrals(searchQuery = "") {
  const currentUserId = await requireUserId();

  try {
    const archivedMeetingIds = await getArchivedMeetingIdsForUser(currentUserId);
    const referrals = await prisma.meeting_referrals.findMany({
      where: {
        sender_id: currentUserId,
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
            description: true,
            location_type: true,
            location_title: true,
            meeting_at: true,
            minutes: true,
            approval_status: true,
            approved_at: true,
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
        users_meeting_referrals_receiver_idTousers: {
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

    const mappedReferrals = referrals.map(mapMeetingReferralListItem);

    return {
      success: true,
      referrals: mappedReferrals.filter((referral) =>
        referralMatchesQuickSearch(referral, "outgoing", searchQuery)
      ),
    };
  } catch (error) {
    console.error("Error getting outgoing meeting referrals:", error);
    return {
      success: false,
      error: "خطا در دریافت جلسات خروجی",
      referrals: [],
    };
  }
}

export async function getMeeting(meetingId: number) {
  try {
    const currentUserId = await requireUserId();
    const meeting = await prisma.meetings.findFirst({
      where: {
        id: meetingId,
        OR: [
          { creator_id: currentUserId },
          { chair_user_id: currentUserId },
          { secretary_user_id: currentUserId },
          {
            meeting_attendees: {
              some: {
                user_id: currentUserId,
              },
            },
          },
          {
            meeting_referrals: {
              some: {
                OR: [
                  { sender_id: currentUserId },
                  { receiver_id: currentUserId },
                ],
              },
            },
          },
        ],
      },
      include: {
        users_meetings_creator_idTousers: {
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
        users_meetings_chair_user_idTousers: {
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
        users_meetings_secretary_user_idTousers: {
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
        meeting_attendees: {
          include: {
            users: {
              include: {
                persons_persons_user_idTousers: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    job: true,
                    user_id: true,
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
        meeting_referrals: {
          include: {
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
            users_meeting_referrals_receiver_idTousers: {
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
      },
    });

    if (!meeting) {
      return {
        success: false,
        error: "جلسه یافت نشد یا دسترسی ندارید",
        meeting: null,
      };
    }

    return {
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        location_type: meeting.location_type,
        location_title: meeting.location_title,
        meeting_at: meeting.meeting_at,
        minutes: meeting.minutes,
        creator_id: meeting.creator_id,
        chair_user_id: meeting.chair_user_id,
        secretary_user_id: meeting.secretary_user_id,
        approval_status: meeting.approval_status,
        approved_at: meeting.approved_at,
        create_date: meeting.create_date,
        creatorName: getUserDisplayName(
          meeting.users_meetings_creator_idTousers
        ),
        chairName: getUserDisplayName(
          meeting.users_meetings_chair_user_idTousers
        ),
        secretaryName: getUserDisplayName(
          meeting.users_meetings_secretary_user_idTousers
        ),
        canApprove:
          meeting.chair_user_id === currentUserId &&
          meeting.approval_status !== MEETING_APPROVAL_APPROVED,
        attendees: meeting.meeting_attendees.map((attendee) => {
          const person = attendee.users.persons_persons_user_idTousers[0];

          return {
            id: person?.id || attendee.user_id,
            first_name: person?.first_name || null,
            last_name: person?.last_name || attendee.users.user_id,
            job: person?.job || null,
            user_id: attendee.user_id,
            role: attendee.role,
          };
        }),
        referrals: meeting.meeting_referrals.map((referral) => ({
          id: referral.id,
          meeting_id: referral.meeting_id,
          sender_id: referral.sender_id,
          receiver_id: referral.receiver_id,
          date_time: referral.date_time,
          contents: referral.contents,
          status: referral.status,
          read_at: referral.read_at,
          senderName: getUserDisplayName(
            referral.users_meeting_referrals_sender_idTousers
          ),
          receiverName: getUserDisplayName(
            referral.users_meeting_referrals_receiver_idTousers
          ),
          contentSnippet: getPlainTextSnippet(referral.contents),
        })),
      },
    };
  } catch (error) {
    console.error("Error getting meeting:", error);
    return {
      success: false,
      error: "خطا در دریافت جلسه",
      meeting: null,
    };
  }
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

function meetingMatchesCreatedListSearch(
  meeting: {
    id: number;
    title: string;
    description: string | null;
    location_title: string | null;
    meeting_at: Date;
    approval_status: number;
    users_meetings_chair_user_idTousers: UserForDisplay;
    users_meetings_secretary_user_idTousers: UserForDisplay;
  },
  searchQuery: string
) {
  const query = normalizeQuickSearchValue(searchQuery.trim());
  if (!query) return true;

  const fields = [
    `#${meeting.id}`,
    meeting.title,
    getPlainTextSnippet(meeting.description),
    meeting.location_title,
    getApprovalStatusLabel(meeting.approval_status),
    getUserDisplayName(meeting.users_meetings_chair_user_idTousers),
    getUserDisplayName(meeting.users_meetings_secretary_user_idTousers),
    formatSearchDate(meeting.meeting_at),
  ];

  return fields.some((field) =>
    normalizeQuickSearchValue(field).includes(query)
  );
}

export async function getCreatedMeetings(searchQuery = "") {
  const currentUserId = await requireUserId();

  try {
    const archivedMeetingIds = await getArchivedMeetingIdsForUser(currentUserId);
    const meetings = await prisma.meetings.findMany({
      where: {
        creator_id: currentUserId,
        ...(archivedMeetingIds.length > 0
          ? {
              id: {
                notIn: archivedMeetingIds,
              },
            }
          : {}),
      },
      include: {
        users_meetings_chair_user_idTousers: {
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
        users_meetings_secretary_user_idTousers: {
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
        _count: {
          select: {
            meeting_attendees: true,
            meeting_referrals: true,
          },
        },
      },
      orderBy: [{ meeting_at: "desc" }, { id: "desc" }],
      take: 200,
    });

    const filteredMeetings = meetings.filter((meeting) =>
      meetingMatchesCreatedListSearch(meeting, searchQuery)
    );

    return {
      success: true,
      meetings: filteredMeetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        descriptionSnippet: getPlainTextSnippet(meeting.description),
        location_type: meeting.location_type,
        location_title: meeting.location_title,
        meeting_at: meeting.meeting_at,
        approval_status: meeting.approval_status,
        approved_at: meeting.approved_at,
        create_date: meeting.create_date,
        chairName: getUserDisplayName(
          meeting.users_meetings_chair_user_idTousers
        ),
        secretaryName: getUserDisplayName(
          meeting.users_meetings_secretary_user_idTousers
        ),
        attendeesCount: meeting._count.meeting_attendees,
        referralsCount: meeting._count.meeting_referrals,
      })),
    };
  } catch (error) {
    console.error("Error getting created meetings:", error);
    return {
      success: false,
      error: "خطا در دریافت جلسات ایجاد شده",
      meetings: [],
    };
  }
}

export async function markMeetingViewed(meetingId: number) {
  try {
    const currentUserId = await requireUserId();

    await prisma.meeting_referrals.updateMany({
      where: {
        meeting_id: meetingId,
        receiver_id: currentUserId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });

    refreshMeetingPaths();

    return { success: true };
  } catch (error) {
    console.error("Error marking meeting viewed:", error);
    return {
      success: false,
      error: "خطا در ثبت مشاهده جلسه",
    };
  }
}

export async function getCurrentMeetingUser() {
  const user = await requireUser();

  return {
    id: user.id,
  };
}
