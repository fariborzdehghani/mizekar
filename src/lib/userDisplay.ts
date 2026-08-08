export type DisplayUser =
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

export function getUserDisplayName(
  user: DisplayUser,
  { fallbackPrefix = "User" }: { fallbackPrefix?: string } = {},
) {
  const person = user?.persons_persons_user_idTousers?.[0];
  const fullName = [person?.first_name, person?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const job = person?.job?.trim();
  const fallbackName =
    user?.user_id || (user?.id ? `${fallbackPrefix} #${user.id}` : "-");
  const baseName = fullName || fallbackName;

  return job && baseName !== "-" ? `${baseName} - ${job}` : baseName;
}
