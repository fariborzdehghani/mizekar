"use server";

import fs from "fs/promises";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/src/lib/auth";
import { hashPassword, verifyPassword } from "@/src/lib/password";
import {
  getProfilePhotoFilePath,
  getProfilePhotoPublicPath,
  getProfilePhotoStorageDir,
} from "@/src/lib/profilePhotos";
import { prisma } from "@/src/lib/prisma";
import { getPublicErrorMessage, PublicError, reportError } from "@/src/lib/errors";
import { readFormText } from "@/src/lib/input";

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

const PROFILE_PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function hasExpectedImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    );
  }

  if (mimeType === "image/webp") {
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

async function saveProfilePhoto(file: File, userId: number) {
  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    throw new PublicError("حجم تصویر پروفایل نباید بیشتر از ۲ مگابایت باشد.");
  }

  if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
    throw new PublicError("فرمت تصویر پروفایل باید JPG، PNG یا WebP باشد.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedImageSignature(bytes, file.type)) {
    throw new PublicError("محتوای فایل با فرمت تصویر انتخاب‌شده مطابقت ندارد.");
  }

  await fs.mkdir(getProfilePhotoStorageDir(), { recursive: true });

  const fileName = `${userId}_${crypto.randomUUID()}${PROFILE_PHOTO_EXTENSIONS[file.type]}`;

  await fs.writeFile(getProfilePhotoFilePath(fileName), bytes);

  return getProfilePhotoPublicPath(fileName);
}

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const currentUserId = await requireUserId();
  const firstName = readFormText(formData, "firstName");
  const lastName = readFormText(formData, "lastName");
  const currentPassword = readFormText(formData, "currentPassword", { trim: false });
  const newPassword = readFormText(formData, "newPassword", { trim: false });
  const confirmPassword = readFormText(formData, "confirmPassword", { trim: false });
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
    reportError("profile.update", error);
    return {
      error: getPublicErrorMessage(
        error,
        "خطا در ذخیره پروفایل. دوباره تلاش کنید.",
      ),
    };
  }
}
