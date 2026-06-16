import HomeShell from "@/src/layout/HomeShell";
import { getLatestTodayInboxBriefForUser } from "@/src/ai/features/todayInboxBrief";
import { requireUser } from "@/src/lib/auth";
import React from "react";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const initialInboxBrief = await getLatestTodayInboxBriefForUser(user.id);

  return (
    <HomeShell user={user} initialInboxBrief={initialInboxBrief}>
      {children}
    </HomeShell>
  );
}
