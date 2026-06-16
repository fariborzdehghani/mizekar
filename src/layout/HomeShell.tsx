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
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();

  const handleMainContentClick = () => {
    if (isExpanded) {
      toggleSidebar();
    }
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  };

  return (
    <InboxBriefProvider initialBrief={initialInboxBrief}>
      <div className="min-h-screen bg-app-canvas xl:flex dark:bg-gray-950">
        <AppSidebar />
        <Backdrop />
        <div
          className="mr-22.5 min-h-screen flex-1 bg-app-canvas transition-all duration-300 ease-in-out dark:bg-gray-950"
          onClick={handleMainContentClick}
        >
          <AppHeader user={user} />
          <div className="mx-auto w-full">{children}</div>
        </div>
      </div>
    </InboxBriefProvider>
  );
}
