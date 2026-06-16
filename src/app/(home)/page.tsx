import { getIncomingForms } from "@/src/actions/formActions";
import { getIncomingLetterReferrals } from "@/src/actions/letterActions";
import { getIncomingMeetingReferrals } from "@/src/actions/meetingActions";
import { getLetterArchiveFolders } from "@/src/actions/archiveActions";
import LetterReferralList from "@/src/components/app/letters/LetterReferralList";

interface HomeProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSearchQuery(params: { [key: string]: string | string[] | undefined }) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return query?.trim() || "";
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const searchQuery = getSearchQuery(params);
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
      error={
        result.success && meetings.success
          ? undefined
          : result.error || meetings.error
      }
      />
  );
}
