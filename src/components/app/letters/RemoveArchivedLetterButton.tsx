"use client";

import {
  removeItemFromArchive,
  type ArchiveItemType,
} from "@/src/actions/archiveActions";
import { ArchiveRestore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface RemoveArchivedLetterButtonProps {
  archiveItemId: number;
  itemType?: ArchiveItemType;
}

export default function RemoveArchivedLetterButton({
  archiveItemId,
  itemType = "letter",
}: RemoveArchivedLetterButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeItemFromArchive({ archiveItemId, itemType });

      if (!result.success) {
        setError(result.error || "خطا در حذف از بایگانی");
        return;
      }

      router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
        title="خروج از بایگانی"
      >
        <ArchiveRestore className="h-4 w-4" />
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
