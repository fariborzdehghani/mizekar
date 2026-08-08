export function getSafeInternalPath(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback;

  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || /[\r\n]/.test(path)) {
    return fallback;
  }

  if (path === "/signin" || path.startsWith("/signin?")) return fallback;
  return path;
}

export function setInternalPathQuery(
  path: string,
  key: string,
  value: string,
) {
  const url = new URL(getSafeInternalPath(path), "http://mizekar.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
