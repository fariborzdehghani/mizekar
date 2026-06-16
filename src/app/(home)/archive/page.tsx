import {
  getArchivedItems,
  getLetterArchiveFolders,
} from "@/src/actions/archiveActions";
import ArchivedLettersList from "@/src/components/app/letters/ArchivedLettersList";

interface ArchivePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const params = await searchParams;
  const rawFolderId = Array.isArray(params.folderId)
    ? params.folderId[0]
    : params.folderId;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const folderId = rawFolderId ? Number(rawFolderId) : null;

  const [foldersResult, archivedResult] = await Promise.all([
    getLetterArchiveFolders(),
    getArchivedItems(folderId),
  ]);

  return (
    <ArchivedLettersList
      folders={foldersResult.folders}
      selectedFolderId={archivedResult.selectedFolder?.id || null}
      selectedFolderTitle={archivedResult.selectedFolder?.title || null}
      items={archivedResult.items}
      searchQuery={rawQuery?.trim() || ""}
      error={archivedResult.success ? undefined : archivedResult.error}
    />
  );
}
