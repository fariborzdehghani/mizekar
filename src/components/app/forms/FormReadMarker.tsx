"use client";

import { markFormViewed } from "@/src/actions/notificationActions";
import { useEffect } from "react";

type FormReadMarkerProps = {
  formId: number;
};

export default function FormReadMarker({ formId }: FormReadMarkerProps) {
  useEffect(() => {
    void markFormViewed(formId);
  }, [formId]);

  return null;
}
