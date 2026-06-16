"use client";

import { markLetterViewed } from "@/src/actions/notificationActions";
import { useEffect } from "react";

interface LetterReadMarkerProps {
  letterId: number;
}

export default function LetterReadMarker({ letterId }: LetterReadMarkerProps) {
  useEffect(() => {
    void markLetterViewed(letterId);
  }, [letterId]);

  return null;
}
