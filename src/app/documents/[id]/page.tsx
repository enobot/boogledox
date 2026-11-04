import { Suspense } from "react";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="bg-desk p-10 text-muted">Opening document…</p>
      }
    >
      <DocumentEditor params={params} />
    </Suspense>
  );
}
