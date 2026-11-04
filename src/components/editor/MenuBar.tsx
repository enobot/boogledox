"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

const ZOOMS = [0.75, 1, 1.25, 1.5] as const;

type MenuId = "file" | "edit" | "format" | "view";

type MenuBarProps = {
  editor: Editor | null;
  zoom: number;
  onZoom: (zoom: number) => void;
  onNewDocument: () => void;
  onOpenDashboard: () => void;
  busy: boolean;
};

export function MenuBar({
  editor,
  zoom,
  onZoom,
  onNewDocument,
  onOpenDashboard,
  busy,
}: MenuBarProps) {
  const [open, setOpen] = useState<MenuId | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutside = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpen(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
      }
    };

    window.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const choose = (action: () => void) => {
    action();
    setOpen(null);
  };

  const zoomIndex = ZOOMS.indexOf(zoom as (typeof ZOOMS)[number]);

  return (
    <div ref={barRef} className="flex flex-wrap items-center gap-1 px-3 py-1.5">
      <Menu
        label="File"
        open={open === "file"}
        onToggle={() => setOpen(open === "file" ? null : "file")}
      >
        <MenuItem
          label="New document"
          disabled={busy}
          onSelect={() => choose(onNewDocument)}
        />
        <MenuItem
          label="Document dashboard"
          onSelect={() => choose(onOpenDashboard)}
        />
      </Menu>
      <Menu
        label="Edit"
        open={open === "edit"}
        onToggle={() => setOpen(open === "edit" ? null : "edit")}
      >
        <MenuItem
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={!editor?.can().undo()}
          onSelect={() => choose(() => editor?.chain().focus().undo().run())}
        />
        <MenuItem
          label="Redo"
          shortcut="Ctrl+Y"
          disabled={!editor?.can().redo()}
          onSelect={() => choose(() => editor?.chain().focus().redo().run())}
        />
      </Menu>
      <Menu
        label="Format"
        open={open === "format"}
        onToggle={() => setOpen(open === "format" ? null : "format")}
      >
        <MenuItem
          label="Bold"
          shortcut="Ctrl+B"
          active={editor?.isActive("bold")}
          disabled={!editor}
          onSelect={() => choose(() => editor?.chain().focus().toggleBold().run())}
        />
        <MenuItem
          label="Italic"
          shortcut="Ctrl+I"
          active={editor?.isActive("italic")}
          disabled={!editor}
          onSelect={() => choose(() => editor?.chain().focus().toggleItalic().run())}
        />
        <MenuItem
          label="Underline"
          shortcut="Ctrl+U"
          active={editor?.isActive("underline")}
          disabled={!editor}
          onSelect={() =>
            choose(() => editor?.chain().focus().toggleUnderline().run())
          }
        />
        <MenuItem
          label="Paragraph"
          active={editor?.isActive("paragraph")}
          disabled={!editor}
          onSelect={() => choose(() => editor?.chain().focus().setParagraph().run())}
        />
        <MenuItem
          label="Heading 1"
          active={editor?.isActive("heading", { level: 1 })}
          disabled={!editor}
          onSelect={() =>
            choose(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())
          }
        />
        <MenuItem
          label="Heading 2"
          active={editor?.isActive("heading", { level: 2 })}
          disabled={!editor}
          onSelect={() =>
            choose(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())
          }
        />
        <MenuItem
          label="Heading 3"
          active={editor?.isActive("heading", { level: 3 })}
          disabled={!editor}
          onSelect={() =>
            choose(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())
          }
        />
        <MenuItem
          label="Bulleted list"
          active={editor?.isActive("bulletList")}
          disabled={!editor}
          onSelect={() =>
            choose(() => editor?.chain().focus().toggleBulletList().run())
          }
        />
        <MenuItem
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          disabled={!editor}
          onSelect={() =>
            choose(() => editor?.chain().focus().toggleOrderedList().run())
          }
        />
      </Menu>
      <Menu
        label="View"
        open={open === "view"}
        onToggle={() => setOpen(open === "view" ? null : "view")}
      >
        <MenuItem
          label="Zoom in"
          disabled={zoomIndex === ZOOMS.length - 1}
          onSelect={() => choose(() => onZoom(ZOOMS[Math.min(ZOOMS.length - 1, zoomIndex + 1)] ?? 1))}
        />
        <MenuItem
          label="Zoom out"
          disabled={zoomIndex <= 0}
          onSelect={() => choose(() => onZoom(ZOOMS[Math.max(0, zoomIndex - 1)] ?? 1))}
        />
        <MenuItem label="100%" onSelect={() => choose(() => onZoom(1))} />
      </Menu>

      <div className="mx-2 hidden h-5 w-px bg-line sm:block" />

      <ToolButton
        label="Bold"
        active={Boolean(editor?.isActive("bold"))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton
        label="Italic"
        active={Boolean(editor?.isActive("italic"))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolButton>
      <ToolButton
        label="Underline"
        active={Boolean(editor?.isActive("underline"))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolButton>
      <ToolButton
        label="Heading 1"
        active={Boolean(editor?.isActive("heading", { level: 1 }))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolButton>
      <ToolButton
        label="Heading 2"
        active={Boolean(editor?.isActive("heading", { level: 2 }))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolButton>
      <ToolButton
        label="Heading 3"
        active={Boolean(editor?.isActive("heading", { level: 3 }))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolButton>
      <ToolButton
        label="Bulleted list"
        active={Boolean(editor?.isActive("bulletList"))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={Boolean(editor?.isActive("orderedList"))}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolButton>
      <ToolButton
        label="Undo"
        disabled={!editor?.can().undo()}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        Undo
      </ToolButton>
      <ToolButton
        label="Redo"
        disabled={!editor?.can().redo()}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        Redo
      </ToolButton>

      <div className="ml-auto flex items-center gap-1">
        <ToolButton
          label="Zoom out"
          disabled={zoomIndex <= 0}
          onClick={() => onZoom(ZOOMS[Math.max(0, zoomIndex - 1)] ?? 1)}
        >
          −
        </ToolButton>
        <span className="w-12 text-center text-xs text-muted" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton
          label="Zoom in"
          disabled={zoomIndex === ZOOMS.length - 1}
          onClick={() => onZoom(ZOOMS[Math.min(ZOOMS.length - 1, zoomIndex + 1)] ?? 1)}
        >
          +
        </ToolButton>
      </div>
    </div>
  );
}

function Menu({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        className={`cursor-pointer rounded px-2.5 py-1 text-sm ${
          open ? "bg-lavender text-plum" : "text-plum hover:bg-lavender/70"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        {label}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full left-0 z-40 mt-1 min-w-56 rounded-lg border border-line bg-paper py-1 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  shortcut,
  disabled,
  active,
  onSelect,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center justify-between gap-6 px-3 py-1.5 text-left text-sm text-plum hover:bg-lavender/80 disabled:cursor-not-allowed disabled:text-muted/60 disabled:hover:bg-transparent"
    >
      <span>
        {active ? "✓ " : ""}
        {label}
      </span>
      {shortcut ? <span className="text-xs text-muted">{shortcut}</span> : null}
    </button>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`cursor-pointer rounded px-2 py-1 text-sm text-plum hover:bg-lavender/80 disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent ${
        active ? "bg-lavender" : ""
      }`}
    >
      {children}
    </button>
  );
}
