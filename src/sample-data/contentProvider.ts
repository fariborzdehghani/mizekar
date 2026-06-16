import "server-only";

export type SampleSubject = {
  slug: string;
  title: string;
  summary: string;
};

export type SamplePerson = {
  userId: string;
  firstName: string;
  lastName: string;
  job: string;
};

type SubjectInput = {
  subject: SampleSubject;
  index: number;
};

type ItemInput = SubjectInput & {
  itemNumber: number;
};

type FormInput = ItemInput & {
  statusMode: number;
};

export type SampleContentProvider = {
  id: string;
  label: string;
  getSubjects(count: number): Promise<SampleSubject[]>;
  getPeople(count: number): Promise<SamplePerson[]>;
  letter(input: ItemInput): {
    title: string;
    bodyLines: string[];
    primaryReferralLines: string[];
    secondaryReferralLines: string[];
    attachmentTitle: string;
    attachmentLines: string[];
  };
  formTemplate(input: SubjectInput): {
    title: string;
    description: string;
    documentLines: string[];
    stepTitle: (stepNumber: number) => string;
  };
  formInstance(input: FormInput): {
    title: string;
    documentTitle: string;
    documentLines: string[];
    approvedComment: string;
    rejectedComment: string;
    submitReferral: string;
    activeReferral: string;
    completedReferral: string;
    rejectedReferral: string;
  };
  meeting(input: ItemInput & { runKey: string }): {
    title: string;
    descriptionLines: string[];
    minutesLines: string[];
    physicalLocation: string;
    onlineLocation: string;
    ownReferral: string;
    attendeeReferral: string;
  };
  messageThread(input: ItemInput): {
    title: string;
    bodyLines: string[];
    replyTitle: string;
    replyLines: string[];
    forwardTitle: string;
    forwardLines: string[];
  };
};

const SUBJECTS: SampleSubject[] = [
  {
    slug: "vendor-onboarding",
    title: "راه‌اندازی تامین‌کننده جدید",
    summary: "ارزیابی صلاحیت، کنترل ریسک، تنظیم قرارداد و آماده‌سازی اولین پرداخت",
  },
  {
    slug: "contract-renewal",
    title: "تمدید قرارداد پشتیبانی",
    summary: "بررسی قیمت تمدید، نظر حقوقی، تایید مالی و کنترل زمان‌بندی",
  },
  {
    slug: "privacy-review",
    title: "بازبینی محرمانگی داده‌ها",
    summary: "نقشه داده، سطح دسترسی، یافته‌های ارزیابی حریم خصوصی و اقدامات اصلاحی",
  },
  {
    slug: "product-launch",
    title: "آماده‌سازی عرضه محصول",
    summary: "آمادگی انتشار، هماهنگی بازاریابی، ظرفیت پشتیبانی و تایید نهایی",
  },
  {
    slug: "budget-planning",
    title: "برنامه‌ریزی بودجه فصلی",
    summary: "درخواست بودجه، اولویت‌بندی هزینه‌ها، تایید مدیران و گزارش‌گیری",
  },
  {
    slug: "hiring-plan",
    title: "برنامه جذب نیرو",
    summary: "درخواست ظرفیت نیروی انسانی، ترکیب مصاحبه‌کنندگان، تایید پیشنهاد و شروع همکاری",
  },
  {
    slug: "security-incident",
    title: "رسیدگی به رخداد امنیتی",
    summary: "ثبت رخداد، مهار اولیه، اطلاع‌رسانی داخلی و جمع‌بندی اقدام‌های اصلاحی",
  },
  {
    slug: "office-relocation",
    title: "جابجایی دفتر",
    summary: "انتخاب محل، آماده‌سازی زیرساخت، هماهنگی پیمانکاران و برنامه روز انتقال",
  },
];

const PEOPLE: SamplePerson[] = [
  {
    userId: "ai_sample_ops",
    firstName: "نیما",
    lastName: "عملیات",
    job: "مسئول عملیات",
  },
  {
    userId: "ai_sample_legal",
    firstName: "امید",
    lastName: "حقوقی",
    job: "کارشناس حقوقی",
  },
  {
    userId: "ai_sample_finance",
    firstName: "سارا",
    lastName: "مالی",
    job: "کنترل‌کننده مالی",
  },
  {
    userId: "ai_sample_hr",
    firstName: "رضا",
    lastName: "منابع انسانی",
    job: "همکار منابع انسانی",
  },
  {
    userId: "ai_sample_security",
    firstName: "لیلا",
    lastName: "امنیت",
    job: "تحلیل‌گر امنیت",
  },
  {
    userId: "ai_sample_pm",
    firstName: "آرمان",
    lastName: "برنامه",
    job: "مدیر برنامه",
  },
  {
    userId: "ai_sample_support",
    firstName: "مینا",
    lastName: "پشتیبانی",
    job: "مسئول پشتیبانی",
  },
  {
    userId: "ai_sample_procurement",
    firstName: "کیان",
    lastName: "تدارکات",
    job: "کارشناس تدارکات",
  },
  {
    userId: "ai_sample_it",
    firstName: "رها",
    lastName: "فناوری اطلاعات",
    job: "مدیر سیستم‌ها",
  },
  {
    userId: "ai_sample_chief",
    firstName: "دارا",
    lastName: "مدیریت",
    job: "حامی اجرایی",
  },
];

export const staticPersianSampleContentProvider: SampleContentProvider = {
  id: "static-persian",
  label: "محتوای ثابت فارسی",
  async getSubjects(count) {
    return SUBJECTS.slice(0, count);
  },
  async getPeople(count) {
    return PEOPLE.slice(0, count);
  },
  letter({ subject, itemNumber }) {
    return {
      title: `نامه ${itemNumber}`,
      bodyLines: [
        `موضوع این نامه ${subject.title} است.`,
        `شرح سناریو: ${subject.summary}.`,
        `در این نامه وضعیت فعلی، تصمیم مورد نیاز، مالک پیگیری و مهلت پاسخ برای آزمون بازیابی هوش مصنوعی ثبت شده است.`,
      ],
      primaryReferralLines: [
        `ارجاع اصلی برای ${subject.title}.`,
        "لطفا تصمیم پیشنهادی، ریسک‌های باز و اقدام بعدی را بررسی و نتیجه را ثبت کنید.",
      ],
      secondaryReferralLines: [
        `ارجاع تکمیلی برای تکمیل زمینه ${subject.title}.`,
      ],
      attachmentTitle: `پیوست نامه ${itemNumber} ${subject.title}.txt`,
      attachmentLines: [
        `پیوست مربوط به ${subject.title}`,
        "این فایل شامل شواهد، تاریخ‌های مهم، مسئول پیگیری و نکته‌های تصمیم‌گیری است.",
      ],
    };
  },
  formTemplate({ subject }) {
    return {
      title: `قالب فرم ${subject.title}`,
      description: `قالب فرایندی برای ${subject.summary}.`,
      documentLines: [
        `این قالب برای فرایند ${subject.title} ساخته شده است.`,
        "هدف آن ایجاد فرم‌های نمونه با مسیر تایید، توضیح، ارجاع و وضعیت‌های متفاوت است.",
      ],
      stepTitle: (stepNumber) => `مرحله تایید نمونه ${stepNumber}`,
    };
  },
  formInstance({ subject, itemNumber, statusMode }) {
    const statusText =
      statusMode === 0
        ? "پیش‌نویس"
        : statusMode === 1
          ? "در جریان تایید"
          : statusMode === 2
            ? "تکمیل شده"
            : "رد شده";

    return {
      title: `فرم ${itemNumber}`,
      documentTitle: `فرم ${itemNumber} ${subject.title}`,
      documentLines: [
        `این فرم برای ${subject.title} ایجاد شده است.`,
        `وضعیت نمونه این فرم: ${statusText}.`,
        "سند شامل مالک، نظر تاییدکنندگان، نتیجه ارجاع و نکته‌های قابل جستجو برای آزمون هوش مصنوعی است.",
      ],
      approvedComment: "بررسی نمونه انجام شد و این مرحله تایید شد.",
      rejectedComment: "به دلیل ناقص بودن مستندات پشتیبان، فرم برای اصلاح برگشت داده شد.",
      submitReferral: "فرم برای شروع مسیر تایید ارسال شد.",
      activeReferral: "این فرم در مرحله فعال تایید قرار دارد و نیازمند بررسی است.",
      completedReferral: "فرم تکمیل شد و برای ثبت سوابق برگشت داده شد.",
      rejectedReferral: "فرم با توضیحات اصلاحی رد شد.",
    };
  },
  meeting({ subject, itemNumber, runKey }) {
    return {
      title: `جلسه ${itemNumber}`,
      descriptionLines: [
        `جلسه هماهنگی برای ${subject.title}.`,
        `دامنه گفتگو: ${subject.summary}.`,
      ],
      minutesLines: [
        `وضعیت ${subject.title} مرور شد.`,
        "تصمیم‌ها، موانع، مسئول هر اقدام و تاریخ پیگیری در صورتجلسه ثبت شد.",
      ],
      physicalLocation: `اتاق جلسه ${itemNumber + 1}`,
      onlineLocation: `https://meet.example.test/${subject.slug}/${runKey}`,
      ownReferral: "لطفا زمینه جلسه و صورتجلسه را بررسی و نظر خود را ثبت کنید.",
      attendeeReferral: "دعوت‌نامه و زمینه جلسه برای اطلاع و اقدام ارسال شد.",
    };
  },
  messageThread({ subject, itemNumber }) {
    return {
      title: `گفتگوی پیام ${itemNumber}`,
      bodyLines: [
        `این پیام برای پیگیری ${subject.title} ارسال شده است.`,
        `زمینه کلیدی: ${subject.summary}.`,
      ],
      replyTitle: `پاسخ گفتگوی پیام ${itemNumber}`,
      replyLines: [
        `پاسخ شامل نکته‌های تکمیلی درباره ${subject.title} است.`,
        "این پیام رابطه والد و فرزند را برای آزمون بازیابی گفتگوها ایجاد می‌کند.",
      ],
      forwardTitle: `ارجاع گفتگوی پیام ${itemNumber}`,
      forwardLines: [
        "این پیام برای اطلاع و پیگیری بیشتر ارجاع شد.",
        "این رکورد رابطه پیام ارجاع‌شده را برای سنجش هوش مصنوعی ایجاد می‌کند.",
      ],
    };
  },
};

export async function getSampleContentProvider() {
  // Later this factory can select an API-backed LLM provider without changing
  // the database seeding flow.
  return staticPersianSampleContentProvider;
}
