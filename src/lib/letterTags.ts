export const MAX_LETTER_TAGS = 12;
export const MAX_LETTER_TAG_LENGTH = 60;

export type LetterKeywordTag = {
  id?: number;
  name: string;
};

export function normalizeLetterTagName(value: string) {
  return value
    .replace(/^#+/, "")
    .replace(/[،,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LETTER_TAG_LENGTH);
}

export function normalizeLetterTagKey(value: string) {
  return normalizeLetterTagName(value)
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase("fa-IR");
}

export function uniqueLetterTagNames(values: string[]) {
  const tagsByKey = new Map<string, string>();

  for (const value of values) {
    const name = normalizeLetterTagName(value);
    const key = normalizeLetterTagKey(name);

    if (!name || !key || tagsByKey.has(key)) continue;

    tagsByKey.set(key, name);
  }

  return Array.from(tagsByKey.values()).slice(0, MAX_LETTER_TAGS);
}

export function parseLetterTagsJson(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (Array.isArray(parsedValue)) {
      return uniqueLetterTagNames(
        parsedValue
          .map((tag) => {
            if (typeof tag === "string") return tag;
            if (tag && typeof tag === "object") {
              const name = (tag as { name?: unknown }).name;
              return typeof name === "string" ? name : "";
            }
            return "";
          })
          .filter(Boolean)
      );
    }
  } catch {
    return uniqueLetterTagNames(value.split(/[،,\n]/));
  }

  return [];
}
