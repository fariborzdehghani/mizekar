import "server-only";

import { readOptionalEnv } from "@/src/lib/env";

const PROFILE_PHOTO_URL_PREFIX = "/uploads/profiles";

export function getProfilePhotoStorageDir() {
  return (readOptionalEnv("PROFILE_UPLOAD_DIR") || "public/uploads/profiles").replace(
    /[\\/]+$/,
    "",
  );
}

export function getProfilePhotoPublicPath(fileName: string) {
  return `${PROFILE_PHOTO_URL_PREFIX}/${fileName}`;
}

export function getProfilePhotoFilePath(fileName: string) {
  return `${getProfilePhotoStorageDir()}/${fileName}`;
}

export function isSafeProfilePhotoFileName(fileName: string) {
  return (
    /^[A-Za-z0-9_.-]+\.(jpe?g|png|webp)$/i.test(fileName) &&
    !fileName.includes("..")
  );
}
