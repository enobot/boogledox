import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { closeDatabaseForTests } from "@/lib/db/client";
import {
  createDocument,
  getDocumentForUser,
  grantDocumentAccess,
  updateDocumentForUser,
} from "@/lib/documents/repository";
import { emptyDocument } from "@/lib/documents/types";
import { parseImportedFile } from "@/lib/import/import-file";

const tracy = DEMO_ACCOUNTS[0].id;
const nathan = DEMO_ACCOUNTS[1].id;
const nora = DEMO_ACCOUNTS[2].id;
const stranger = "00000000-0000-4000-8000-000000000099";

let directory = "";

beforeEach(async () => {
  await closeDatabaseForTests();
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "boogledox-"));
  process.env.BOOGLEDOX_DATA_DIR = directory;
});

afterEach(async () => {
  await closeDatabaseForTests();
  await fs.rm(directory, { recursive: true, force: true });
});

describe("document access", () => {
  it("lets the owner update a document", async () => {
    const created = await createDocument(tracy, "Notes");
    const updated = await updateDocumentForUser(tracy, created.id, {
      title: "Notes saved",
      content: emptyDocument(),
      revision: created.revision,
    });

    expect(updated.revision).toBe(2);
    expect(updated.title).toBe("Notes saved");
    expect(updated.access).toBe("owner");
  });

  it("lets an editor update a shared document and blocks a viewer", async () => {
    const created = await createDocument(tracy, "Shared page");
    await grantDocumentAccess(tracy, created.id, "nathan@boogledox.test", "editor");
    await grantDocumentAccess(tracy, created.id, "nora@boogledox.test", "viewer");

    const edited = await updateDocumentForUser(nathan, created.id, {
      title: "Edited by Nathan",
      content: emptyDocument(),
      revision: created.revision,
    });

    expect(edited.access).toBe("editor");
    expect(edited.title).toBe("Edited by Nathan");

    await expect(
      updateDocumentForUser(nora, created.id, {
        title: "Nora should not save",
        content: emptyDocument(),
        revision: edited.revision,
      }),
    ).rejects.toMatchObject({ status: 403, code: "read_only" });

    const viewed = await getDocumentForUser(nora, created.id);
    expect(viewed?.title).toBe("Edited by Nathan");
    expect(viewed?.access).toBe("viewer");
  });

  it("hides a document from an unrelated account", async () => {
    const created = await createDocument(tracy, "Private");

    expect(await getDocumentForUser(stranger, created.id)).toBeNull();
    await expect(
      updateDocumentForUser(stranger, created.id, {
        title: "Nope",
        content: emptyDocument(),
        revision: created.revision,
      }),
    ).rejects.toMatchObject({ status: 404, code: "not_found" });
  });

  it("rejects a stale revision without replacing the saved document", async () => {
    const created = await createDocument(tracy, "Revision");
    await updateDocumentForUser(tracy, created.id, {
      title: "Current",
      content: emptyDocument(),
      revision: created.revision,
    });

    await expect(
      updateDocumentForUser(tracy, created.id, {
        title: "Stale write",
        content: emptyDocument(),
        revision: created.revision,
      }),
    ).rejects.toMatchObject({ status: 409, code: "stale_revision" });

    const current = await getDocumentForUser(tracy, created.id);
    expect(current?.title).toBe("Current");
    expect(current?.revision).toBe(2);
  });

  it("rejects a duplicate share", async () => {
    const created = await createDocument(tracy, "Once");
    await grantDocumentAccess(tracy, created.id, "nathan@boogledox.test", "editor");

    await expect(
      grantDocumentAccess(tracy, created.id, "nathan@boogledox.test", "viewer"),
    ).rejects.toMatchObject({ status: 409, code: "duplicate_share" });
  });

  it("rejects an unknown email and a role that cannot be assigned", async () => {
    const created = await createDocument(tracy, "Share rules");

    await expect(
      grantDocumentAccess(tracy, created.id, "nobody@boogledox.test", "editor"),
    ).rejects.toMatchObject({ status: 404, code: "unknown_account" });
    await expect(
      grantDocumentAccess(tracy, created.id, "nathan@boogledox.test", "owner"),
    ).rejects.toMatchObject({ status: 400, code: "invalid_permission" });
  });

  it("does not let a viewer change sharing", async () => {
    const created = await createDocument(tracy, "Owner only");
    await grantDocumentAccess(tracy, created.id, "nora@boogledox.test", "viewer");

    await expect(
      grantDocumentAccess(nora, created.id, "nathan@boogledox.test", "editor"),
    ).rejects.toMatchObject({ status: 403, code: "forbidden" });
  });
});

describe("file import", () => {
  it("rejects the wrong extension, an empty file, a huge file, and binary data", async () => {
    await expect(parseImportedFile(new File(["hello"], "notes.html"))).rejects.toMatchObject({
      status: 400,
      code: "unsupported_file",
    });
    await expect(parseImportedFile(new File([""], "empty.txt"))).rejects.toMatchObject({
      code: "empty_file",
    });
    await expect(parseImportedFile(new File([" \n\t "], "blank.md"))).rejects.toMatchObject({
      code: "empty_file",
    });

    const oversized = new Uint8Array(500_001);
    oversized.fill(97);
    await expect(parseImportedFile(new File([oversized], "big.txt"))).rejects.toMatchObject({
      status: 413,
      code: "file_too_large",
    });

    await expect(
      parseImportedFile(new File([new Uint8Array([104, 0, 105])], "binary.txt")),
    ).rejects.toMatchObject({ code: "invalid_file" });
  });

  it("keeps Markdown headings and bold, and stores script tags as text", async () => {
    const imported = await parseImportedFile(
      new File(
        ["# Lesson\n\nHello **bold** and <script>alert(1)</script>"],
        "lesson.md",
      ),
    );

    expect(imported.title).toBe("lesson");
    const serialized = JSON.stringify(imported.content);
    expect(serialized).toContain("Lesson");
    expect(serialized).toContain("bold");
    expect(serialized).toContain("<script>alert(1)</script>");
    expect(serialized).not.toContain('"type":"script"');

    const created = await createDocument(tracy, imported.title, imported.content);
    const loaded = await getDocumentForUser(tracy, created.id);
    expect(JSON.stringify(loaded?.content)).toContain("<script>alert(1)</script>");
  });
});
