import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { SubmittedContent } from "@/components/SubmittedContent";
import { ensureSchema, getRequestLines } from "@/lib/requests";

type PageProps = {
  params: Promise<{ requestNumber: string }>;
};

export default async function RequestSubmittedPage({ params }: PageProps) {
  await ensureSchema();
  const { requestNumber } = await params;
  const lines = await getRequestLines(requestNumber);

  if (!lines.length) {
    notFound();
  }

  const header = lines[0];

  return (
    <PageShell title="Request submitted" subtitle="Your sample request was recorded successfully.">
      <SubmittedContent requestNumber={requestNumber} header={header} lines={lines} />
    </PageShell>
  );
}
