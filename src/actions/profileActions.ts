"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/src/lib/auth";
import { hashPassword, verifyPassword } from "@/src/lib/password";
import { prisma } from "@/src/lib/prisma";

export type ProfileFormState = {
  error?: string;
  success?: string;
};

const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function readText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function getFileExtension(file: File) {
  const extension = path.extname(file.name).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension;
  }

  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";

  return ".jpg";
}

async function saveProfilePhoto(file: File, userId: number) {
  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    throw new Error("حجم تصویر پروفایل نباید بیشتر از ۲ مگابایت باشد.");
  }

  if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
    throw new Error("فرمت تصویر پروفایل باید JPG، PNG یا WebP باشد.");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "profiles");
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileName = `${userId}_${Date.now()}${getFileExtension(file)}`;
  const filePath = path.join(uploadsDir, fileName);
  const bytes = new Uint8Array(await file.arrayBuffer());

  await fs.writeFile(filePath, bytes);

  return `/uploads/profiles/${fileName}`;
}

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const currentUserId = await requireUserId();
  const firstName = readText(formData, "firstName");
  const lastName = readText(formData, "lastName");
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const photo = formData.get("photo");

  if (!firstName && !lastName) {
    return { error: "نام یا نام خانوادگی را وارد کنید." };
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        password: true,
        persons_persons_user_idTousers: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return { error: "کاربر یافت نشد." };
    }

    const userUpdate: { photo?: string; password?: string } = {};

    if (photo instanceof File && photo.size > 0) {
      userUpdate.photo = await saveProfilePhoto(photo, currentUserId);
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: "برای تغییر رمز عبور، همه فیلدهای رمز را کامل کنید." };
      }

      if (newPassword.length < 8) {
        return { error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد." };
      }

      if (newPassword !== confirmPassword) {
        return { error: "تکرار رمز عبور جدید با رمز عبور مطابقت ندارد." };
      }

      if (!verifyPassword(currentPassword, user.password)) {
        return { error: "رمز عبور فعلی درست نیست." };
      }

      userUpdate.password = hashPassword(newPassword);
    }

    const person = user.persons_persons_user_idTousers[0];

    await prisma.$transaction([
      person
        ? prisma.persons.update({
            where: { id: person.id },
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          })
        : prisma.persons.create({
            data: {
              first_name: firstName,
              last_name: lastName,
              user_id: currentUserId,
              creator_id: currentUserId,
              create_date: new Date(),
            },
          }),
      ...(Object.keys(userUpdate).length > 0
        ? [
            prisma.users.update({
              where: { id: currentUserId },
              data: userUpdate,
            }),
          ]
        : []),
    ]);

    revalidatePath("/");
    revalidatePath("/profile");

    return { success: "پروفایل با موفقیت ذخیره شد." };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }

    console.error("Error updating profile:", error);
    return { error: "خطا در ذخیره پروفایل. دوباره تلاش کنید." };
  }
}
