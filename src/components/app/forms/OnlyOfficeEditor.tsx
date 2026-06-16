"use client";

import { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        placeholderId: string,
        config: Record<string, unknown>
      ) => { destroyEditor?: () => void };
    };
  }
}

type OnlyOfficeEditorProps = {
  documentServerUrl: string;
  config: Record<string, unknown> | null;
  error?: string | null;
};

function loadOnlyOfficeScript(documentServerUrl: string) {
  const scriptUrl = `${documentServerUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${scriptUrl}"]`
  );

  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      if (window.DocsAPI) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("امکان بارگذاری اسکریپت ONLYOFFICE وجود ندارد."));
    document.body.appendChild(script);
  });
}

export default function OnlyOfficeEditor({
  documentServerUrl,
  config,
  error,
}: OnlyOfficeEditorProps) {
  const reactId = useId();
  const placeholderId = `onlyoffice-${reactId.replace(/:/g, "")}`;
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!config || error) return;

    let editor: { destroyEditor?: () => void } | null = null;
    let cancelled = false;

    loadOnlyOfficeScript(documentServerUrl)
      .then(() => {
        if (cancelled) return;
        if (!window.DocsAPI) {
          setLoadError("API مربوط به ONLYOFFICE در دسترس نیست.");
          return;
        }

        editor = new window.DocsAPI.DocEditor(placeholderId, config);
      })
      .catch(() => {
        if (!cancelled) setLoadError("امکان بارگذاری ویرایشگر ONLYOFFICE وجود ندارد.");
      });

    return () => {
      cancelled = true;
      editor?.destroyEditor?.();
    };
  }, [config, documentServerUrl, error, placeholderId]);

  if (error || loadError || !config) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        {error || loadError || "ویرایشگر سند تنظیم نشده است."}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)] min-h-[38rem] overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div id={placeholderId} className="h-full w-full" />
    </div>
  );
}
