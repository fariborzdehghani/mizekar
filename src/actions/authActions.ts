"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  deleteSession,
} from "@/src/lib/auth";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "@/src/lib/password";
import { prisma } from "@/src/lib/prisma";
import { readFormText } from "@/src/lib/input";
import { getSafeInternalPath, setInternalPathQuery } from "@/src/lib/navigation";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = readFormText(formData, "username");
  const password = readFormText(formData, "password", { trim: false });
  const redirectTo = getSafeInternalPath(readFormText(formData, "redirectTo"));

  if (!username || !password) {
    return { error: "نام کاربری و رمز عبور را وارد کنید." };
  }

  const user = await prisma.users.findFirst({
    where: { user_id: username },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user || !verifyPassword(password, user.password)) {
    return { error: "نام کاربری یا رمز عبور درست نیست." };
  }

  if (needsPasswordRehash(user.password)) {
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashPassword(password) },
    });
  }

  await createSession(user);
  redirect(setInternalPathQuery(redirectTo, "brief", "login"));
}

export async function logoutAction() {
  await deleteSession();
  redirect("/signin");
}
