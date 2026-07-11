import { getIncomingForms } from "@/src/actions/formActions";
import { getIncomingLetterReferrals } from "@/src/actions/letterActions";
import { getIncomingMeetingReferrals } from "@/src/actions/meetingActions";
import { getLetterArchiveFolders } from "@/src/actions/archiveActions";
import LetterReferralList from "@/src/components/app/letters/LetterReferralList";

interface IncomingLettersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function IncomingLettersPage({
  searchParams,
}: IncomingLettersPageProps) {
  const params = await searchParams;
  const searchQuery = getSearchQuery(params);
  const itemType = Array.isArray(params.type) ? params.type[0] : params.type;
  const sortOrder = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const [result, forms, meetings, archiveResult] = await Promise.all([
    getIncomingLetterReferrals(searchQuery),
    getIncomingForms(),
    getIncomingMeetingReferrals(searchQuery),
    getLetterArchiveFolders(),
  ]);

  return (
    <LetterReferralList
      title="کارتابل ورودی"
      emptyText="نامه در جریان ندارید"
      referrals={result.referrals}
      forms={forms}
      meetings={meetings.referrals}
      perspective="incoming"
      archiveFolders={archiveResult.folders}
      searchQuery={searchQuery}
      itemType={itemType === "letter" || itemType === "meeting" || itemType === "form" ? itemType : "all"}
      sortOrder={sortOrder === "asc" ? "asc" : "desc"}
      error={
        result.success && meetings.success
          ? undefined
          : result.error || meetings.error
      }
    />
  );
}
