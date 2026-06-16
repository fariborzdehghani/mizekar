import { getMeeting } from "@/src/actions/meetingActions";
import MeetingForm from "@/src/components/app/meetings/MeetingForm";
import MeetingReadMarker from "@/src/components/app/meetings/MeetingReadMarker";

interface MeetingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MeetingPage({ searchParams }: MeetingPageProps) {
  const params = await searchParams;
  const meetingId = params.id ? parseInt(params.id as string) : null;
  const isViewMode = params.viewOnly === "true" || Boolean(meetingId);

  let meetingData = null;
  let pageTitle = "جلسه جدید";

  if (meetingId) {
    const result = await getMeeting(meetingId);
    if (result.success && result.meeting) {
      meetingData = result.meeting;
      pageTitle = "مشاهده جلسه";
    }
  }

  return (
    <div className="w-full">
      {meetingId && isViewMode && <MeetingReadMarker meetingId={meetingId} />}
      <MeetingForm
        initialMeeting={meetingData}
        isViewMode={isViewMode}
        pageTitle={pageTitle}
      />
    </div>
  );
}
