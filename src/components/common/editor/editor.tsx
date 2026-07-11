"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

import Toolbar from "./toolbar";

interface EditorProps {
  name?: string; // form field name to submit HTML
  defaultContent?: string;
  height?: number | string; // accept px number or CSS size string
  readOnly?: boolean; // make editor read-only
  initialValue?: string; // initial value for controlled mode
  onChange?: (content: string) => void;
}

const Editor = ({
  name,
  defaultContent,
  height,
  readOnly = false,
  initialValue,
  onChange,
}: EditorProps) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const initialContent = initialValue || defaultContent || "";

  const editor = useEditor({
    // CRITICAL for Next.js: prevents hydration mismatches
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { target: "_blank" },
        },
      }),
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TableKit,
      Placeholder.configure({
        placeholder: "Write something awesome...",
      }),
    ],
    content: initialValue || defaultContent || "<p></p>",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const nextContent = editor.getHTML();
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = nextContent;
      }
      onChange?.(nextContent);
    },
    editorProps: {
      attributes: {
        class: 'min-h-[200px] p-4 focus:outline-none', // Add your classes here
      },
    },
  });

  useEffect(() => {
    if (editor && initialValue !== undefined) {
      const nextContent = initialValue || "<p></p>";
      if (editor.getHTML() === nextContent) return;
      editor.commands.setContent(nextContent);
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = nextContent;
      }
    }
  }, [initialValue, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  const minHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div className="liquid-glass-inset rounded-3xl p-3 sm:p-4">
      {/* Hidden input so form submissions include the HTML content */}
      {name && (
        <input
          ref={hiddenInputRef}
          type="hidden"
          name={name}
          defaultValue={initialContent}
        />
      )}
      {!readOnly && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="liquid-glass-control prose mt-4 max-w-none overflow-auto rounded-2xl border text-gray-800 dark:prose-invert dark:text-gray-100"
        style={{ minHeight: minHeight || "200px" }}
      />
    </div>
  );
};

export default Editor;
