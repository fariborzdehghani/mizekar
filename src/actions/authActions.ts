"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  deleteSession,
  getCalculatedUserPermissions,
} from "@/src/lib/auth";
import { verifyPassword } from "@/src/lib/password";
import { prisma } from "@/src/lib/prisma";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "نام کاربری و رمز عبور را وارد کنید." };
  }

  const user = await prisma.users.findFirst({
    where: { user_id: username },
    select: {
      id: true,
      role_id: true,
      password: true,
    },
  });

  if (!user || !verifyPassword(password, user.password)) {
    return { error: "نام کاربری یا رمز عبور درست نیست." };
  }

  const permissions = await getCalculatedUserPermissions(user.id, user.role_id);

  await createSession(user, permissions);
  redirect("/?brief=login");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/signin");
}
