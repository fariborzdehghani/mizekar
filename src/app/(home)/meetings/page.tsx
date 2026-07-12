import { getCreatedMeetings } from "@/src/actions/meetingActions";
import { getLetterArchiveFolders } from "@/src/actions/archiveActions";
import MeetingList from "@/src/components/app/meetings/MeetingList";

interface MeetingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const params = await searchParams;
  const searchQuery = getSearchQuery(params);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage);
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [result, archiveResult] = await Promise.all([
    getCreatedMeetings(searchQuery),
    getLetterArchiveFolders(),
  ]);

  return (
    <MeetingList
      meetings={result.meetings}
      archiveFolders={archiveResult.folders}
      searchQuery={searchQuery}
      currentPage={currentPage}
      error={result.success ? undefined : result.error}
    />
  );
}
