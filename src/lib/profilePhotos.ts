import "server-only";

import path from "path";

const PROFILE_PHOTO_URL_PREFIX = "/uploads/profiles";

export function getProfilePhotoStorageDir() {
  return (
    process.env.PROFILE_UPLOAD_DIR ||
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "public",
      "uploads",
      "profiles"
    )
  );
}

export function getProfilePhotoPublicPath(fileName: string) {
  return `${PROFILE_PHOTO_URL_PREFIX}/${fileName}`;
}

export function getProfilePhotoFilePath(fileName: string) {
  return path.join(getProfilePhotoStorageDir(), fileName);
}

export function isSafeProfilePhotoFileName(fileName: string) {
  return (
    /^[A-Za-z0-9_.-]+\.(jpe?g|png|webp)$/i.test(fileName) &&
    path.basename(fileName) === fileName
  );
}
