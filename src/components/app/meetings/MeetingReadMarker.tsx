"use client";

import { markMeetingViewed } from "@/src/actions/meetingActions";
import { useEffect } from "react";

interface MeetingReadMarkerProps {
  meetingId: number;
}

export default function MeetingReadMarker({ meetingId }: MeetingReadMarkerProps) {
  useEffect(() => {
    void markMeetingViewed(meetingId);
  }, [meetingId]);

  return null;
}
