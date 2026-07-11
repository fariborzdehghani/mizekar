"use client";

import AppHeader from "@/src/layout/AppHeader";
import AppSidebar from "@/src/layout/AppSidebar";
import Backdrop from "@/src/layout/Backdrop";
import { useSidebar } from "@/src/context/SidebarContext";
import InboxBriefProvider from "@/src/components/app/inbox-brief/InboxBriefPanel";
import type { CurrentUser } from "@/src/lib/auth-types";
import type { InboxBrief } from "@/src/ai/features/todayInboxBrief";
import React from "react";

export default function HomeShell({
  children,
  user,
  initialInboxBrief,
}: {
  children: React.ReactNode;
  user: CurrentUser;
  initialInboxBrief: InboxBrief | null;
}) {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  const handleMainContentClick = () => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  };

  return (
    <InboxBriefProvider initialBrief={initialInboxBrief}>
      <div className="liquid-glass-app min-h-screen xl:flex">
        <AppSidebar />
        <Backdrop />
        <div
          className="liquid-glass-main mr-0 min-h-screen min-w-0 flex-1 transition-[margin] duration-300 ease-in-out lg:mr-[280px]"
          onClick={handleMainContentClick}
        >
          <AppHeader user={user} />
          <div className="mx-auto w-full">{children}</div>
        </div>
      </div>
    </InboxBriefProvider>
  );
}
