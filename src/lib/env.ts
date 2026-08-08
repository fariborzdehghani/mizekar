import "server-only";

export function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export function readFirstEnv(names: readonly string[]) {
  for (const name of names) {
    const value = readOptionalEnv(name);
    if (value) return value;
  }

  return null;
}

export function readRequiredEnv(name: string) {
  const value = readOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function readPositiveIntegerEnv(name: string) {
  const value = readRequiredEnv(name);
  const numberValue = Number(value);

  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return numberValue;
}

export function readBooleanEnv(name: string, fallback: boolean) {
  const value = readOptionalEnv(name);
  if (!value) return fallback;

  const normalizedValue = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalizedValue)) return true;
  if (["0", "false", "no", "off"].includes(normalizedValue)) return false;

  throw new Error(`Environment variable ${name} must be a boolean`);
}

export function readSecret(
  names: readonly string[],
  developmentFallback: string,
) {
  const value = readFirstEnv(names);
  if (value) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Missing required production secret: configure one of ${names.join(", ")}`,
    );
  }

  return developmentFallback;
}
