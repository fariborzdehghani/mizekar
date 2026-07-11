"use client";

import type { ArchiveFolderNode } from "@/src/actions/archiveActions";
import { PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import LetterArchiveSidebar from "./LetterArchiveSidebar";
import { useArchiveSelection } from "./ArchiveSelectionProvider";

interface InboxArchiveLayoutProps {
  children: ReactNode;
  folders: ArchiveFolderNode[];
}

interface InboxArchiveContextValue {
  isArchiveVisible: boolean;
  openArchive: () => void;
}

const InboxArchiveContext = createContext<InboxArchiveContextValue | null>(null);

export function ArchivePanelToggleButton() {
  const context = useContext(InboxArchiveContext);
  if (!context || context.isArchiveVisible) return null;

  return (
    <button
      type="button"
      onClick={context.openArchive}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/[0.045] bg-white/40 text-gray-500 transition hover:border-brand-500/20 hover:text-brand-600 dark:border-white/[0.06] dark:bg-white/[0.035] dark:text-gray-400 dark:hover:text-brand-300"
      title="نمایش بایگانی"
      aria-label="نمایش بایگانی"
      aria-expanded={false}
    >
      <PanelLeftOpen className="h-4 w-4" />
    </button>
  );
}

export default function InboxArchiveLayout({
  children,
  folders,
}: InboxArchiveLayoutProps) {
  const [isArchiveOpen, setIsArchiveOpen] = useState(true);
  const archiveSelection = useArchiveSelection();
  const isArchiveVisible = isArchiveOpen || Boolean(archiveSelection?.pendingItem);

  return (
    <InboxArchiveContext.Provider
      value={{ isArchiveVisible, openArchive: () => setIsArchiveOpen(true) }}
    >
      <div
        className={`grid min-h-0 min-w-0 items-start gap-6 ${
          isArchiveVisible ? "xl:grid-cols-[minmax(0,1fr)_280px]" : "grid-cols-1"
        }`}
      >
        <div className="min-w-0">{children}</div>
        {isArchiveVisible && (
          <LetterArchiveSidebar
            folders={folders}
            isOpen={isArchiveVisible}
            onOpenChange={setIsArchiveOpen}
          />
        )}
      </div>
    </InboxArchiveContext.Provider>
  );
}
