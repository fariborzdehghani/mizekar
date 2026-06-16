"use server";

import fs from "fs/promises";
import path from "path";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { requireUser, requireUserId } from "@/src/lib/auth";
import {
  createSignedResourceToken,
  getOnlyOfficeDocumentServerUrl,
  signOnlyOfficePayload,
} from "@/src/lib/onlyoffice";

const FORM_STATUS_DRAFT = 0;
const FORM_STATUS_IN_PROGRESS = 1;
const FORM_STATUS_COMPLETED = 2;
const FORM_STATUS_REJECTED = 3;

const FORM_STEP_PENDING = 0;
const FORM_STEP_ACTIVE = 1;
const FORM_STEP_APPROVED = 2;
const FORM_STEP_REJECTED = 3;

const FORM_REFERRAL_OPEN = 0;
const FORM_REFERRAL_DONE = 1;

type PersonInput = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  user_id: number | null;
};

export type FormTemplateFormState = {
  error?: string;
  success?: string;
};

function getUploadsDir() {
  return path.join(process.cwd(), "public", "uploads");
}

function getStoredFilePath(fileName: string | null | undefined) {
  if (!fileName) return null;
  return path.join(getUploadsDir(), fileName);
}

function getFileExtension(fileName: string | null | undefined) {
  return (fileName?.split(".").pop() || "").toLowerCase();
}

function isWordDocument(fileName: string | null | undefined) {
  const extension = getFileExtension(fileName);
  return extension === "docx" || extension === "doc";
}

async function saveUploadedFile(file: File, creatorId: number) {
  await fs.mkdir(getUploadsDir(), { recursive: true });

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 9);
  const storedFileName = `${timestamp}_${randomSuffix}`;
  const filePath = path.join(getUploadsDir(), storedFileName);
  const bytes = new Uint8Array(await file.arrayBuffer());

  await fs.writeFile(filePath, bytes);

  return prisma.files.create({
    data: {
      file_name: storedFileName,
      file_title: file.name,
      create_date: new Date(),
      creator_id: creatorId,
    },
  });
}

async function copyStoredFile(sourceName: string, title: string, creatorId: number) {
  await fs.mkdir(getUploadsDir(), { recursive: true });

  const sourcePath = path.join(getUploadsDir(), sourceName);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 9);
  const storedFileName = `${timestamp}_${randomSuffix}`;
  const targetPath = path.join(getUploadsDir(), storedFileName);

  await fs.copyFile(sourcePath, targetPath);

  return prisma.files.create({
    data: {
      file_name: storedFileName,
      file_title: title,
      create_date: new Date(),
      creator_id: creatorId,
    },
  });
}

function getUserDisplayName(
  user:
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
    | undefined
) {
  const person = user?.persons_persons_user_idTousers?.[0];
  const fullName = [person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const job = person?.job?.trim();
  const baseName = fullName || user?.user_id || (user?.id ? `کاربر #${user.id}` : "-");

  return job && baseName !== "-" ? `${baseName} - ${job}` : baseName;
}

function getStatusLabel(status: number) {
  if (status === FORM_STATUS_COMPLETED) return "تکمیل شده";
  if (status === FORM_STATUS_REJECTED) return "رد شده";
  if (status === FORM_STATUS_IN_PROGRESS) return "در جریان";
  return "پیش نویس";
}

function getStepStatusLabel(status: number) {
  if (status === FORM_STEP_ACTIVE) return "در انتظار تایید";
  if (status === FORM_STEP_APPROVED) return "تایید شده";
  if (status === FORM_STEP_REJECTED) return "رد شده";
  return "در انتظار";
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export async function getRequestBaseUrl() {
  const configuredUrl =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  if (configuredUrl) return normalizeBaseUrl(configuredUrl);

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") || "http";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function createFormTemplate(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const stepsJson = String(formData.get("steps") || "");
    const file = formData.get("templateFile");

    if (!title) {
      return { success: false, error: "عنوان قالب الزامی است." };
    }

    if (!(file instanceof File) || file.size <= 0) {
      return { success: false, error: "فایل Word الزامی است." };
    }

    if (!isWordDocument(file.name)) {
      return { success: false, error: "فقط فایل‌های .docx و .doc پشتیبانی می‌شوند." };
    }

    let steps: PersonInput[] = [];
    try {
      steps = JSON.parse(stepsJson) as PersonInput[];
    } catch {
      return { success: false, error: "مراحل تایید نامعتبر است." };
    }

    const approverIds = steps
      .map((step) => Number(step.user_id))
      .filter((userId) => Number.isInteger(userId) && userId > 0);

    if (approverIds.length === 0) {
      return { success: false, error: "حداقل یک مرحله تایید الزامی است." };
    }

    const uniqueApproverIds = [...new Set(approverIds)];
    const existingApprovers = await prisma.users.findMany({
      where: { id: { in: uniqueApproverIds } },
      select: { id: true },
    });

    if (existingApprovers.length !== uniqueApproverIds.length) {
      return { success: false, error: "یک یا چند تاییدکننده نامعتبر است." };
    }

    const storedFile = await saveUploadedFile(file, currentUserId);

    await prisma.$transaction(async (tx) => {
      const template = await tx.form_templates.create({
        data: {
          title,
          description: description || null,
          template_file_id: storedFile.id,
          is_active: true,
          create_date: new Date(),
          creator_id: currentUserId,
        },
      });

      await tx.form_process_steps.createMany({
        data: approverIds.map((approverId, index) => ({
          template_id: template.id,
          step_order: index + 1,
          title: `مرحله ${index + 1}`,
          approver_user_id: approverId,
        })),
      });
    });

    revalidatePath("/form-templates");
    revalidatePath("/new-form");

    return { success: true, message: "قالب فرم ایجاد شد." };
  } catch (error) {
    console.error("Error creating form template:", error);
    return { success: false, error: "امکان ایجاد قالب فرم وجود ندارد." };
  }
}

export async function createFormTemplateAction(
  _prevState: FormTemplateFormState,
  formData: FormData
): Promise<FormTemplateFormState> {
  const result = await createFormTemplate(formData);
  return result.success
    ? { success: result.message || "قالب فرم ایجاد شد." }
    : { error: result.error || "امکان ایجاد قالب فرم وجود ندارد." };
}

export async function updateFormTemplateAction(
  _prevState: FormTemplateFormState,
  formData: FormData
): Promise<FormTemplateFormState> {
  try {
    const currentUserId = await requireUserId();
    const templateId = Number(formData.get("id"));
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const isActive = formData.get("isActive") === "on";
    const stepsJson = String(formData.get("steps") || "");
    const file = formData.get("templateFile");

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return { error: "قالب فرم نامعتبر است." };
    }

    if (!title) {
      return { error: "عنوان قالب الزامی است." };
    }

    let steps: PersonInput[] = [];
    try {
      steps = JSON.parse(stepsJson) as PersonInput[];
    } catch {
      return { error: "مراحل تایید نامعتبر است." };
    }

    const approverIds = steps
      .map((step) => Number(step.user_id))
      .filter((userId) => Number.isInteger(userId) && userId > 0);

    if (approverIds.length === 0) {
      return { error: "حداقل یک مرحله تایید الزامی است." };
    }

    const existingTemplate = await prisma.form_templates.findFirst({
      where: { id: templateId, is_deleted: false },
      select: { id: true },
    });

    if (!existingTemplate) {
      return { error: "قالب فرم یافت نشد." };
    }

    const uniqueApproverIds = [...new Set(approverIds)];
    const existingApprovers = await prisma.users.findMany({
      where: { id: { in: uniqueApproverIds } },
      select: { id: true },
    });

    if (existingApprovers.length !== uniqueApproverIds.length) {
      return { error: "یک یا چند تاییدکننده نامعتبر است." };
    }

    let uploadedFileId: number | null = null;
    if (file instanceof File && file.size > 0) {
      if (!isWordDocument(file.name)) {
        return { error: "فقط فایل‌های .docx و .doc پشتیبانی می‌شوند." };
      }

      const storedFile = await saveUploadedFile(file, currentUserId);
      uploadedFileId = storedFile.id;
    }

    await prisma.$transaction(async (tx) => {
      await tx.form_templates.update({
        where: { id: templateId },
        data: {
          title,
          description: description || null,
          is_active: isActive,
          ...(uploadedFileId ? { template_file_id: uploadedFileId } : {}),
        },
      });

      await tx.form_process_steps.deleteMany({
        where: { template_id: templateId },
      });

      await tx.form_process_steps.createMany({
        data: approverIds.map((approverId, index) => ({
          template_id: templateId,
          step_order: index + 1,
          title: `مرحله ${index + 1}`,
          approver_user_id: approverId,
        })),
      });
    });

    revalidatePath("/form-templates");
    revalidatePath("/new-form");

    return { success: "تغییرات قالب فرم ذخیره شد." };
  } catch (error) {
    console.error("Error updating form template:", error);
    return { error: "امکان ذخیره تغییرات قالب فرم وجود ندارد." };
  }
}

export async function deleteFormTemplateAction(formData: FormData) {
  try {
    await requireUserId();
    const templateId = Number(formData.get("id"));

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return;
    }

    await prisma.form_templates.update({
      where: { id: templateId },
      data: {
        is_deleted: true,
        is_active: false,
      },
    });

    revalidatePath("/form-templates");
    revalidatePath("/new-form");
  } catch (error) {
    console.error("Error deleting form template:", error);
  }
}

export async function getFormTemplates() {
  await requireUser();

  const templates = await prisma.form_templates.findMany({
    where: {
      is_deleted: false,
    },
    include: {
      files: true,
      form_process_steps: {
        include: {
          users: {
            include: {
              persons_persons_user_idTousers: {
                select: { id: true, first_name: true, last_name: true, job: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { step_order: "asc" },
      },
    },
    orderBy: { id: "desc" },
  });

  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    isActive: template.is_active,
    fileName: template.files?.file_title || "سند.docx",
    createDate: template.create_date,
    steps: template.form_process_steps.map((step) => ({
      id: step.id,
      order: step.step_order,
      title: step.title,
      approverUserId: step.approver_user_id,
      personId: step.users.persons_persons_user_idTousers[0]?.id || 0,
      firstName: step.users.persons_persons_user_idTousers[0]?.first_name || null,
      lastName: step.users.persons_persons_user_idTousers[0]?.last_name || null,
      job: step.users.persons_persons_user_idTousers[0]?.job || null,
      approverName: getUserDisplayName(step.users),
    })),
  }));
}

export async function createFormInstance(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const templateId = Number(formData.get("templateId"));
    const customTitle = String(formData.get("title") || "").trim();

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return { success: false, error: "قالب فرم نامعتبر است." };
    }

    const template = await prisma.form_templates.findUnique({
      where: { id: templateId },
      include: {
        files: true,
        form_process_steps: { orderBy: { step_order: "asc" } },
      },
    });

    if (
      !template ||
      template.is_deleted ||
      !template.is_active ||
      !template.files?.file_name
    ) {
      return { success: false, error: "قالب فرم یافت نشد." };
    }

    if (template.form_process_steps.length === 0) {
      return { success: false, error: "برای این قالب فرآیند تایید تعریف نشده است." };
    }

    const title = customTitle || template.title;
    const copiedFile = await copyStoredFile(
      template.files.file_name,
      template.files.file_title || `${template.title}.docx`,
      currentUserId
    );

    const instance = await prisma.$transaction(async (tx) => {
      const created = await tx.form_instances.create({
        data: {
          template_id: template.id,
          title,
          creator_id: currentUserId,
          current_file_id: copiedFile.id,
          status: FORM_STATUS_DRAFT,
          create_date: new Date(),
        },
      });

      await tx.form_instance_steps.createMany({
        data: template.form_process_steps.map((step) => ({
          instance_id: created.id,
          step_order: step.step_order,
          title: step.title,
          approver_user_id: step.approver_user_id,
          status: FORM_STEP_PENDING,
        })),
      });

      return created;
    });

    revalidatePath("/new-form");
    revalidatePath("/outgoing-letters");

    return {
      success: true,
      instanceId: instance.id,
      redirectTo: `/form?id=${instance.id}`,
    };
  } catch (error) {
    console.error("Error creating form instance:", error);
    return { success: false, error: "امکان ایجاد فرم وجود ندارد." };
  }
}

export async function submitFormInstance(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const instanceId = Number(formData.get("instanceId"));

    const instance = await prisma.form_instances.findUnique({
      where: { id: instanceId },
      include: {
        form_instance_steps: { orderBy: { step_order: "asc" } },
      },
    });

    if (!instance || instance.creator_id !== currentUserId) {
      return { success: false, error: "شما مجاز به ارسال این فرم نیستید." };
    }

    if (instance.status !== FORM_STATUS_DRAFT) {
      return { success: false, error: "فقط فرم‌های پیش نویس قابل ارسال هستند." };
    }

    const firstStep = instance.form_instance_steps[0];
    if (!firstStep) {
      return { success: false, error: "برای این فرم فرآیند تایید تعریف نشده است." };
    }

    await prisma.$transaction([
      prisma.form_instances.update({
        where: { id: instance.id },
        data: {
          status: FORM_STATUS_IN_PROGRESS,
          current_step_order: firstStep.step_order,
          submit_date: new Date(),
        },
      }),
      prisma.form_instance_steps.update({
        where: { id: firstStep.id },
        data: { status: FORM_STEP_ACTIVE },
      }),
      prisma.form_referrals.create({
        data: {
          instance_id: instance.id,
          sender_id: currentUserId,
          receiver_id: firstStep.approver_user_id,
          date_time: new Date(),
          contents: "برای تایید ارسال شد.",
          status: FORM_REFERRAL_OPEN,
        },
      }),
    ]);

    revalidatePath("/form");
    revalidatePath("/incoming-letters");
    revalidatePath("/outgoing-letters");

    return { success: true, message: "فرم ارسال شد." };
  } catch (error) {
    console.error("Error submitting form:", error);
    return { success: false, error: "امکان ارسال فرم وجود ندارد." };
  }
}

async function getActiveStepForCurrentUser(instanceId: number, currentUserId: number) {
  return prisma.form_instance_steps.findFirst({
    where: {
      instance_id: instanceId,
      approver_user_id: currentUserId,
      status: FORM_STEP_ACTIVE,
      form_instances: {
        status: FORM_STATUS_IN_PROGRESS,
        current_step_order: { not: null },
      },
    },
    include: { form_instances: true },
  });
}

export async function approveFormInstance(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const instanceId = Number(formData.get("instanceId"));
    const comments = String(formData.get("comments") || "").trim();
    const activeStep = await getActiveStepForCurrentUser(instanceId, currentUserId);

    if (!activeStep) {
      return {
        success: false,
        error: "فقط کاربر مرحله فعال تایید می‌تواند این فرم را تایید کند.",
      };
    }

    const nextStep = await prisma.form_instance_steps.findFirst({
      where: {
        instance_id: instanceId,
        step_order: { gt: activeStep.step_order },
      },
      orderBy: { step_order: "asc" },
    });

    await prisma.$transaction(async (tx) => {
      await tx.form_instance_steps.update({
        where: { id: activeStep.id },
        data: {
          status: FORM_STEP_APPROVED,
          action_date: new Date(),
          comments: comments || null,
        },
      });

      await tx.form_referrals.updateMany({
        where: {
          instance_id: instanceId,
          receiver_id: currentUserId,
          status: FORM_REFERRAL_OPEN,
        },
        data: { status: FORM_REFERRAL_DONE },
      });

      if (nextStep) {
        await tx.form_instance_steps.update({
          where: { id: nextStep.id },
          data: { status: FORM_STEP_ACTIVE },
        });
        await tx.form_instances.update({
          where: { id: instanceId },
          data: { current_step_order: nextStep.step_order },
        });
        await tx.form_referrals.create({
          data: {
            instance_id: instanceId,
            sender_id: currentUserId,
            receiver_id: nextStep.approver_user_id,
            date_time: new Date(),
            contents: comments || "تایید شد و به مرحله بعد ارسال شد.",
            status: FORM_REFERRAL_OPEN,
          },
        });
      } else {
        await tx.form_instances.update({
          where: { id: instanceId },
          data: {
            status: FORM_STATUS_COMPLETED,
            current_step_order: null,
            complete_date: new Date(),
          },
        });
      }
    });

    revalidatePath("/form");
    revalidatePath("/incoming-letters");
    revalidatePath("/outgoing-letters");

    return { success: true, message: nextStep ? "فرم تایید شد." : "فرم تکمیل شد." };
  } catch (error) {
    console.error("Error approving form:", error);
    return { success: false, error: "امکان تایید فرم وجود ندارد." };
  }
}

export async function rejectFormInstance(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const instanceId = Number(formData.get("instanceId"));
    const comments = String(formData.get("comments") || "").trim();
    const activeStep = await getActiveStepForCurrentUser(instanceId, currentUserId);

    if (!activeStep) {
      return {
        success: false,
        error: "فقط کاربر مرحله فعال تایید می‌تواند این فرم را رد کند.",
      };
    }

    await prisma.$transaction([
      prisma.form_instance_steps.update({
        where: { id: activeStep.id },
        data: {
          status: FORM_STEP_REJECTED,
          action_date: new Date(),
          comments: comments || null,
        },
      }),
      prisma.form_instances.update({
        where: { id: instanceId },
        data: {
          status: FORM_STATUS_REJECTED,
          current_step_order: null,
          reject_date: new Date(),
        },
      }),
      prisma.form_referrals.updateMany({
        where: {
          instance_id: instanceId,
          receiver_id: currentUserId,
          status: FORM_REFERRAL_OPEN,
        },
        data: { status: FORM_REFERRAL_DONE },
      }),
      prisma.form_referrals.create({
        data: {
          instance_id: instanceId,
          sender_id: currentUserId,
          receiver_id: activeStep.form_instances.creator_id,
          date_time: new Date(),
          contents: comments || "رد شد.",
          status: FORM_REFERRAL_OPEN,
        },
      }),
    ]);

    revalidatePath("/form");
    revalidatePath("/incoming-letters");
    revalidatePath("/outgoing-letters");

    return { success: true, message: "فرم رد شد." };
  } catch (error) {
    console.error("Error rejecting form:", error);
    return { success: false, error: "امکان رد فرم وجود ندارد." };
  }
}

export async function createFormReferral(formData: FormData) {
  try {
    const currentUserId = await requireUserId();
    const instanceId = Number(formData.get("instanceId"));
    const contents = String(formData.get("contents") || "").trim();
    const receiversJson = String(formData.get("receivers") || "");

    const hasAccess = await prisma.form_instances.findFirst({
      where: {
        id: instanceId,
        OR: [
          { creator_id: currentUserId },
          { form_instance_steps: { some: { approver_user_id: currentUserId } } },
          {
            form_referrals: {
              some: {
                OR: [{ sender_id: currentUserId }, { receiver_id: currentUserId }],
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!hasAccess) {
      return { success: false, error: "شما مجاز به ارجاع این فرم نیستید." };
    }

    let receivers: PersonInput[] = [];
    try {
      receivers = JSON.parse(receiversJson) as PersonInput[];
    } catch {
      return { success: false, error: "گیرندگان ارجاع نامعتبر هستند." };
    }

    const receiverIds = [
      ...new Set(
        receivers
          .map((receiver) => Number(receiver.user_id))
          .filter((id) => Number.isInteger(id) && id > 0)
      ),
    ];

    if (receiverIds.length === 0) {
      return { success: false, error: "حداقل یک گیرنده انتخاب کنید." };
    }

    await prisma.form_referrals.createMany({
      data: receiverIds.map((receiverId) => ({
        instance_id: instanceId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        date_time: new Date(),
        contents,
        status: FORM_REFERRAL_OPEN,
      })),
    });

    revalidatePath("/form");
    revalidatePath("/incoming-letters");
    revalidatePath("/outgoing-letters");

    return { success: true, message: "ارجاع ثبت شد." };
  } catch (error) {
    console.error("Error creating form referral:", error);
    return { success: false, error: "امکان ثبت ارجاع وجود ندارد." };
  }
}

export async function getIncomingForms() {
  const currentUserId = await requireUserId();

  const instances = await prisma.form_instances.findMany({
    where: {
      form_archive_items: {
        none: {
          user_id: currentUserId,
        },
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
    include: {
      form_templates: { select: { title: true } },
      users_form_instances_creator_idTousers: {
        include: {
          persons_persons_user_idTousers: {
            select: { first_name: true, last_name: true, job: true },
            take: 1,
          },
        },
      },
      form_instance_steps: true,
      form_referrals: {
        where: {
          receiver_id: currentUserId,
          status: FORM_REFERRAL_OPEN,
        },
        orderBy: { date_time: "desc" },
        take: 1,
      },
    },
    orderBy: [{ submit_date: "desc" }, { create_date: "desc" }],
    take: 100,
  });

  return instances.map((instance) => {
    const activeStep = instance.form_instance_steps.find(
      (step) => step.status === FORM_STEP_ACTIVE
    );

    return {
      id: instance.id,
      title: instance.title,
      templateTitle: instance.form_templates.title,
      status: instance.status,
      statusLabel: getStatusLabel(instance.status),
      createDate: instance.create_date,
      submitDate: instance.submit_date,
      referralDate: instance.form_referrals[0]?.date_time || instance.submit_date,
      readAt: instance.form_referrals[0]?.read_at || null,
      creatorName: getUserDisplayName(instance.users_form_instances_creator_idTousers),
      activeStepOrder: activeStep?.step_order || null,
    };
  });
}

export async function getOutgoingForms() {
  const currentUserId = await requireUserId();

  const instances = await prisma.form_instances.findMany({
    where: {
      form_archive_items: {
        none: {
          user_id: currentUserId,
        },
      },
      OR: [
        { creator_id: currentUserId },
        { form_instance_steps: { some: { approver_user_id: currentUserId } } },
        { form_referrals: { some: { sender_id: currentUserId } } },
      ],
    },
    include: {
      form_templates: { select: { title: true } },
      form_instance_steps: {
        include: {
          users: {
            include: {
              persons_persons_user_idTousers: {
                select: { first_name: true, last_name: true, job: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { step_order: "asc" },
      },
    },
    orderBy: [{ create_date: "desc" }, { id: "desc" }],
    take: 100,
  });

  return instances.map((instance) => {
    const activeStep = instance.form_instance_steps.find(
      (step) => step.status === FORM_STEP_ACTIVE
    );

    return {
      id: instance.id,
      title: instance.title,
      templateTitle: instance.form_templates.title,
      status: instance.status,
      statusLabel: getStatusLabel(instance.status),
      createDate: instance.create_date,
      submitDate: instance.submit_date,
      referralDate: instance.submit_date,
      readAt: null,
      activeStepOrder: activeStep?.step_order || null,
      activeApproverName: activeStep ? getUserDisplayName(activeStep.users) : "-",
    };
  });
}

export async function getFormInstance(instanceId: number, baseUrl: string) {
  const currentUser = await requireUser();
  const documentServerUrl = getOnlyOfficeDocumentServerUrl();

  const instance = await prisma.form_instances.findFirst({
    where: {
      id: instanceId,
      OR: [
        { creator_id: currentUser.id },
        { form_instance_steps: { some: { approver_user_id: currentUser.id } } },
        {
          form_referrals: {
            some: {
              OR: [{ sender_id: currentUser.id }, { receiver_id: currentUser.id }],
            },
          },
        },
      ],
    },
    include: {
      files: true,
      form_templates: { select: { title: true, description: true } },
      users_form_instances_creator_idTousers: {
        include: {
          persons_persons_user_idTousers: {
            select: { first_name: true, last_name: true, job: true },
            take: 1,
          },
        },
      },
      form_instance_steps: {
        include: {
          users: {
            include: {
              persons_persons_user_idTousers: {
                select: { first_name: true, last_name: true, job: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { step_order: "asc" },
      },
      form_referrals: {
        include: {
          users_form_referrals_sender_idTousers: {
            include: {
              persons_persons_user_idTousers: {
                select: { first_name: true, last_name: true, job: true },
                take: 1,
              },
            },
          },
          users_form_referrals_receiver_idTousers: {
            include: {
              persons_persons_user_idTousers: {
                select: { first_name: true, last_name: true, job: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { date_time: "desc" },
      },
    },
  });

  if (!instance) {
    return { success: false, error: "فرم یافت نشد.", form: null };
  }

  const activeStep = instance.form_instance_steps.find(
    (step) => step.status === FORM_STEP_ACTIVE
  );
  const canSubmit =
    instance.status === FORM_STATUS_DRAFT && instance.creator_id === currentUser.id;
  const canApprove =
    instance.status === FORM_STATUS_IN_PROGRESS &&
    activeStep?.approver_user_id === currentUser.id;
  const canEditDocument = canSubmit;
  const hasOpenIncomingReferral = instance.form_referrals.some(
    (referral) =>
      referral.receiver_id === currentUser.id &&
      referral.status === FORM_REFERRAL_OPEN
  );
  const isCurrentApprovalInboxItem =
    instance.status === FORM_STATUS_IN_PROGRESS &&
    activeStep?.approver_user_id === currentUser.id;

  let editorConfig: Record<string, unknown> | null = null;
  let editorError: string | null = null;

  if (!documentServerUrl) {
    editorError = "آدرس سرور ONLYOFFICE تنظیم نشده است.";
  } else if (!instance.files?.file_name || !instance.current_file_id) {
    editorError = "فایل سند فرم یافت نشد.";
  } else {
    const storedFilePath = getStoredFilePath(instance.files.file_name);
    let versionKey = `${instance.id}-${instance.current_file_id}`;

    if (storedFilePath) {
      try {
        const stat = await fs.stat(storedFilePath);
        versionKey = `${versionKey}-${Math.floor(stat.mtimeMs)}`;
      } catch {
        editorError = "امکان خواندن فایل سند فرم وجود ندارد.";
      }
    }

    if (!editorError) {
      const fileToken = createSignedResourceToken(
        "form-file",
        instance.current_file_id,
        12 * 60 * 60
      );
      const callbackToken = createSignedResourceToken(
        "form-callback",
        instance.id,
        24 * 60 * 60
      );
      const fileTitle = instance.files.file_title || `${instance.title}.docx`;
      const fileType = getFileExtension(fileTitle) || "docx";
      const mode = canEditDocument ? "edit" : "view";

      editorConfig = {
        document: {
          fileType,
          key: `form-${versionKey}`,
          title: fileTitle,
          url: `${normalizeBaseUrl(baseUrl)}/api/forms/files/${instance.current_file_id}?token=${encodeURIComponent(fileToken)}`,
          permissions: {
            edit: canEditDocument,
            download: true,
            print: true,
            review: false,
          },
        },
        documentType: "word",
        editorConfig: {
          mode,
          lang: "en",
          callbackUrl: `${normalizeBaseUrl(baseUrl)}/api/forms/onlyoffice/callback/${instance.id}?token=${encodeURIComponent(callbackToken)}`,
          user: {
            id: String(currentUser.id),
            name: currentUser.displayName,
          },
          customization: {
            forcesave: true,
          },
        },
        height: "100%",
        width: "100%",
      };

      const token = signOnlyOfficePayload(editorConfig);
      if (token) editorConfig.token = token;
    }
  }

  return {
    success: true,
    form: {
      id: instance.id,
      title: instance.title,
      templateTitle: instance.form_templates.title,
      templateDescription: instance.form_templates.description,
      status: instance.status,
      statusLabel: getStatusLabel(instance.status),
      currentStepOrder: instance.current_step_order,
      creatorName: getUserDisplayName(instance.users_form_instances_creator_idTousers),
      createDate: instance.create_date,
      submitDate: instance.submit_date,
      completeDate: instance.complete_date,
      rejectDate: instance.reject_date,
      canSubmit,
      canApprove,
      canRefer: hasOpenIncomingReferral || isCurrentApprovalInboxItem,
      canEditDocument,
      activeStep: activeStep
        ? {
            id: activeStep.id,
            order: activeStep.step_order,
            approverName: getUserDisplayName(activeStep.users),
          }
        : null,
      steps: instance.form_instance_steps.map((step) => ({
        id: step.id,
        order: step.step_order,
        title: step.title,
        approverName: getUserDisplayName(step.users),
        status: step.status,
        statusLabel: getStepStatusLabel(step.status),
        actionDate: step.action_date,
        comments: step.comments,
      })),
      referrals: instance.form_referrals.map((referral) => ({
        id: referral.id,
        senderName: getUserDisplayName(
          referral.users_form_referrals_sender_idTousers
        ),
        receiverName: getUserDisplayName(
          referral.users_form_referrals_receiver_idTousers
        ),
        contents: referral.contents,
        dateTime: referral.date_time,
        status: referral.status,
      })),
      documentServerUrl,
      editorConfig,
      editorError,
    },
  };
}
