"use client";

import { markMessageViewed } from "@/src/actions/notificationActions";
import { useEffect } from "react";

interface MessageReadMarkerProps {
  messageId: number;
}

export default function MessageReadMarker({ messageId }: MessageReadMarkerProps) {
  useEffect(() => {
    void markMessageViewed(messageId);
  }, [messageId]);

  return null;
}
