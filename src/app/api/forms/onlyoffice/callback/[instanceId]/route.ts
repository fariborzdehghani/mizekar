import fs from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  verifyOnlyOfficeJwt,
  verifySignedResourceToken,
} from "@/src/lib/onlyoffice";

export const runtime = "nodejs";

type OnlyOfficeCallbackBody = {
  status?: number;
  url?: string;
  token?: string;
};

function onlyOfficeResponse(error = 0) {
  return Response.json({ error });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await context.params;
  const id = Number(instanceId);
  const callbackToken = request.nextUrl.searchParams.get("token");

  if (!Number.isInteger(id) || id <= 0) {
    return onlyOfficeResponse(1);
  }

  if (!verifySignedResourceToken(callbackToken, "form-callback", id)) {
    return onlyOfficeResponse(1);
  }

  let body: OnlyOfficeCallbackBody;
  try {
    body = (await request.json()) as OnlyOfficeCallbackBody;
  } catch {
    return onlyOfficeResponse(1);
  }

  if (!verifyOnlyOfficeJwt(body.token)) {
    return onlyOfficeResponse(1);
  }

  if (body.status !== 2 && body.status !== 6) {
    return onlyOfficeResponse(0);
  }

  if (!body.url) {
    return onlyOfficeResponse(1);
  }

  const instance = await prisma.form_instances.findUnique({
    where: { id },
    include: { files: true },
  });

  if (!instance?.files?.file_name) {
    return onlyOfficeResponse(1);
  }

  try {
    const response = await fetch(body.url);
    if (!response.ok) return onlyOfficeResponse(1);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      instance.files.file_name
    );

    await fs.writeFile(filePath, bytes);
    return onlyOfficeResponse(0);
  } catch (error) {
    console.error("ONLYOFFICE callback save failed:", error);
    return onlyOfficeResponse(1);
  }
}
