import fs from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { verifySignedResourceToken } from "@/src/lib/onlyoffice";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function getMimeType(fileName: string | null | undefined) {
  const extension = (fileName?.split(".").pop() || "").toLowerCase();
  return MIME_TYPES[extension] || "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const id = Number(fileId);
  const token = request.nextUrl.searchParams.get("token");

  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Invalid file id", { status: 400 });
  }

  if (!verifySignedResourceToken(token, "form-file", id)) {
    return new Response("Invalid token", { status: 403 });
  }

  const fileRecord = await prisma.files.findUnique({ where: { id } });
  if (!fileRecord?.file_name) {
    return new Response("File not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", fileRecord.file_name);

  try {
    const content = await fs.readFile(filePath);
    return new Response(content, {
      headers: {
        "Content-Type": getMimeType(fileRecord.file_title),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          fileRecord.file_title || "form.docx"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
