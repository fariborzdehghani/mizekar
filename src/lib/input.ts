export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonNullable<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function readFormText(
  formData: FormData,
  key: string,
  { trim = true }: { trim?: boolean } = {},
) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return trim ? value.trim() : value;
}

export function parseInteger(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

export function parsePositiveInteger(value: unknown): number | null {
  const parsedValue = parseInteger(value);
  return parsedValue !== null && parsedValue > 0 ? parsedValue : null;
}

export function readPositiveInteger(formData: FormData, key: string) {
  return parsePositiveInteger(formData.get(key));
}

export function readInteger(formData: FormData, key: string) {
  return parseInteger(formData.get(key));
}

export function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function parseJsonArray<T>(
  value: string | null | undefined,
  isItem: (item: unknown) => item is T,
): T[] | null {
  if (!value) return null;

  const parsedValue = parseJson(value);
  return Array.isArray(parsedValue) && parsedValue.every(isItem)
    ? parsedValue
    : null;
}

export async function readJsonObject(request: Request) {
  try {
    const value = (await request.json()) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}
