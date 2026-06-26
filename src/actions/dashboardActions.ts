"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth";

const REFERRAL_STATUS_IN_PROGRESS = 0;
const FORM_STATUS_IN_PROGRESS = 1;
const FORM_STEP_ACTIVE = 1;
const FORM_REFERRAL_OPEN = 0;

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getLastSixMonthBuckets() {
  const currentMonth = getMonthStart(new Date());

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - (5 - index),
      1
    );
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    return {
      key,
      date,
      label: new Intl.DateTimeFormat("fa-IR", {
        month: "short",
      }).format(date),
      value: 0,
    };
  });
}

function getMonthKey(date: Date | null) {
  if (!date) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function addDatesToBuckets(
  buckets: ReturnType<typeof getLastSixMonthBuckets>,
  dates: Array<Date | null>
) {
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const date of dates) {
    const key = getMonthKey(date);
    const bucket = key ? bucketMap.get(key) : null;
    if (bucket) bucket.value += 1;
  }
}

export async function getDashboardStats() {
  const currentUserId = await requireUserId();
  const trendBuckets = getLastSixMonthBuckets();
  const trendStartDate = trendBuckets[0].date;

  const [
    createdLetters,
    incomingLetters,
    outgoingLetters,
    archivedLetters,
    createdForms,
    incomingForms,
    outgoingForms,
    archivedForms,
    receivedMessages,
    unreadMessages,
    sentMessages,
    createdMeetings,
    incomingMeetings,
    outgoingMeetings,
    archivedMeetings,
    ownedFolders,
    trendLetters,
    trendForms,
    trendMessages,
    trendMeetings,
  ] = await Promise.all([
    prisma.letters.count({
      where: { creator_id: currentUserId },
    }),
    prisma.letter_referrals.count({
      where: {
        receiver_id: currentUserId,
        status: REFERRAL_STATUS_IN_PROGRESS,
        letters: {
          is: {
            letter_archive_items: {
              none: { user_id: currentUserId },
            },
          },
        },
      },
    }),
    prisma.letter_referrals.count({
      where: { sender_id: currentUserId },
    }),
    prisma.letter_archive_items.count({
      where: { user_id: currentUserId },
    }),
    prisma.form_instances.count({
      where: { creator_id: currentUserId },
    }),
    prisma.form_instances.count({
      where: {
        form_archive_items: {
          none: { user_id: currentUserId },
        },
        OR: [
          {
            status: FORM_STATUS_IN_PROGRESS,
            form_instance_steps: {
              some: {
                approver_user_id: currentUserId,
                status: FORM_STEP_ACTIVE,
              },
            },
          },
          {
            form_referrals: {
              some: {
                receiver_id: currentUserId,
                status: FORM_REFERRAL_OPEN,
              },
            },
          },
        ],
      },
    }),
    prisma.form_instances.count({
      where: {
        form_archive_items: {
          none: { user_id: currentUserId },
        },
        OR: [
          { creator_id: currentUserId },
          { form_instance_steps: { some: { approver_user_id: currentUserId } } },
          { form_referrals: { some: { sender_id: currentUserId } } },
        ],
      },
    }),
    prisma.form_archive_items.count({
      where: { user_id: currentUserId },
    }),
    prisma.message_recipients.count({
      where: { user_id: currentUserId },
    }),
    prisma.message_recipients.count({
      where: {
        user_id: currentUserId,
        read_at: null,
      },
    }),
    prisma.messages.count({
      where: { sender_id: currentUserId },
    }),
    prisma.meetings.count({
      where: { creator_id: currentUserId },
    }),
    prisma.meeting_referrals.count({
      where: {
        receiver_id: currentUserId,
        status: REFERRAL_STATUS_IN_PROGRESS,
        meetings: {
          is: {
            meeting_archive_items: {
              none: { user_id: currentUserId },
            },
          },
        },
      },
    }),
    prisma.meeting_referrals.count({
      where: { sender_id: currentUserId },
    }),
    prisma.meeting_archive_items.count({
      where: { user_id: currentUserId },
    }),
    prisma.letter_archive_folders.count({
      where: { user_id: currentUserId },
    }),
    prisma.letters.findMany({
      where: {
        creator_id: currentUserId,
        create_date: { gte: trendStartDate },
      },
      select: { create_date: true },
    }),
    prisma.form_instances.findMany({
      where: {
        creator_id: currentUserId,
        create_date: { gte: trendStartDate },
      },
      select: { create_date: true },
    }),
    prisma.messages.findMany({
      where: {
        sender_id: currentUserId,
        create_date: { gte: trendStartDate },
      },
      select: { create_date: true },
    }),
    prisma.meetings.findMany({
      where: {
        creator_id: currentUserId,
        create_date: { gte: trendStartDate },
      },
      select: { create_date: true },
    }),
  ]);

  addDatesToBuckets(
    trendBuckets,
    trendLetters.map((letter) => letter.create_date)
  );
  addDatesToBuckets(
    trendBuckets,
    trendForms.map((form) => form.create_date)
  );
  addDatesToBuckets(
    trendBuckets,
    trendMessages.map((message) => message.create_date)
  );
  addDatesToBuckets(
    trendBuckets,
    trendMeetings.map((meeting) => meeting.create_date)
  );

  return {
    letters: {
      created: createdLetters,
      incoming: incomingLetters,
      outgoing: outgoingLetters,
      archived: archivedLetters,
      total: createdLetters + incomingLetters + outgoingLetters + archivedLetters,
    },
    forms: {
      created: createdForms,
      incoming: incomingForms,
      outgoing: outgoingForms,
      archived: archivedForms,
      total: createdForms + incomingForms + outgoingForms + archivedForms,
    },
    messages: {
      received: receivedMessages,
      unread: unreadMessages,
      sent: sentMessages,
      total: receivedMessages + sentMessages,
    },
    meetings: {
      created: createdMeetings,
      incoming: incomingMeetings,
      outgoing: outgoingMeetings,
      archived: archivedMeetings,
      total: createdMeetings + incomingMeetings + outgoingMeetings + archivedMeetings,
    },
    archive: {
      folders: ownedFolders,
      items: archivedLetters + archivedForms + archivedMeetings,
      letters: archivedLetters,
      forms: archivedForms,
      meetings: archivedMeetings,
    },
    workload: {
      openInbox: incomingLetters + incomingForms + incomingMeetings,
      unreadMessages,
      sentItems: outgoingLetters + outgoingForms + outgoingMeetings + sentMessages,
    },
    trends: {
      createdActivity: trendBuckets.map(({ label, value }) => ({
        label,
        value,
      })),
    },
  };
}
