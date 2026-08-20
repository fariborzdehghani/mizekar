import crypto from "crypto";
import { prisma } from "@/src/lib/prisma";
import { isRecord } from "@/src/lib/input";
import { readOptionalEnv } from "@/src/lib/env";

function authorized(request: Request) {
  const expectedValue = readOptionalEnv("KNOWLEDGE_INVITATION_API_KEY") || "";
  const authorization = request.headers.get("authorization");
  const actualValue = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expected = Buffer.from(expectedValue);
  const actual = Buffer.from(actualValue);
  return Boolean(expectedValue) && actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function validInvitationUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const recipientUsername = text(body.recipientUsername, 120);
  const projectName = text(body.projectName, 300);
  const externalReference = text(body.externalReference, 200);
  const formName = text(body.formName, 300);
  const invitationUrl = validInvitationUrl(text(body.invitationUrl, 2000));
  const expiresAt = new Date(text(body.expiresAt, 100));
  if (!recipientUsername || !projectName || !formName || !invitationUrl || Number.isNaN(expiresAt.getTime())) {
    return Response.json({ error: "Required invitation fields are invalid" }, { status: 400 });
  }

  const [recipient, sender] = await Promise.all([
    prisma.users.findFirst({ where: { user_id: recipientUsername }, select: { id: true } }),
    prisma.users.findFirst({ where: { user_id: readOptionalEnv("KNOWLEDGE_INVITATION_SENDER_USERNAME") || "admin" }, select: { id: true } }),
  ]);
  if (!recipient) return Response.json({ error: "Recipient username was not found" }, { status: 404 });
  if (!sender) return Response.json({ error: "Notification sender was not found" }, { status: 503 });

  const safeProject = escapeHtml(projectName);
  const safeForm = escapeHtml(formName);
  const safeReference = escapeHtml(externalReference || "—");
  const safeUrl = escapeHtml(invitationUrl);
  const expiry = escapeHtml(expiresAt.toLocaleString("fa-IR"));
  const contents = `<p>پروژه <strong>${safeProject}</strong> به پایان رسیده است. لطفاً تجربه و دانش خود را برای فرم «${safeForm}» ثبت کنید.</p><p>شناسه پروژه: <strong>${safeReference}</strong></p><p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">شروع گفت‌وگو و ثبت دانش</a></p><p>این پیوند تا ${expiry} معتبر است و برای شروع نیازی به ورود به دانشیار ندارد.</p>`;
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.messages.create({ data: { title: `دعوت به ثبت دانش پروژه: ${projectName}`, contents, importance: 2, sender_id: sender.id, create_date: new Date() }, select: { id: true } });
    await tx.message_recipients.create({ data: { message_id: created.id, user_id: recipient.id } });
    return created;
  });

  return Response.json({ data: { messageId: message.id } }, { status: 201 });
}
