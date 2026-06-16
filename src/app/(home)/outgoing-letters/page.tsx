import { getOutgoingForms } from "@/src/actions/formActions";
import { getOutgoingLetterReferrals } from "@/src/actions/letterActions";
import { getOutgoingMeetingReferrals } from "@/src/actions/meetingActions";
import { getLetterArchiveFolders } from "@/src/actions/archiveActions";
import LetterReferralList from "@/src/components/app/letters/LetterReferralList";

interface OutgoingLettersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function OutgoingLettersPage({
  searchParams,
}: OutgoingLettersPageProps) {
  const params = await searchParams;
  const searchQuery = getSearchQuery(params);
  const [result, forms, meetings, archiveResult] = await Promise.all([
    getOutgoingLetterReferrals(searchQuery),
    getOutgoingForms(),
    getOutgoingMeetingReferrals(searchQuery),
    getLetterArchiveFolders(),
  ]);

  return (
    <LetterReferralList
      title="نامه‌ها، فرم‌ها و جلسات خروجی"
      emptyText="هنوز نامه، فرم یا جلسه‌ای ارجاع نداده‌اید"
      referrals={result.referrals}
      forms={forms}
      meetings={meetings.referrals}
      perspective="outgoing"
      archiveFolders={archiveResult.folders}
      searchQuery={searchQuery}
      error={
        result.success && meetings.success
          ? undefined
          : result.error || meetings.error
      }
    />
  );
}
