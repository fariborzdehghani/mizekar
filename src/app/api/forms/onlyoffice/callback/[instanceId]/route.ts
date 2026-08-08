import fs from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  verifyOnlyOfficeJwt,
  verifySignedResourceToken,
} from "@/src/lib/onlyoffice";
import { parsePositiveInteger, readJsonObject } from "@/src/lib/input";

export const runtime = "nodejs";

function onlyOfficeResponse(error = 0) {
  return Response.json({ error });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/forms/onlyoffice/callback/[instanceId]">,
) {
  const { instanceId } = await context.params;
  const id = parsePositiveInteger(instanceId);
  const callbackToken = request.nextUrl.searchParams.get("token");

  if (!id) {
    return onlyOfficeResponse(1);
  }

  if (!verifySignedResourceToken(callbackToken, "form-callback", id)) {
    return onlyOfficeResponse(1);
  }

  const body = await readJsonObject(request);
  if (!body) {
    return onlyOfficeResponse(1);
  }

  const token = typeof body.token === "string" ? body.token : null;
  const status = typeof body.status === "number" ? body.status : null;
  const documentUrl = typeof body.url === "string" ? body.url : null;

  if (!verifyOnlyOfficeJwt(token)) {
    return onlyOfficeResponse(1);
  }

  if (status !== 2 && status !== 6) {
    return onlyOfficeResponse(0);
  }

  if (!documentUrl) {
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
    const response = await fetch(documentUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
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
