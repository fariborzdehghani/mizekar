"use client";

import { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, CheckSquare, AlignLeft, AlignCenter, AlignRight,
  Link2, Image as ImageIcon, Table, Undo, Redo,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl p-2 transition-colors ${
        isActive
          ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
          : "text-gray-600 hover:bg-white/50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-white/[0.07] dark:hover:text-brand-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}

const Toolbar = ({ editor }: ToolbarProps) => {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="liquid-glass-control mb-3 flex flex-wrap items-center gap-1 rounded-2xl border p-1.5">
      {/* Text Formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}>
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")}>
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")}>
        <UnderlineIcon size={18} />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-gray-300/70 dark:bg-white/10" />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")}>
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")}>
        <ListOrdered size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive("taskList")}>
        <CheckSquare size={18} />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-gray-300/70 dark:bg-white/10" />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })}>
        <AlignLeft size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })}>
        <AlignCenter size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })}>
        <AlignRight size={18} />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-gray-300/70 dark:bg-white/10" />

      {/* Media & Links */}
      <ToolbarButton onClick={addLink} isActive={editor.isActive("link")}>
        <Link2 size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={addImage}>
        <ImageIcon size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={addTable}>
        <Table size={18} />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-gray-300/70 dark:bg-white/10" />

      {/* History */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo size={18} />
      </ToolbarButton>
    </div>
  );
};

export default Toolbar;
