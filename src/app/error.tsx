"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@/src/components/ui";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="liquid-content-frame min-h-screen py-8">
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title="خطایی در اجرای برنامه رخ داد"
        description="لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید."
        action={<Button onClick={unstable_retry}>تلاش دوباره</Button>}
      />
    </main>
  );
}
