import "server-only";

import crypto from "crypto";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");

  return `scrypt$${salt}$${key}`;
}

function verifyScryptPassword(password: string, storedPassword: string) {
  const [, salt, key] = storedPassword.split("$");
  if (!salt || !/^[a-f0-9]+$/i.test(key) || key.length % 2 !== 0) return false;

  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length === 0) return false;
  const derivedKey = crypto.scryptSync(password, salt, keyBuffer.length);

  return (
    keyBuffer.length === derivedKey.length &&
    crypto.timingSafeEqual(keyBuffer, derivedKey)
  );
}

function timingSafeStringEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

export function needsPasswordRehash(storedPassword: string | null | undefined) {
  return Boolean(storedPassword && !storedPassword.startsWith("scrypt$"));
}

function verifySha256Password(password: string, storedPassword: string) {
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const hashBuffer = Buffer.from(hash);
  const storedBuffer = Buffer.from(storedPassword);

  return (
    hashBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(hashBuffer, storedBuffer)
  );
}

export function verifyPassword(
  password: string,
  storedPassword: string | null | undefined
) {
  if (!storedPassword) return false;

  if (storedPassword.startsWith("scrypt$")) {
    return verifyScryptPassword(password, storedPassword);
  }

  if (/^[a-f0-9]{64}$/i.test(storedPassword)) {
    return verifySha256Password(password, storedPassword);
  }

  return timingSafeStringEqual(password, storedPassword);
}
