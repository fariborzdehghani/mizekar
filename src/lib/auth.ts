import "server-only";

import crypto from "crypto";
import fs from "fs/promises";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-constants";
import type { CalculatedPermission, CurrentUser } from "@/src/lib/auth-types";
import {
  getProfilePhotoFilePath,
  isSafeProfilePhotoFileName,
} from "@/src/lib/profilePhotos";
import { prisma } from "@/src/lib/prisma";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type SessionPayload = {
  userId: number;
  roleId: number | null;
  expiresAt: number;
  permissions?: CalculatedPermission[];
};

function getSessionSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "mizekar-development-session-secret-change-me"
  );
}

function parseBooleanFlag(value: string | undefined) {
  if (!value) return null;

  const normalizedValue = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalizedValue)) return true;
  if (["0", "false", "no", "off"].includes(normalizedValue)) return false;

  return null;
}

function shouldUseSecureSessionCookie() {
  const explicitValue = parseBooleanFlag(process.env.AUTH_COOKIE_SECURE);
  if (explicitValue !== null) return explicitValue;

  const publicUrl =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (!publicUrl) return false;

  try {
    return new URL(publicUrl).protocol === "https:";
  } catch {
    return false;
  }
}

function getSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureSessionCookie(),
    path: "/",
    maxAge,
  };
}

function signPayload(encodedPayload: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return (
    aBuffer.length === bBuffer.length &&
    crypto.timingSafeEqual(aBuffer, bBuffer)
  );
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionPayload;

    if (
      !Number.isInteger(payload.userId) ||
      payload.userId <= 0 ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getCalculatedUserPermissions(
  userId: number,
  roleId: number | null
) {
  const finalPermissions = new Map<number, CalculatedPermission>();

  if (roleId) {
    const rolePermissions = await prisma.roles_permissions.findMany({
      where: { role_id: roleId },
      orderBy: { id: "asc" },
      select: {
        permissions_defination: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    for (const rolePermission of rolePermissions) {
      const permission = rolePermission.permissions_defination;
      if (!permission) continue;

      finalPermissions.set(permission.id, {
        id: permission.id,
        code: permission.code || String(permission.id),
        title: permission.title || permission.code || `Permission ${permission.id}`,
        source: "role",
      });
    }
  }

  const userPermissions = await prisma.users_permissions.findMany({
    where: { user_id: userId },
    orderBy: { id: "asc" },
    select: {
      permissions_defination: {
        select: {
          id: true,
          code: true,
          title: true,
        },
      },
    },
  });

  for (const userPermission of userPermissions) {
    const permission = userPermission.permissions_defination;
    if (!permission || finalPermissions.has(permission.id)) continue;

    finalPermissions.set(permission.id, {
      id: permission.id,
      code: permission.code || String(permission.id),
      title: permission.title || permission.code || `Permission ${permission.id}`,
      source: "user",
    });
  }

  return Array.from(finalPermissions.values());
}

export async function createSession(
  user: { id: number; role_id: number | null },
  permissions: CalculatedPermission[] = []
) {
  const session = encodeSession({
    userId: user.id,
    roleId: user.role_id,
    permissions,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    session,
    getSessionCookieOptions(SESSION_MAX_AGE_SECONDS)
  );
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
}

export async function getSession() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return decodeSession(sessionCookie);
}

function getDisplayName(user: {
  id: number;
  user_id: string | null;
  persons_persons_user_idTousers: Array<{
    first_name: string | null;
    last_name: string | null;
  }>;
}) {
  const person = user.persons_persons_user_idTousers[0];
  const fullName = [person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.user_id || `User #${user.id}`;
}

async function getExistingProfilePhoto(photo: string | null) {
  if (!photo?.startsWith("/uploads/profiles/")) return photo;

  const fileName = photo.split("/").pop() || "";
  if (!isSafeProfilePhotoFileName(fileName)) return null;

  try {
    await fs.access(getProfilePhotoFilePath(fileName));
    return photo;
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.users.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      user_id: true,
      role_id: true,
      photo: true,
      persons_persons_user_idTousers: {
        select: {
          first_name: true,
          last_name: true,
        },
        take: 1,
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    userId: user.user_id || String(user.id),
    roleId: user.role_id,
    photo: await getExistingProfilePhoto(user.photo),
    displayName: getDisplayName(user),
    permissions: session.permissions || [],
  };
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}
