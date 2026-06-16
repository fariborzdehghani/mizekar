import "server-only";

import path from "path";
import mammoth from "mammoth";
import { prisma } from "@/src/lib/prisma";
import {
  readAiProviderNumber,
  readAiProviderString,
  requestAiChatCompletion,
} from "@/src/ai/client";
import { getPlainText, getPlainTextSnippet } from "@/src/lib/richText";

const MAX_BRIEF_TASKS = 5;
const AI_ITEM_CONTENT_CHAR_LIMIT = 1800;
const AI_TITLE_CHAR_LIMIT = 180;
const AI_NAME_CHAR_LIMIT = 120;
const AI_STATUS_CHAR_LIMIT = 240;
const REFERRAL_STATUS_IN_PROGRESS = 0;
const FORM_STATUS_IN_PROGRESS = 1;
const FORM_STEP_ACTIVE = 1;
const FORM_REFERRAL_OPEN = 0;
const MESSAGE_IMPORTANCE_IMPORTANT = 2;
const MESSAGE_IMPORTANCE_URGENT = 3;
const MEETING_APPROVAL_APPROVED = 1;
const AI_TIMEOUT_MS = 180_000;
const AI_MAX_TOKENS = 1400;

type InboxSourceType = "letter" | "form" | "meeting" | "message";
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

type InboxCandidate = {
  key: string;
  sourceType: InboxSourceType;
  sourceId: number;
  referralId?: number;
  title: string;
  snippet: string;
  content: string;
  from: string;
  receivedAt: string | null;
  dueAt: string | null;
  status: string;
  actionHref: string;
  actionLabel: string;
  actions: InboxBriefAction[];
  processSteps: string[];
  score: number;
};

type InboxBriefAction = {
  label: string;
  href: string;
};

export type InboxBrief = {
  id: number;
  briefDate: string;
  createdAt: string | null;
  summary: string;
  items: InboxBriefItem[];
  aiError: string | null;
  sourceItemCount: number;
};

export type InboxBriefItem = {
  id: string;
  sourceType: InboxSourceType;
  sourceId: number;
  referralId?: number;
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
};

type ParsedAiBriefItem = {
  itemKey?: unknown;
  title?: unknown;
  text?: unknown;
  actionLabel?: unknown;
};

function getUserDisplayName(user: UserForDisplay) {
  const person = user?.persons_persons_user_idTousers?.[0];
  const fullName = [person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const job = person?.job?.trim();

  if (fullName) return job ? `${fullName} - ${job}` : fullName;

  const fallbackName = user?.user_id || (user?.id ? `User #${user.id}` : "-");
  return job && fallbackName !== "-" ? `${fallbackName} - ${job}` : fallbackName;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function toLocalDateString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function joinPromptSections(sections: Array<[string, string | null | undefined]>) {
  return sections
    .map(([label, value]) => {
      const content = getPlainText(value);
      return content ? `${label}:\n${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function getStoredUploadPath(fileName: string | null | undefined) {
  return fileName ? path.join(process.cwd(), "public", "uploads", fileName) : null;
}

function isDocxFile(fileTitle: string | null | undefined) {
  return (fileTitle?.split(".").pop() || "").toLowerCase() === "docx";
}

async function extractDocxText(
  fileName: string | null | undefined,
  fileTitle: string | null | undefined
) {
  const filePath = getStoredUploadPath(fileName);
  if (!filePath || !isDocxFile(fileTitle)) return "";

  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch (error) {
    console.warn("Could not extract form document text for inbox brief:", error);
    return "";
  }
}

function withTaskParam(href: string, key: string) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}aiTask=${encodeURIComponent(key)}`;
}

function scoreDate(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function isBeforeTomorrow(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  return date < addDays(startOfToday(), 1);
}

function isToday(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  return date >= today && date < tomorrow;
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

function getSourceLabel(sourceType: InboxSourceType) {
  if (sourceType === "letter") return "نامه";
  if (sourceType === "form") return "فرم";
  if (sourceType === "meeting") return "جلسه";
  return "پیام";
}

function getSelectedAction(candidate: InboxCandidate, value: unknown) {
  const requestedLabel = getStringField(value);
  return candidate.actions.find((action) => action.label === requestedLabel) || null;
}

function hasPersianText(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function parseAiBrief(aiText: string, candidates: InboxCandidate[]) {
  const parsed = parseJsonObject(aiText);
  if (!parsed || typeof parsed !== "object") return null;

  const data = parsed as Record<string, unknown>;
  const summary = getStringField(data.summary);
  const rawItems = data.items;
  if (!hasPersianText(summary) || !Array.isArray(rawItems)) return null;

  const candidatesByKey = new Map(
    candidates.map((candidate) => [candidate.key, candidate])
  );
  const usedKeys = new Set<string>();
  const items: InboxBriefItem[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object") continue;

    const item = rawItem as ParsedAiBriefItem;
    const itemKey = getStringField(item.itemKey);
    const candidate = candidatesByKey.get(itemKey);
    const text = getStringField(item.text);
    if (!candidate || usedKeys.has(candidate.key)) continue;

    const title = getStringField(item.title, candidate.title);
    if (!hasPersianText(title) || !hasPersianText(text)) continue;

    const selectedAction = getSelectedAction(candidate, item.actionLabel);
    if (!selectedAction) continue;

    usedKeys.add(candidate.key);
    items.push({
      id: candidate.key,
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId,
      referralId: candidate.referralId,
      title,
      text,
      actionHref: selectedAction.href,
      actionLabel: selectedAction.label,
    });
  }

  return summary && items.length > 0
    ? {
        summary,
        items,
      }
    : null;
}

function buildAiPrompt(candidates: InboxCandidate[]) {
  const today = toLocalDateString(startOfToday());
  const items = candidates.map((candidate) => ({
    itemKey: candidate.key,
    type: candidate.sourceType,
    sourceLabel: getSourceLabel(candidate.sourceType),
    score: candidate.score,
    title: truncateText(candidate.title, AI_TITLE_CHAR_LIMIT),
    from: truncateText(candidate.from, AI_NAME_CHAR_LIMIT),
    receivedAt: candidate.receivedAt,
    dueAt: candidate.dueAt,
    status: truncateText(candidate.status, AI_STATUS_CHAR_LIMIT),
    content: truncateText(candidate.content || candidate.snippet, AI_ITEM_CONTENT_CHAR_LIMIT),
    allowedActions: candidate.actions.map((action) => action.label),
  }));

  return [
    `تاریخ امروز: ${today}`,
    "برنامه قبلا مهم‌ترین موارد کارتابل را با امتیازدهی انتخاب کرده است؛ مورد جدیدی اضافه نکن و هیچ موردی را با داده خارج از ورودی جایگزین نکن.",
    "فقط از داده‌های همین ورودی استفاده کن و تاریخ، شخص، تصمیم یا تعهد جدید نساز.",
    "تمام مقدارهای summary، title و text باید فارسی باشند.",
    "برای هر مورد دقیقا یکی از allowedActions همان مورد را انتخاب کن و همان متن را بدون تغییر در actionLabel قرار بده.",
    "پاسخ فقط JSON معتبر باشد؛ هیچ متن اضافه، markdown fence، توضیح انگلیسی، یا reasoning مخفی ننویس.",
    "ساختار دقیق پاسخ:",
    '{"summary":"خلاصه کوتاه فارسی","items":[{"itemKey":"candidate itemKey","title":"عنوان کوتاه فارسی","text":"توضیح فارسی برای همان مورد","actionLabel":"یکی از allowedActions همان مورد"}]}',
    "",
    "موارد کارتابل:",
    JSON.stringify(items, null, 2),
  ].join("\n");
}

function getSystemPrompt() {
  return (
    readAiProviderString(
      ["AI_INBOX_BRIEF_SYSTEM_PROMPT"],
      ["LM_STUDIO_AI_INBOX_BRIEF_SYSTEM_PROMPT"]
    ) ||
    [
      "تو دستیار یک سامانه اتوماسیون اداری فارسی هستی.",
      "موارد کارتابل را تحلیل کن و یک خلاصه روزانه کوتاه فارسی بساز.",
      "فقط JSON معتبر برگردان. هیچ markdown، متن انگلیسی، reasoning مخفی یا <think> ننویس.",
    ].join(" ")
  );
}

async function collectLetterCandidates(userId: number): Promise<InboxCandidate[]> {
  const referrals = await prisma.letter_referrals.findMany({
    where: {
      receiver_id: userId,
      status: REFERRAL_STATUS_IN_PROGRESS,
      letters: {
        is: {
          letter_archive_items: {
            none: {
              user_id: userId,
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
    orderBy: [{ due_date: "asc" }, { date_time: "desc" }],
    take: 40,
  });

  return referrals
    .filter((referral) => referral.letters)
    .map((referral) => {
      const letter = referral.letters!;
      const key = `letter:${referral.id}`;
      const number = letter.internal_number || letter.external_number || `#${letter.id}`;
      const hasDueToday = isBeforeTomorrow(referral.due_date);
      const score = (hasDueToday ? 95 : 45) + (referral.read_at ? 0 : 8);
      const actionHref = withTaskParam(`/letter?id=${letter.id}&viewOnly=true`, key);
      const actions = [
        { label: "تهیه پاسخ", href: actionHref },
        { label: "ثبت ارجاع", href: actionHref },
        { label: "بایگانی نامه", href: actionHref },
        { label: "ثبت جلسه", href: "/meeting" },
        { label: "ارسال پیام", href: "/new-message" },
      ];

      return {
        key,
        sourceType: "letter",
        sourceId: letter.id,
        referralId: referral.id,
        title: `${number} - ${letter.title || "(No title)"}`,
        snippet: [getPlainTextSnippet(referral.contents), getPlainTextSnippet(letter.contents)]
          .filter(Boolean)
          .join(" / "),
        content: joinPromptSections([
          ["عنوان نامه", letter.title],
          ["شماره نامه", number],
          ["توضیح ارجاع", referral.contents],
          ["متن نامه", letter.contents],
        ]),
        from: getUserDisplayName(referral.users_letter_referrals_sender_idTousers),
        receivedAt: toIsoString(referral.date_time),
        dueAt: toIsoString(referral.due_date),
        status: hasDueToday
          ? "ارجاع نامه برای امروز یا قبل از امروز موعد دارد."
          : "ارجاع باز نامه در کارتابل ورودی قرار دارد.",
        actionHref,
        actionLabel: "تهیه پاسخ",
        actions,
        processSteps: [
          "نامه ارجاع‌شده را باز کنید.",
          "متن نامه، پیوست‌ها و سوابق ارجاع را بررسی کنید.",
          "پاسخ، ارجاع یا بایگانی را در صفحه نامه ثبت کنید.",
        ],
        score,
      } satisfies InboxCandidate;
    });
}

async function collectFormCandidates(userId: number): Promise<InboxCandidate[]> {
  const instances = await prisma.form_instances.findMany({
    where: {
      form_archive_items: {
        none: {
          user_id: userId,
        },
      },
      OR: [
        {
          status: FORM_STATUS_IN_PROGRESS,
          form_instance_steps: {
            some: {
              approver_user_id: userId,
              status: FORM_STEP_ACTIVE,
            },
          },
        },
        {
          form_referrals: {
            some: {
              receiver_id: userId,
              status: FORM_REFERRAL_OPEN,
            },
          },
        },
      ],
    },
    include: {
      form_templates: {
        select: {
          title: true,
          description: true,
        },
      },
      files: {
        select: {
          file_name: true,
          file_title: true,
        },
      },
      users_form_instances_creator_idTousers: {
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
      form_instance_steps: true,
      form_referrals: {
        where: {
          receiver_id: userId,
          status: FORM_REFERRAL_OPEN,
        },
        orderBy: {
          date_time: "desc",
        },
        take: 1,
      },
    },
    orderBy: [{ submit_date: "desc" }, { create_date: "desc" }],
    take: 40,
  });

  return Promise.all(instances.map(async (instance) => {
    const activeStep = instance.form_instance_steps.find(
      (step) => step.approver_user_id === userId && step.status === FORM_STEP_ACTIVE
    );
    const latestReferral = instance.form_referrals[0];
    const key = `form:${instance.id}`;
    const documentText = await extractDocxText(
      instance.files?.file_name,
      instance.files?.file_title
    );
    const actionHref = withTaskParam(`/form?id=${instance.id}`, key);
    const actions = activeStep
      ? [
          { label: "تایید فرم", href: actionHref },
          { label: "رد فرم", href: actionHref },
          { label: "ثبت ارجاع", href: actionHref },
          { label: "ارسال پیام", href: "/new-message" },
        ]
      : [
          { label: "ثبت ارجاع", href: actionHref },
          { label: "بررسی فرم", href: actionHref },
          { label: "ارسال پیام", href: "/new-message" },
        ];
    const stepContext = instance.form_instance_steps
      .sort((first, second) => first.step_order - second.step_order)
      .map((step) => {
        const parts = [
          `مرحله ${step.step_order}`,
          step.title || "",
          `وضعیت ${step.status}`,
          step.comments ? `توضیحات: ${getPlainText(step.comments)}` : "",
        ].filter(Boolean);

        return parts.join(" - ");
      })
      .join("\n");

    return {
      key,
      sourceType: "form",
      sourceId: instance.id,
      referralId: latestReferral?.id,
      title: instance.title || instance.form_templates.title,
      snippet: latestReferral?.contents ? getPlainTextSnippet(latestReferral.contents) : "",
      content: joinPromptSections([
        ["عنوان فرم", instance.title],
        ["قالب فرم", instance.form_templates.title],
        ["توضیح قالب", instance.form_templates.description],
        ["سند پیوست فرم", instance.files?.file_title],
        ["متن سند فرم", documentText],
        ["آخرین توضیح ارجاع", latestReferral?.contents],
        ["مراحل تایید و توضیحات", stepContext],
      ]),
      from: getUserDisplayName(instance.users_form_instances_creator_idTousers),
      receivedAt: toIsoString(latestReferral?.date_time || instance.submit_date || instance.create_date),
      dueAt: null,
      status: activeStep
        ? `فرم در مرحله ${activeStep.step_order} منتظر اقدام شماست.`
        : "ارجاع باز فرم در کارتابل ورودی قرار دارد.",
      actionHref,
      actionLabel: activeStep ? "تایید فرم" : "ثبت ارجاع",
      actions,
      processSteps: [
        "فرم را باز کنید.",
        "سند و مرحله فعلی تایید را بررسی کنید.",
        activeStep
          ? "تایید، رد یا ارجاع را از نوار عملیات فرم ثبت کنید."
          : "ارجاع را بررسی کنید و ادامه فرایند فرم را ثبت کنید.",
      ],
      score: activeStep ? 88 : 62,
    } satisfies InboxCandidate;
  }));
}

async function collectMeetingCandidates(userId: number): Promise<InboxCandidate[]> {
  const referrals = await prisma.meeting_referrals.findMany({
    where: {
      receiver_id: userId,
      status: REFERRAL_STATUS_IN_PROGRESS,
      meetings: {
        is: {
          meeting_archive_items: {
            none: {
              user_id: userId,
            },
          },
        },
      },
    },
    include: {
      meetings: {
        select: {
          id: true,
          title: true,
          description: true,
          minutes: true,
          meeting_at: true,
          approval_status: true,
          chair_user_id: true,
          location_title: true,
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
    take: 40,
  });

  return referrals.map((referral) => {
    const meeting = referral.meetings;
    const key = `meeting:${referral.id}`;
    const todayMeeting = isToday(meeting.meeting_at);
    const canApprove =
      meeting.chair_user_id === userId &&
      meeting.approval_status !== MEETING_APPROVAL_APPROVED;
    const score = (todayMeeting ? 92 : 52) + (canApprove ? 18 : 0);
    const actionHref = withTaskParam(`/meeting?id=${meeting.id}&viewOnly=true`, key);
    const actions = canApprove
      ? [
          { label: "تایید جلسه", href: actionHref },
          { label: "ثبت ارجاع", href: actionHref },
          { label: "ارسال پیام", href: "/new-message" },
        ]
      : [
          { label: "بررسی جلسه", href: actionHref },
          { label: "ثبت جلسه", href: "/meeting" },
          { label: "ثبت ارجاع", href: actionHref },
          { label: "ارسال پیام", href: "/new-message" },
        ];

    return {
      key,
      sourceType: "meeting",
      sourceId: meeting.id,
      referralId: referral.id,
      title: meeting.title || `جلسه ${meeting.id}`,
      snippet: [
        getPlainTextSnippet(referral.contents),
        getPlainTextSnippet(meeting.description),
        getPlainTextSnippet(meeting.minutes),
        meeting.location_title || "",
      ]
        .filter(Boolean)
        .join(" / "),
      content: joinPromptSections([
        ["عنوان جلسه", meeting.title],
        ["توضیح ارجاع", referral.contents],
        ["دستور یا شرح جلسه", meeting.description],
        ["صورتجلسه", meeting.minutes],
        ["محل برگزاری", meeting.location_title],
      ]),
      from: getUserDisplayName(referral.users_meeting_referrals_sender_idTousers),
      receivedAt: toIsoString(referral.date_time),
      dueAt: toIsoString(meeting.meeting_at),
      status: todayMeeting
        ? "جلسه برای امروز برنامه‌ریزی شده است."
        : canApprove
          ? "جلسه منتظر تایید شماست."
          : "ارجاع باز جلسه در کارتابل ورودی قرار دارد.",
      actionHref,
      actionLabel: canApprove ? "تایید جلسه" : "بررسی جلسه",
      actions,
      processSteps: [
        "صفحه جلسه را باز کنید.",
        "جزئیات جلسه، صورتجلسه، شرکت‌کنندگان و ارجاع‌ها را بررسی کنید.",
        canApprove
          ? "تایید جلسه را در صفحه جلسه ثبت کنید."
          : "ادامه فرایند ارجاع جلسه را ثبت کنید.",
      ],
      score,
    } satisfies InboxCandidate;
  });
}

async function collectMessageCandidates(userId: number): Promise<InboxCandidate[]> {
  const messages = await prisma.messages.findMany({
    where: {
      message_recipients: {
        some: {
          user_id: userId,
        },
      },
    },
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
      message_recipients: {
        where: {
          user_id: userId,
        },
        select: {
          id: true,
          read_at: true,
        },
      },
    },
    orderBy: [{ create_date: "desc" }, { id: "desc" }],
    take: 40,
  });

  const candidates: InboxCandidate[] = [];

  for (const message of messages) {
    const recipient = message.message_recipients[0];
    const unread = !recipient?.read_at;
    const urgent = message.importance === MESSAGE_IMPORTANCE_URGENT;
    const important = message.importance === MESSAGE_IMPORTANCE_IMPORTANT;
    const createdToday = isToday(message.create_date);

    if (!unread && !urgent && !important && !createdToday) continue;

    const key = `message:${message.id}`;
    const score =
      (urgent ? 72 : important ? 55 : 28) +
      (unread ? 16 : 0) +
      (createdToday ? 10 : 0);
    const actionHref = withTaskParam(`/new-message?replyTo=${message.id}`, key);
    const viewHref = withTaskParam(`/message?id=${message.id}`, key);
    const forwardHref = withTaskParam(`/new-message?forwardFrom=${message.id}`, key);
    const actions = [
      { label: "ارسال پیام", href: actionHref },
      { label: "تهیه پاسخ", href: actionHref },
      { label: "ارجاع پیام", href: forwardHref },
      { label: "بررسی پیام", href: viewHref },
    ];

    candidates.push({
      key,
      sourceType: "message",
      sourceId: message.id,
      referralId: recipient?.id,
      title: message.title || `پیام ${message.id}`,
      snippet: getPlainTextSnippet(message.contents),
      content: joinPromptSections([
        ["عنوان پیام", message.title],
        ["متن پیام", message.contents],
      ]),
      from: getUserDisplayName(message.sender),
      receivedAt: toIsoString(message.create_date),
      dueAt: null,
      status: urgent
        ? "پیام فوری در کارتابل ورودی قرار دارد."
        : important
          ? "پیام مهم در کارتابل ورودی قرار دارد."
          : "پیام خوانده‌نشده یا جدید در کارتابل ورودی قرار دارد.",
      actionHref,
      actionLabel: "ارسال پیام",
      actions,
      processSteps: [
        "پیام را باز کنید.",
        "فرستنده، گیرندگان و متن پیام را بررسی کنید.",
        "پاسخ یا ارجاع پیام را ثبت کنید.",
      ],
      score,
    });
  }

  return candidates;
}

async function collectInboxCandidates(userId: number) {
  const [letters, forms, meetings, messages] = await Promise.all([
    collectLetterCandidates(userId),
    collectFormCandidates(userId),
    collectMeetingCandidates(userId),
    collectMessageCandidates(userId),
  ]);

  return [...letters, ...forms, ...meetings, ...messages]
    .sort((first, second) => {
      const scoreDiff = second.score - first.score;
      if (scoreDiff !== 0) return scoreDiff;
      return scoreDate(second.receivedAt) - scoreDate(first.receivedAt);
    })
    .slice(0, MAX_BRIEF_TASKS);
}

function readSourceItemCount(value: string | null | undefined) {
  if (!value) return 0;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function readBriefItems(value: string | null | undefined) {
  if (!value) return [] as InboxBriefItem[];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as InboxBriefItem[]) : [];
  } catch {
    return [];
  }
}

function isDisplayableBriefItem(item: InboxBriefItem) {
  return Boolean(
    item.id &&
      item.sourceType &&
      item.sourceId &&
      item.actionHref &&
      hasPersianText(item.title) &&
      hasPersianText(item.text) &&
      hasPersianText(item.actionLabel)
  );
}

function mapBriefRow(row: {
  id: number;
  brief_date: Date;
  create_date: Date | null;
  summary: string | null;
  tasks_json: string;
  source_items_json: string | null;
  ai_error: string | null;
}): InboxBrief {
  const items = readBriefItems(row.tasks_json).filter(isDisplayableBriefItem);

  return {
    id: row.id,
    briefDate: toLocalDateString(row.brief_date),
    createdAt: toIsoString(row.create_date),
    summary: row.summary || "",
    items,
    aiError: row.ai_error,
    sourceItemCount: readSourceItemCount(row.source_items_json),
  };
}

export async function getLatestTodayInboxBriefForUser(userId: number) {
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const rows = await prisma.ai_inbox_briefs.findMany({
    where: {
      user_id: userId,
      ai_error: null,
      brief_date: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: [{ create_date: "desc" }, { id: "desc" }],
    take: 10,
  });

  return (
    rows
      .map(mapBriefRow)
      .find((brief) => hasPersianText(brief.summary) && brief.items.length > 0) ||
    null
  );
}

export async function createTodayInboxBriefForUser(userId: number) {
  const candidates = await collectInboxCandidates(userId);

  if (candidates.length === 0) {
    throw new Error("No open inbox items were found for today.");
  }

  const aiResult = await requestAiChatCompletion(
    getSystemPrompt(),
    buildAiPrompt(candidates),
    {
      timeoutMs: readAiProviderNumber(
        ["AI_INBOX_BRIEF_TIMEOUT_MS"],
        ["LM_STUDIO_AI_INBOX_BRIEF_TIMEOUT_MS"],
        AI_TIMEOUT_MS
      ),
      retries: readAiProviderNumber(
        ["AI_INBOX_BRIEF_RETRIES"],
        ["LM_STUDIO_AI_INBOX_BRIEF_RETRIES"],
        0
      ),
      maxTokens: readAiProviderNumber(
        ["AI_INBOX_BRIEF_MAX_TOKENS"],
        ["LM_STUDIO_AI_INBOX_BRIEF_MAX_TOKENS"],
        AI_MAX_TOKENS
      ),
      temperature: readAiProviderNumber(
        ["AI_INBOX_BRIEF_TEMPERATURE"],
        ["LM_STUDIO_AI_INBOX_BRIEF_TEMPERATURE"],
        0.25
      ),
    }
  );

  if (!aiResult.success) {
    throw new Error(aiResult.error);
  }

  const summary = aiResult.text.trim();
  if (!summary) {
    throw new Error("AI response was empty.");
  }

  const parsedBrief = parseAiBrief(summary, candidates);
  if (!parsedBrief) {
    throw new Error("AI response did not include valid actionable brief items.");
  }

  const row = await prisma.ai_inbox_briefs.create({
    data: {
      user_id: userId,
      brief_date: startOfToday(),
      create_date: new Date(),
      summary: parsedBrief.summary,
      tasks_json: JSON.stringify(parsedBrief.items),
      source_items_json: JSON.stringify(
        candidates.map((candidate) => ({
          key: candidate.key,
          sourceType: candidate.sourceType,
          sourceId: candidate.sourceId,
          referralId: candidate.referralId,
          title: candidate.title,
          snippet: candidate.snippet,
          actionHref: candidate.actionHref,
          actionLabel: candidate.actionLabel,
          actions: candidate.actions,
          from: candidate.from,
          receivedAt: candidate.receivedAt,
          dueAt: candidate.dueAt,
          status: candidate.status,
        }))
      ),
      ai_error: null,
    },
  });

  return mapBriefRow(row);
}
