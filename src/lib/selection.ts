import { isRecord, parseJsonArray, parsePositiveInteger } from "@/src/lib/input";

export type UserSelection = {
  user_id: number | null;
};

export type PersonSelection = UserSelection & {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isUserSelection(value: unknown): value is UserSelection {
  return (
    isRecord(value) &&
    (value.user_id === null || parsePositiveInteger(value.user_id) !== null)
  );
}

export function isPersonSelection(value: unknown): value is PersonSelection {
  if (!isRecord(value)) return false;

  return (
    (value.user_id === null || parsePositiveInteger(value.user_id) !== null) &&
    parsePositiveInteger(value.id) !== null &&
    isNullableString(value.first_name) &&
    isNullableString(value.last_name) &&
    isNullableString(value.job)
  );
}

export function isIdSelection(value: unknown): value is { id: number } {
  return isRecord(value) && parsePositiveInteger(value.id) !== null;
}

export function parsePersonSelections(value: string | null | undefined) {
  return parseJsonArray(value, isPersonSelection);
}

export function getUniqueUserIds(items: readonly UserSelection[]) {
  return [
    ...new Set(
      items
        .map((item) => parsePositiveInteger(item.user_id))
        .filter((id): id is number => id !== null),
    ),
  ];
}
