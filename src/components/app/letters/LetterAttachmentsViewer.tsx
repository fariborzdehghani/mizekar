"use client";

import { useEffect, useState } from "react";
import { deleteLetterAttachment, getFileData } from "@/src/actions/letterActions";
import { Download, Trash2, Eye, Paperclip } from "lucide-react";

interface LetterAttachment {
  id: number;
  fileId: number | null;
  fileName: string | null;
  fileSize?: number;
}

interface LetterAttachmentsViewerProps {
  letterId: number;
  attachments: LetterAttachment[];
  onAttachmentDeleted?: (attachmentId: number) => void;
  editable?: boolean;
}

export default function LetterAttachmentsViewer({
  attachments,
  onAttachmentDeleted,
  editable = false,
}: LetterAttachmentsViewerProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LetterAttachment[]>(attachments);

  useEffect(() => {
    setItems(attachments);
  }, [attachments]);

  const handleDownload = async (fileId: number | null, fileName: string | null) => {
    if (!fileId || !fileName) return;

    try {
      setLoading(fileId);
      const result = await getFileData(fileId);
      
      if (!result.success || !result.fileData) {
        throw new Error(result.error || "خطا در دانلود فایل");
      }

      // Convert base64 to blob
      const binaryString = atob(result.fileData.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.fileData.mimeType });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      setError("خطا در دانلود فایل");
    } finally {
      setLoading(null);
    }
  };

  const handleViewFile = async (fileId: number | null, fileName: string | null) => {
    if (!fileId || !fileName) return;

    try {
      setLoading(fileId);
      const result = await getFileData(fileId);
      
      if (!result.success || !result.fileData) {
        throw new Error(result.error || "خطا در مشاهده فایل");
      }

      // Convert base64 to blob
      const binaryString = atob(result.fileData.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.fileData.mimeType });

      // Create blob URL and open in new window
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Note: We don't revoke the URL here to allow the window to access it
      // The browser will handle cleanup when the window is closed
    } catch (err) {
      console.error("View error:", err);
      setError("خطا در مشاهده فایل");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!editable) return;

    if (!confirm("آیا می‌خواهید این پیوست را حذف کنید؟")) {
      return;
    }

    setLoading(attachmentId);
    setError(null);

    try {
      const result = await deleteLetterAttachment(attachmentId);

      if (result.success) {
        setItems((prev) => prev.filter((item) => item.id !== attachmentId));
        if (onAttachmentDeleted) {
          onAttachmentDeleted(attachmentId);
        }
      } else {
        setError(result.error || "خطا در حذف پیوست");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("خطا در حذف پیوست");
    } finally {
      setLoading(null);
    }
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return "نامشخص";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (fileName: string | null): string => {
    if (!fileName) return "📎";
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "xls":
      case "xlsx":
        return "📊";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "🖼️";
      case "zip":
      case "rar":
      case "7z":
        return "📦";
      default:
        return "📎";
    }
  };

  if (items.length === 0) {
    return (
      <div className="liquid-glass-inset rounded-2xl border-dashed p-6 text-center">
        <Paperclip className="mx-auto mb-3 text-gray-400" size={32} />
        <p className="text-gray-500 dark:text-gray-400">
          این نامه دارای پیوست نیست
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-800 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {items.map((attachment) => (
          <div
            key={attachment.id}
            className="liquid-glass-control group flex items-center justify-between rounded-2xl border p-4 transition hover:border-brand-200 dark:hover:border-brand-400/20"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl shrink-0">
                {getFileIcon(attachment.fileName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {attachment.fileName || "نام فایل نامشخص"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              {/* View Button */}
              <button
                type="button"
                onClick={() =>
                  handleViewFile(attachment.fileId, attachment.fileName)
                }
                title="مشاهده فایل"
                className="rounded-xl p-2 text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15 disabled:opacity-50"
                disabled={loading === attachment.id}
              >
                <Eye size={18} />
              </button>

              {/* Download Button */}
              <button
                type="button"
                onClick={() =>
                  handleDownload(attachment.fileId, attachment.fileName)
                }
                title="دانلود فایل"
                className="rounded-xl p-2 text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15 disabled:opacity-50"
                disabled={loading === attachment.id}
              >
                <Download size={18} />
              </button>

              {/* Delete Button - only if editable */}
              {editable && (
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  title="حذف فایل"
                  className="rounded-xl p-2 text-red-600 transition hover:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15 disabled:opacity-50"
                  disabled={loading === attachment.id}
                >
                  {loading === attachment.id ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
