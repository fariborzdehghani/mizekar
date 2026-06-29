import fs from "fs/promises";
import {
  getProfilePhotoFilePath,
  isSafeProfilePhotoFileName,
} from "@/src/lib/profilePhotos";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getContentType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension
    ? CONTENT_TYPES[extension] || "application/octet-stream"
    : "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const { fileName } = await params;

  if (!isSafeProfilePhotoFileName(fileName)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(getProfilePhotoFilePath(fileName));

    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": getContentType(fileName),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
