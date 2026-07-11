"use client";

import { ChangeEvent, useRef } from "react";
import { Download, Trash2, Eye } from "lucide-react";

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  file?: File;
}

interface FileAttachmentManagerProps {
  attachments: FileAttachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onDownloadFile?: (id: string, name: string) => void;
  onViewFile?: (id: string, name: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  readOnly?: boolean; // make manager read-only
}

export default function FileAttachmentManager({
  attachments,
  onAddFiles,
  onRemoveFile,
  onDownloadFile,
  onViewFile,
  maxFiles = 10,
  maxFileSize = 50,
  readOnly = false,
}: FileAttachmentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.currentTarget.files;
    if (!selectedFiles) return;

    const files = Array.from(selectedFiles);

    // Validate max files
    if (attachments.length + files.length > maxFiles) {
      alert(`حداکثر ${maxFiles} فایل می‌توانید پیوست کنید`);
      return;
    }

    // Validate file size
    const oversizedFiles = files.filter(
      (f) => f.size / (1024 * 1024) > maxFileSize
    );
    if (oversizedFiles.length > 0) {
      alert(
        `برخی فایل‌ها از ${maxFileSize}MB بزرگتر هستند. لطفاً فایل‌های کوچکتر انتخاب کنید.`
      );
      return;
    }

    onAddFiles(files);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (fileName: string): string => {
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

  const handleViewFile = (attachment: FileAttachment) => {
    if (onViewFile) {
      onViewFile(attachment.id, attachment.name);
    }
  };

  const handleDownloadFile = (attachment: FileAttachment) => {
    if (onDownloadFile) {
      onDownloadFile(attachment.id, attachment.name);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          پیوست‌های نامه ({attachments.length}/{maxFiles})
        </label>

        {/* File List */}
        <div className="liquid-glass-inset mb-4 flex h-50 w-full flex-wrap content-start items-start gap-2 overflow-y-auto rounded-2xl p-3">
          {attachments.length > 0 ? (
            attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="liquid-glass-control group flex h-12 w-fit max-w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 transition hover:border-brand-200 dark:hover:border-brand-400/20"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xl shrink-0">
                    {getFileIcon(attachment.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  {/* View Button - for image files or if onViewFile is provided */}
                  {onViewFile && (
                    <button
                      type="button"
                      onClick={() => handleViewFile(attachment)}
                      title="مشاهده فایل"
                      className="rounded-lg p-2 text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
                    >
                      <Eye size={18} />
                    </button>
                  )}

                  {/* Download Button */}
                  {onDownloadFile && (
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(attachment)}
                      title="دانلود فایل"
                      className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                    >
                      <Download size={18} />
                    </button>
                  )}

                  {/* Delete Button */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveFile(attachment.id)}
                      title="حذف فایل"
                      className="rounded-lg p-2 text-red-600 transition hover:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-white/70 bg-white/20 text-center dark:border-white/10 dark:bg-white/[0.025]">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                هنوز فایلی پیوست نشده
              </p>
            </div>
          )}
        </div>

        {/* Add File Button */}
        {!readOnly && attachments.length < maxFiles && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept="*/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-40 rounded-2xl bg-brand-500 px-4 py-2 font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600"
            >
              + افزودن فایل
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          حداکثر اندازه فایل: {maxFileSize}MB | حداکثر تعداد فایل‌ها: {maxFiles}
        </p>
      </div>
    </div>
  );
}
