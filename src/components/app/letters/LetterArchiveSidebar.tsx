"use client";

import {
  createLetterArchiveFolder,
  deleteLetterArchiveFolder,
  renameLetterArchiveFolder,
  type ArchiveFolderNode,
} from "@/src/actions/archiveActions";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  Inbox,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useArchiveSelection } from "./ArchiveSelectionProvider";

interface LetterArchiveSidebarProps {
  folders: ArchiveFolderNode[];
  selectedFolderId?: number | null;
  defaultOpen?: boolean;
}

type FolderContextMenu = {
  type: "folder";
  folder: ArchiveFolderNode;
  x: number;
  y: number;
} | {
  type: "root";
  x: number;
  y: number;
} | null;

type FolderDialog =
  | {
      type: "create-root";
      title: string;
      label: string;
      submitText: string;
    }
  | {
      type: "create-child";
      parentId: number;
      title: string;
      label: string;
      submitText: string;
    }
  | {
      type: "rename";
      folder: ArchiveFolderNode;
      title: string;
      label: string;
      submitText: string;
    }
  | null;

function hasFolder(folders: ArchiveFolderNode[], folderId: number | null) {
  if (!folderId) return false;

  for (const folder of folders) {
    if (folder.id === folderId) return true;
    if (hasFolder(folder.children, folderId)) return true;
  }

  return false;
}

function getFolderAncestorIds(
  folders: ArchiveFolderNode[],
  folderId: number | null,
  ancestors: number[] = [],
): number[] {
  if (!folderId) return [];

  for (const folder of folders) {
    if (folder.id === folderId) return ancestors;

    const childAncestors = getFolderAncestorIds(folder.children, folderId, [
      ...ancestors,
      folder.id,
    ]);
    if (childAncestors.length > 0) return childAncestors;
  }

  return [];
}

export default function LetterArchiveSidebar({
  folders,
  selectedFolderId = null,
  defaultOpen = false,
}: LetterArchiveSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const archiveSelection = useArchiveSelection();
  const dialogInputRef = useRef<HTMLInputElement>(null);
  const activeDialogKeyRef = useRef<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<FolderDialog>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(getFolderAncestorIds(folders, selectedFolderId)),
  );
  const [isRootExpanded, setIsRootExpanded] = useState(true);
  const [isArchiveSidebarOpen, setIsArchiveSidebarOpen] = useState(defaultOpen);
  const [contextMenu, setContextMenu] = useState<FolderContextMenu>(null);
  const [isPending, startTransition] = useTransition();
  const isArchiveTargetMode = Boolean(archiveSelection?.pendingItem);
  const isArchiveSidebarVisible = isArchiveSidebarOpen || isArchiveTargetMode;
  const searchQuery = searchParams.get("q") || "";

  const getArchiveHref = (folderId: number) => {
    const params = new URLSearchParams();
    params.set("folderId", String(folderId));
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    return `/archive?${params.toString()}`;
  };

  const getInboxHref = () => {
    const query = searchQuery.trim();
    return query ? `/incoming-letters?q=${encodeURIComponent(query)}` : "/incoming-letters";
  };

  const selectedExists = useMemo(
    () => hasFolder(folders, selectedFolderId),
    [folders, selectedFolderId],
  );
  const selectedAncestorIds = useMemo(
    () =>
      selectedExists
        ? new Set(getFolderAncestorIds(folders, selectedFolderId))
        : new Set<number>(),
    [folders, selectedExists, selectedFolderId],
  );

  const clearStatus = () => {
    setMessage(null);
    setError(null);
  };

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!folderDialog) {
      activeDialogKeyRef.current = null;
      return;
    }

    const dialogKey =
      folderDialog.type === "create-child"
        ? `${folderDialog.type}-${folderDialog.parentId}`
        : folderDialog.type === "rename"
          ? `${folderDialog.type}-${folderDialog.folder.id}`
          : folderDialog.type;

    if (activeDialogKeyRef.current === dialogKey) return;

    activeDialogKeyRef.current = dialogKey;
    dialogInputRef.current?.focus();
    dialogInputRef.current?.select();
  }, [folderDialog]);

  useEffect(() => {
    if (!message && !error) return;

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [error, message]);

  const runAction = (
    action: () => Promise<{
      success: boolean;
      error?: string;
      message?: string;
    }>,
  ) => {
    clearStatus();
    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        setError(result.error || "خطا در عملیات بایگانی");
        return;
      }

      setMessage(result.message || "عملیات انجام شد");
      router.refresh();
    });
  };

  const handleCreateRoot = () => {
    setDialogError(null);
    setFolderDialog({
      type: "create-root",
      title: "",
      label: "عنوان پوشه جدید",
      submitText: "افزودن پوشه",
    });
  };

  const handleCreateChild = (parentId: number) => {
    setDialogError(null);
    setFolderDialog({
      type: "create-child",
      parentId,
      title: "",
      label: "عنوان زیرپوشه",
      submitText: "افزودن زیرپوشه",
    });
  };

  const handleRename = (folder: ArchiveFolderNode) => {
    setDialogError(null);
    setFolderDialog({
      type: "rename",
      folder,
      title: folder.title,
      label: "عنوان جدید پوشه",
      submitText: "ذخیره تغییرات",
    });
  };

  const updateDialogTitle = (title: string) => {
    setDialogError(null);
    setFolderDialog((current) => (current ? { ...current, title } : current));
  };

  const closeFolderDialog = () => {
    if (isPending) return;
    setDialogError(null);
    setFolderDialog(null);
  };

  const submitFolderDialog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!folderDialog) return;

    const title = folderDialog.title.trim();
    if (!title) {
      setDialogError("عنوان پوشه را وارد کنید");
      return;
    }

    if (folderDialog.type === "rename") {
      if (title === folderDialog.folder.title) {
        setDialogError(null);
        setFolderDialog(null);
        return;
      }

      runAction(() =>
        renameLetterArchiveFolder({
          folderId: folderDialog.folder.id,
          title,
        }),
      );
      setDialogError(null);
      setFolderDialog(null);
      return;
    }

    runAction(() =>
      createLetterArchiveFolder({
        title,
        parentId:
          folderDialog.type === "create-child"
            ? folderDialog.parentId
            : undefined,
      }),
    );
    setDialogError(null);
    setFolderDialog(null);
  };

  const handleDelete = (folderId: number) => {
    if (!window.confirm("این پوشه حذف شود؟")) return;

    runAction(() => deleteLetterArchiveFolder(folderId));
  };

  const openFolderMenu = (
    event: MouseEvent<HTMLDivElement>,
    folder: ArchiveFolderNode,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      type: "folder",
      folder,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 176)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 132)),
    });
  };

  const openRootMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      type: "root",
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 176)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 56)),
    });
  };

  const runMenuAction = (action: () => void) => {
    setContextMenu(null);
    action();
  };

  const setArchiveSidebarOpen = (isOpen: boolean) => {
    setContextMenu(null);
    setIsArchiveSidebarOpen(isOpen);
  };

  const toggleExpanded = (folderId: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }

      return next;
    });
  };

  const handleFolderClick = (
    event: MouseEvent<HTMLAnchorElement>,
    folderId: number,
  ) => {
    if (!archiveSelection?.pendingItem) return;

    event.preventDefault();
    archiveSelection.archivePendingItemInFolder(folderId);
  };

  const renderNode = (folder: ArchiveFolderNode, isLast = false) => {
    const isExpanded =
      expandedIds.has(folder.id) || selectedAncestorIds.has(folder.id);
    const isSelected = folder.id === selectedFolderId && selectedExists;
    const hasChildren = folder.children.length > 0;
    return (
      <li key={folder.id} className="relative">
        <span className="absolute -right-3 top-0 h-4 border-r border-dotted border-gray-300 dark:border-gray-700" />
        {!isLast && (
          <span className="absolute -right-3 -bottom-0.5 top-4 border-r border-dotted border-gray-300 dark:border-gray-700" />
        )}
        <span className="absolute -right-3 top-4 w-3 border-t border-dotted border-gray-300 dark:border-gray-700" />
        <div
          onContextMenu={(event) => openFolderMenu(event, folder)}
          className={`flex h-8 items-center gap-1 rounded-md px-1.5 text-sm transition ${
            isSelected
              ? "bg-blue-light-50 text-blue-light-800 ring-1 ring-blue-light-100 dark:bg-blue-500/15 dark:text-blue-300"
              : isArchiveTargetMode
                ? "text-gray-700 ring-1 ring-transparent hover:bg-blue-light-50 hover:text-blue-light-800 hover:ring-blue-light-100 dark:text-gray-200 dark:hover:bg-blue-500/15 dark:hover:text-blue-200 dark:hover:ring-blue-500/30"
                : "text-gray-700 hover:bg-white/70 hover:text-blue-light-700 dark:text-gray-200 dark:hover:bg-white/5"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleExpanded(folder.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 transition hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-100"
            disabled={!hasChildren}
            title={isExpanded ? "بستن" : "باز کردن"}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )
            ) : (
              <span className="h-3.5 w-3.5" />
            )}
          </button>

          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-light-600" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-blue-light-600" />
          )}

          <Link
            href={getArchiveHref(folder.id)}
            onClick={(event) => handleFolderClick(event, folder.id)}
            className="min-w-0 flex-1 truncate"
            title={folder.title}
          >
            {folder.title}
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <ul className="mr-4 mt-0.5 space-y-0.5 pr-3">
            {folder.children.map((child, index) =>
              renderNode(child, index === folder.children.length - 1),
            )}
          </ul>
        )}
      </li>
    );
  };

  if (!isArchiveSidebarVisible) {
    return (
      <aside className="w-full shrink-0 border-t border-app-border bg-app-archive-panel p-2 dark:border-gray-800 dark:bg-gray-900 lg:w-12 lg:border-r lg:border-t-0">
        <button
          type="button"
          onClick={() => setArchiveSidebarOpen(true)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md text-gray-500 transition hover:bg-white/70 hover:text-blue-light-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
          title="نمایش بایگانی"
          aria-label="نمایش بایگانی"
          aria-expanded={false}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="text-sm font-medium lg:sr-only">بایگانی</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex max-h-full w-full shrink-0 flex-col overflow-hidden border-t border-app-border bg-app-archive-panel p-4 dark:border-gray-800 dark:bg-gray-900 lg:w-80 lg:border-r lg:border-t-0 xl:w-80 2xl:w-80 3xl:w-80">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <h2 className="min-w-0 flex-1 text-base font-semibold text-gray-900 dark:text-white">
          بایگانی
        </h2>
        {!archiveSelection?.pendingItem && (
          <button
            type="button"
            onClick={() => setArchiveSidebarOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-white/70 hover:text-blue-light-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            title="پنهان کردن بایگانی"
            aria-label="پنهان کردن بایگانی"
            aria-expanded={true}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {archiveSelection?.pendingItem && (
        <div className="mb-3 shrink-0 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700 dark:border-blue-800 dark:bg-blue-500/15 dark:text-blue-200">
          برای بایگانی مورد انتخاب‌شده، روی پوشه مقصد کلیک کنید.
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          onContextMenu={openRootMenu}
          className="flex h-8 items-center gap-1 rounded-md px-1.5 text-sm text-gray-800 transition hover:bg-white/70 hover:text-blue-light-700 dark:text-gray-100 dark:hover:bg-white/5"
        >
          <button
            type="button"
            onClick={() => setIsRootExpanded((current) => !current)}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-100"
            title={isRootExpanded ? "بستن" : "باز کردن"}
          >
            {isRootExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
          <Inbox className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <Link
            href={getInboxHref()}
            className="min-w-0 flex-1 truncate font-medium"
            title="صندوق ورودی"
          >
            صندوق ورودی
          </Link>
        </div>

        {isRootExpanded && (
          <div className="mr-4 mt-0.5 pr-3">
            {folders.length === 0 ? (
              <div className="rounded-md border border-dashed border-app-border bg-white/50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                پوشه‌ای ساخته نشده است
              </div>
            ) : (
              <ul className="space-y-0.5">
                {folders.map((folder, index) =>
                  renderNode(folder, index === folders.length - 1),
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-44 overflow-hidden rounded-md border border-app-border bg-app-panel py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {contextMenu.type === "root" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => runMenuAction(handleCreateRoot)}
              className="flex w-full items-center gap-2 px-3 py-2 text-right text-gray-700 transition hover:bg-blue-light-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:bg-white/5"
            >
              <Plus className="h-4 w-4 text-blue-500" />
              <span>افزودن پوشه</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runMenuAction(() => handleCreateChild(contextMenu.folder.id))
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-gray-700 transition hover:bg-blue-light-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:bg-white/5"
              >
                <Plus className="h-4 w-4 text-blue-500" />
                <span>افزودن زیرپوشه</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runMenuAction(() => handleRename(contextMenu.folder))
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-gray-700 transition hover:bg-blue-light-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:bg-white/5"
              >
                <Pencil className="h-4 w-4 text-gray-500" />
                <span>تغییر نام</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runMenuAction(() => handleDelete(contextMenu.folder.id))
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <Trash2 className="h-4 w-4" />
                <span>حذف</span>
              </button>
            </>
          )}
        </div>
      )}

      {(error || message) && (
        <div
          className={`fixed left-1/2 top-4 z-[60] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border px-4 py-3 text-sm shadow-xl backdrop-blur ${
            error
              ? "border-gray-200 bg-gray-50/95 text-gray-700 dark:border-gray-800 dark:bg-gray-950/95 dark:text-gray-200"
              : "border-blue-light-200 bg-blue-light-50/95 text-blue-light-700 dark:border-blue-800 dark:bg-blue-950/95 dark:text-blue-200"
          }`}
          role="status"
        >
          {error || message}
        </div>
      )}

      {folderDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          onMouseDown={closeFolderDialog}
        >
          <form
            onSubmit={submitFolderDialog}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-app-border bg-app-panel p-4 text-right shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {folderDialog.submitText}
              </h3>
              <label
                htmlFor="archive-folder-title"
                className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {folderDialog.label}
              </label>
              <input
                ref={dialogInputRef}
                id="archive-folder-title"
                value={folderDialog.title}
                onChange={(event) => updateDialogTitle(event.target.value)}
                aria-invalid={Boolean(dialogError)}
                className={`mt-2 w-full rounded-md border bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white ${
                  dialogError
                    ? "border-gray-300 focus:border-gray-400 focus:ring-gray-100 dark:border-gray-700 dark:focus:border-gray-500 dark:focus:ring-gray-500/20"
                    : "border-app-border focus:border-blue-light-400 focus:ring-blue-light-100 dark:border-gray-700 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                }`}
              />
              {dialogError && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  {dialogError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={closeFolderDialog}
                className="rounded-md border border-app-border bg-white/70 px-3 py-2 text-sm text-gray-700 transition hover:bg-blue-light-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-blue-light-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-light-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "در حال انجام..." : folderDialog.submitText}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
