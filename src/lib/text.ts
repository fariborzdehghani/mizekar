export function normalizeSearchValue(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("fa-IR");
}

export function toLatinDigits(value: string) {
  return value.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (digit) =>
    String(digit.charCodeAt(0) & 0xf),
  );
}
