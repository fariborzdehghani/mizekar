import "server-only";

function decodeNumericHtmlEntity(value: string, radix: 10 | 16) {
  const codePoint = Number.parseInt(value, radix);

  if (!Number.isFinite(codePoint) || codePoint <= 0) return "";

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

export function getPlainText(value: string | null | undefined) {
  return (value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, entityValue: string) =>
      decodeNumericHtmlEntity(entityValue, 16)
    )
    .replace(/&#(\d+);/g, (_match, entityValue: string) =>
      decodeNumericHtmlEntity(entityValue, 10)
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function getPlainTextSnippet(value: string | null | undefined) {
  return getPlainText(value).replace(/\s+/g, " ").slice(0, 140);
}

export function hasRichTextContent(value: string | null | undefined) {
  const content = value || "";
  const plainText = getPlainText(content);

  return plainText.length > 0 || /<(img|table|ul|ol)\b/i.test(content);
}
