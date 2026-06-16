export type CurrentUser = {
  id: number;
  userId: string;
  roleId: number | null;
  photo: string | null;
  displayName: string;
  permissions: CalculatedPermission[];
};

export type CalculatedPermission = {
  id: number;
  code: string;
  title: string;
  source: "role" | "user";
};
