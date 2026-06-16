"use client";

import type {
  ArchiveFolderNode,
  ArchiveItemType,
} from "@/src/actions/archiveActions";
import { Archive } from "lucide-react";
import { useArchiveSelection } from "./ArchiveSelectionProvider";

interface ArchiveLetterButtonProps {
  letterId?: number;
  itemId?: number;
  itemType?: ArchiveItemType;
  folders: ArchiveFolderNode[];
  size?: "default" | "compact";
}

function hasFolders(folders: ArchiveFolderNode[]) {
  return folders.length > 0;
}

function getItemLabel(itemType: ArchiveItemType) {
  if (itemType === "meeting") return "جلسه";
  return itemType === "form" ? "فرم" : "نامه";
}

export default function ArchiveLetterButton({
  letterId,
  itemId,
  itemType = "letter",
  folders,
  size = "default",
}: ArchiveLetterButtonProps) {
  const archiveSelection = useArchiveSelection();
  const canArchive = hasFolders(folders);
  const targetId = itemId ?? letterId;
  const itemLabel = getItemLabel(itemType);
  const isCurrentItem =
    archiveSelection?.pendingItem?.itemType === itemType &&
    archiveSelection.pendingItem.itemId === targetId;
  const buttonSizeClass = size === "compact" ? "h-7 w-7" : "h-8 w-8";
  const iconSizeClass = size === "compact" ? "h-3.5 w-3.5" : "h-4 w-4";

  const handleClick = () => {
    if (!canArchive || !archiveSelection || !targetId) return;
    archiveSelection.startArchiveSelection({ itemType, itemId: targetId });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canArchive || !targetId || archiveSelection?.isArchiving}
      className={`inline-flex ${buttonSizeClass} shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isCurrentItem
          ? "border-blue-light-300 bg-blue-light-50 text-blue-light-800 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200"
          : "border-app-border bg-white/50 text-gray-600 hover:border-blue-light-300 hover:bg-blue-light-50 hover:text-blue-light-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
      }`}
      title={
        canArchive
          ? `انتخاب پوشه بایگانی ${itemLabel}`
          : "ابتدا یک پوشه بایگانی بسازید"
      }
    >
      <Archive className={iconSizeClass} />
    </button>
  );
}
