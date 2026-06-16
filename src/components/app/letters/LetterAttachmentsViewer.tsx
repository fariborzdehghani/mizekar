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
  letterId,
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
      <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg border-dashed text-center">
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
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {items.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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

            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* View Button */}
              <button
                type="button"
                onClick={() =>
                  handleViewFile(attachment.fileId, attachment.fileName)
                }
                title="مشاهده فایل"
                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition disabled:opacity-50"
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
                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition disabled:opacity-50"
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
                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition disabled:opacity-50"
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
