import type { Metadata } from "next";
import SampleDataCreator from "@/src/sample-data/SampleDataCreator";
import {
  SAMPLE_DATA_DEFAULTS,
  SAMPLE_DATA_LIMITS,
  getSampleDataStats,
} from "@/src/sample-data/seed";
import { requireUser } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "داده نمونه | میزکار",
};

export default async function SampleDataPage() {
  const [currentUser, stats] = await Promise.all([
    requireUser(),
    getSampleDataStats(),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white">
      <SampleDataCreator
        currentUserName={currentUser.displayName}
        defaults={SAMPLE_DATA_DEFAULTS}
        limits={SAMPLE_DATA_LIMITS}
        initialStats={stats}
      />
    </main>
  );
}
