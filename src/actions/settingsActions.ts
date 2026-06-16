"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { hashPassword } from "@/src/lib/password";
import { revalidatePath } from "next/cache";

export type UserFormState = {
  error?: string;
  success?: string;
};

export type RoleFormState = {
  error?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readText(formData, key);

  if (!value) return null;

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function getUserNameParts(formData: FormData) {
  return {
    firstName: readText(formData, "firstName"),
    lastName: readText(formData, "lastName"),
    job: readText(formData, "job"),
  };
}

function readPermissionIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("permissionIds")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
}

async function getExistingPermissionIds(permissionIds: number[]) {
  if (permissionIds.length === 0) return [];

  const permissions = await prisma.permissions_defination.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });

  return permissions.map((permission) => permission.id);
}

export async function updateGeneralSetting(formData: FormData) {
  await requireUser();

  const ids = formData.getAll("id");
  const values = formData.getAll("value");

  if (ids.length !== values.length) {
    console.error("Mismatched general setting form data");
    return;
  }

  try {
    await prisma.$transaction(
      ids.map((rawId, index) => {
        const id = Number(rawId);

        if (!Number.isInteger(id) || id <= 0) {
          throw new Error(`Invalid general setting id: ${String(rawId)}`);
        }

        return prisma.general_settings.update({
          where: { id },
          data: { value: String(values[index] ?? "") },
        });
      })
    );

    revalidatePath("/settings/general");
  } catch (error) {
    console.error("Error updating general setting:", error);
  }
}

export async function createUserAction(
  _previousState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const currentUser = await requireUser();
  const username = readText(formData, "userId");
  const password = String(formData.get("password") || "");
  const roleId = readOptionalNumber(formData, "roleId");
  const permissionIds = await getExistingPermissionIds(
    readPermissionIds(formData)
  );
  const { firstName, lastName, job } = getUserNameParts(formData);

  if (!username) {
    return { error: "نام کاربری را وارد کنید." };
  }

  if (password.length < 8) {
    return { error: "رمز عبور باید حداقل ۸ کاراکتر باشد." };
  }

  const existingUser = await prisma.users.findFirst({
    where: { user_id: username },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "این نام کاربری قبلا ثبت شده است." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          user_id: username,
          password: hashPassword(password),
          role_id: roleId,
          creator_id: currentUser.id,
          create_date: new Date(),
        },
        select: { id: true },
      });

      if (firstName || lastName || job) {
        await tx.persons.create({
          data: {
            first_name: firstName,
            last_name: lastName,
            job,
            user_id: user.id,
            creator_id: currentUser.id,
            create_date: new Date(),
          },
        });
      }

      if (permissionIds.length > 0) {
        await tx.users_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            user_id: user.id,
            permission_id: permissionId,
          })),
        });
      }
    });

    revalidatePath("/settings/users");
    return { success: "کاربر جدید ثبت شد." };
  } catch (error) {
    console.error("Error creating user:", error);
    return { error: "خطا در ثبت کاربر. دوباره تلاش کنید." };
  }
}

export async function updateUserAction(
  _previousState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const currentUser = await requireUser();
  const id = Number(formData.get("id"));
  const username = readText(formData, "userId");
  const password = String(formData.get("password") || "");
  const roleId = readOptionalNumber(formData, "roleId");
  const permissionIds = await getExistingPermissionIds(
    readPermissionIds(formData)
  );
  const { firstName, lastName, job } = getUserNameParts(formData);

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "شناسه کاربر معتبر نیست." };
  }

  if (!username) {
    return { error: "نام کاربری را وارد کنید." };
  }

  if (password && password.length < 8) {
    return { error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد." };
  }

  const duplicateUser = await prisma.users.findFirst({
    where: {
      user_id: username,
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicateUser) {
    return { error: "این نام کاربری برای کاربر دیگری ثبت شده است." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { id },
        select: {
          id: true,
          persons_persons_user_idTousers: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      await tx.users.update({
        where: { id },
        data: {
          user_id: username,
          role_id: roleId,
          ...(password ? { password: hashPassword(password) } : {}),
        },
      });

      const person = user.persons_persons_user_idTousers[0];

      if (person) {
        await tx.persons.update({
          where: { id: person.id },
          data: {
            first_name: firstName,
            last_name: lastName,
            job,
          },
        });
      } else if (firstName || lastName || job) {
        await tx.persons.create({
          data: {
            first_name: firstName,
            last_name: lastName,
            job,
            user_id: id,
            creator_id: currentUser.id,
            create_date: new Date(),
          },
        });
      }

      await tx.users_permissions.deleteMany({
        where: { user_id: id },
      });

      if (permissionIds.length > 0) {
        await tx.users_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            user_id: id,
            permission_id: permissionId,
          })),
        });
      }
    });

    revalidatePath("/settings/users");
    revalidatePath("/");
    return { success: "اطلاعات کاربر ذخیره شد." };
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return { error: "کاربر یافت نشد." };
    }

    console.error("Error updating user:", error);
    return { error: "خطا در ذخیره کاربر. دوباره تلاش کنید." };
  }
}

export async function createRoleAction(
  _previousState: RoleFormState,
  formData: FormData
): Promise<RoleFormState> {
  await requireUser();

  const title = readText(formData, "title");
  const permissionIds = await getExistingPermissionIds(
    readPermissionIds(formData)
  );

  if (!title) {
    return { error: "عنوان نقش را وارد کنید." };
  }

  const duplicateRole = await prisma.roles.findFirst({
    where: { title },
    select: { id: true },
  });

  if (duplicateRole) {
    return { error: "این عنوان نقش قبلا ثبت شده است." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const role = await tx.roles.create({
        data: { title },
        select: { id: true },
      });

      if (permissionIds.length > 0) {
        await tx.roles_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: role.id,
            permission_id: permissionId,
          })),
        });
      }
    });

    revalidatePath("/settings/users");
    return { success: "نقش جدید ثبت شد." };
  } catch (error) {
    console.error("Error creating role:", error);
    return { error: "خطا در ثبت نقش. دوباره تلاش کنید." };
  }
}

export async function updateRoleAction(
  _previousState: RoleFormState,
  formData: FormData
): Promise<RoleFormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  const title = readText(formData, "title");
  const permissionIds = await getExistingPermissionIds(
    readPermissionIds(formData)
  );

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "شناسه نقش معتبر نیست." };
  }

  if (!title) {
    return { error: "عنوان نقش را وارد کنید." };
  }

  const duplicateRole = await prisma.roles.findFirst({
    where: {
      title,
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicateRole) {
    return { error: "این عنوان نقش برای نقش دیگری ثبت شده است." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const role = await tx.roles.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!role) {
        throw new Error("ROLE_NOT_FOUND");
      }

      await tx.roles.update({
        where: { id },
        data: { title },
      });

      await tx.roles_permissions.deleteMany({
        where: { role_id: id },
      });

      if (permissionIds.length > 0) {
        await tx.roles_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: id,
            permission_id: permissionId,
          })),
        });
      }
    });

    revalidatePath("/settings/users");
    revalidatePath("/");
    return { success: "اطلاعات نقش ذخیره شد." };
  } catch (error) {
    if (error instanceof Error && error.message === "ROLE_NOT_FOUND") {
      return { error: "نقش یافت نشد." };
    }

    console.error("Error updating role:", error);
    return { error: "خطا در ذخیره نقش. دوباره تلاش کنید." };
  }
}

export async function deleteRoleAction(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  try {
    const assignedUsers = await prisma.users.count({
      where: { role_id: id },
    });

    if (assignedUsers > 0) {
      console.error("Cannot delete role assigned to users:", id);
      return;
    }

    await prisma.$transaction([
      prisma.roles_permissions.deleteMany({
        where: { role_id: id },
      }),
      prisma.roles.delete({
        where: { id },
      }),
    ]);

    revalidatePath("/settings/users");
  } catch (error) {
    console.error("Error deleting role:", error);
  }
}

export async function deleteUserAction(formData: FormData) {
  const currentUser = await requireUser();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0 || id === currentUser.id) {
    return;
  }

  try {
    await prisma.$transaction([
      prisma.users_permissions.deleteMany({
        where: { user_id: id },
      }),
      prisma.users.delete({
        where: { id },
      }),
    ]);

    revalidatePath("/settings/users");
  } catch (error) {
    console.error("Error deleting user:", error);
  }
}
