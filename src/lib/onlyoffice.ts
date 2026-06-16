import "server-only";

import crypto from "crypto";

type SignedTokenPayload = {
  purpose: string;
  id: number;
  exp: number;
};

function getSigningSecret() {
  return (
    process.env.ONLYOFFICE_APP_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "mizekar-development-session-secret-change-me"
  );
}

function getOnlyOfficeJwtSecret() {
  return process.env.ONLYOFFICE_JWT_SECRET || "";
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string, secret = getSigningSecret()) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSignedResourceToken(
  purpose: string,
  id: number,
  maxAgeSeconds: number
) {
  const payload = base64UrlEncode(
    JSON.stringify({
      purpose,
      id,
      exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    } satisfies SignedTokenPayload)
  );

  return `${payload}.${sign(payload)}`;
}

export function verifySignedResourceToken(
  token: string | null | undefined,
  purpose: string,
  id: number
) {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SignedTokenPayload;

    return (
      parsed.purpose === purpose &&
      parsed.id === id &&
      parsed.exp >= Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function signOnlyOfficePayload<T extends object>(payload: T) {
  const secret = getOnlyOfficeJwtSecret();
  if (!secret) return "";

  const header = base64UrlEncode(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  );
  const body = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;

  return `${unsignedToken}.${sign(unsignedToken, secret)}`;
}

export function verifyOnlyOfficeJwt(token: string | null | undefined) {
  const secret = getOnlyOfficeJwtSecret();
  if (!secret) return true;
  if (!token) return false;

  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return false;

  const expectedSignature = sign(`${header}.${body}`, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  return (
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

export function getOnlyOfficeDocumentServerUrl() {
  return (process.env.ONLYOFFICE_DOCUMENT_SERVER_URL || "").replace(/\/$/, "");
}
