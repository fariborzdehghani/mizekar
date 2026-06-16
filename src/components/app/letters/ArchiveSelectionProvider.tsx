"use client";

import {
  archiveItemInFolder,
  type ArchiveItemType,
} from "@/src/actions/archiveActions";
import { Archive, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useTransition,
} from "react";

type ArchiveTarget = {
  itemType: ArchiveItemType;
  itemId: number;
};

type ArchiveSelectionContextValue = {
  pendingItem: ArchiveTarget | null;
  isArchiving: boolean;
  startArchiveSelection: (target: ArchiveTarget) => void;
  cancelArchiveSelection: () => void;
  archivePendingItemInFolder: (folderId: number) => boolean;
};

const ArchiveSelectionContext =
  createContext<ArchiveSelectionContextValue | null>(null);

export function useArchiveSelection() {
  return useContext(ArchiveSelectionContext);
}

function getItemLabel(itemType: ArchiveItemType) {
  if (itemType === "meeting") return "جلسه";
  return itemType === "form" ? "فرم" : "نامه";
}

export default function ArchiveSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [pendingItem, setPendingItem] = useState<ArchiveTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isArchiving, startTransition] = useTransition();

  const startArchiveSelection = (target: ArchiveTarget) => {
    setPendingItem(target);
    setError(null);
    setMessage("یک پوشه را از ستون بایگانی انتخاب کنید");
  };

  const cancelArchiveSelection = () => {
    setPendingItem(null);
    setMessage(null);
    setError(null);
  };

  const archivePendingItemInFolder = (folderId: number) => {
    if (!pendingItem) return false;

    const target = pendingItem;
    const itemLabel = getItemLabel(target.itemType);
    setError(null);
    setMessage(`در حال بایگانی ${itemLabel}...`);

    startTransition(async () => {
      const result = await archiveItemInFolder({
        ...target,
        folderId,
      });

      if (!result.success) {
        setError(result.error || `خطا در بایگانی ${itemLabel}`);
        setMessage(null);
        return;
      }

      setPendingItem(null);
      setError(null);
      setMessage(result.message || `${itemLabel} بایگانی شد`);
      router.refresh();
    });

    return true;
  };

  return (
    <ArchiveSelectionContext.Provider
      value={{
        pendingItem,
        isArchiving,
        startArchiveSelection,
        cancelArchiveSelection,
        archivePendingItemInFolder,
      }}
    >
      {children}

      {(message || error) && (
        <div
          className={`fixed bottom-5 left-5 z-[1000000] flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900 dark:text-red-100"
              : "border-blue-200 bg-white text-gray-800 dark:border-blue-800 dark:bg-gray-900 dark:text-gray-100"
          }`}
          role="status"
        >
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
          <span className="min-w-0 flex-1 leading-6">{error || message}</span>
          <button
            type="button"
            onClick={cancelArchiveSelection}
            className="mt-0.5 shrink-0 text-gray-400 transition hover:text-gray-700 dark:hover:text-white"
            title="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </ArchiveSelectionContext.Provider>
  );
}
