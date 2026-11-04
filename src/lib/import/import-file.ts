import { AppError } from "@/lib/documents/errors";
import {
  MAX_CONTENT_BYTES,
  MAX_TITLE_LENGTH,
  type JsonValue,
  type RichTextDocument,
} from "@/lib/documents/types";

type JsonObject = { [key: string]: JsonValue };

export const MAX_IMPORT_BYTES = 500_000;

const SUPPORTED_EXTENSIONS = new Set(["txt", "md", "markdown"]);

export async function parseImportedFile(file: File): Promise<{
  title: string;
  content: RichTextDocument;
}> {
  const extension = fileExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new AppError(
      "Import a .txt or .md file. Other formats are not supported.",
      400,
      "unsupported_file",
    );
  }

  if (file.size === 0) {
    throw new AppError("That file is empty.", 400, "empty_file");
  }

  if (file.size > MAX_IMPORT_BYTES) {
    throw new AppError(
      "That file is too large. The limit is 500 KB.",
      413,
      "file_too_large",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new AppError(
      "That file is too large. The limit is 500 KB.",
      413,
      "file_too_large",
    );
  }

  if (bytes.includes(0)) {
    throw new AppError(
      "That file does not look like plain text or Markdown.",
      400,
      "invalid_file",
    );
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  if (!text.trim()) {
    throw new AppError("That file is empty.", 400, "empty_file");
  }

  const content =
    extension === "txt" ? documentFromPlainText(text) : documentFromMarkdown(text);
  const serialized = JSON.stringify(content);

  if (serialized.length > MAX_CONTENT_BYTES) {
    throw new AppError("That file is too large to import.", 413, "file_too_large");
  }

  return {
    title: titleFromFileName(file.name),
    content,
  };
}

export function documentFromPlainText(text: string): RichTextDocument {
  const blocks = normalizedLines(text)
    .join("\n")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n"))
    .filter((lines) => lines.some((line) => line.trim().length > 0))
    .map((lines) => ({
      type: "paragraph",
      content: linesWithBreaks(lines),
    }));

  return {
    type: "doc",
    content: blocks.length > 0 ? blocks : [{ type: "paragraph" }],
  };
}

export function documentFromMarkdown(text: string): RichTextDocument {
  const lines = normalizedLines(text);
  const blocks: JsonObject[] = [];
  let paragraphLines: string[] = [];
  let list: { type: "bulletList" | "orderedList"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      content: linesWithBreaks(paragraphLines),
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) {
      list = null;
      return;
    }

    blocks.push({
      type: list.type,
      ...(list.type === "orderedList" ? { attrs: { start: 1 } } : {}),
      content: list.items.map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: parseInline(item),
          },
        ],
      })),
    });
    list = null;
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push({
        type: "heading",
        attrs: { level },
        content: parseInline(heading[2]),
      });
      continue;
    }

    if (bullet) {
      flushParagraph();
      if (!list || list.type !== "bulletList") {
        flushList();
        list = { type: "bulletList", items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    if (ordered) {
      flushParagraph();
      if (!list || list.type !== "orderedList") {
        flushList();
        list = { type: "orderedList", items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return {
    type: "doc",
    content: blocks.length > 0 ? blocks : [{ type: "paragraph" }],
  };
}

function titleFromFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? "Imported document";
  const stem = baseName.replace(/\.[^.]+$/, "").trim().slice(0, MAX_TITLE_LENGTH);

  return stem || "Imported document";
}

function fileExtension(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? "";
  const match = /\.([a-z0-9]+)$/i.exec(baseName);
  return match?.[1]?.toLowerCase() ?? "";
}

function normalizedLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function linesWithBreaks(lines: string[]): JsonObject[] {
  const content: JsonObject[] = [];

  lines.forEach((line, index) => {
    if (index > 0) {
      content.push({ type: "hardBreak" });
    }

    content.push(...parseInline(line));
  });

  return content.filter((node) => node.type !== "text" || node.text !== "");
}

function parseInline(input: string): JsonObject[] {
  const nodes: JsonObject[] = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (!buffer) {
      return;
    }

    nodes.push({ type: "text", text: buffer });
    buffer = "";
  };

  while (index < input.length) {
    if (input.startsWith("**", index)) {
      const end = input.indexOf("**", index + 2);

      if (end !== -1) {
        flush();
        const text = input.slice(index + 2, end);
        if (text) {
          nodes.push({ type: "text", text, marks: [{ type: "bold" }] });
        }
        index = end + 2;
        continue;
      }
    }

    if (input[index] === "*" && input[index + 1] !== "*") {
      const end = input.indexOf("*", index + 1);

      if (end !== -1) {
        flush();
        const text = input.slice(index + 1, end);
        if (text) {
          nodes.push({ type: "text", text, marks: [{ type: "italic" }] });
        }
        index = end + 1;
        continue;
      }
    }

    buffer += input[index];
    index += 1;
  }

  flush();
  return nodes;
}
