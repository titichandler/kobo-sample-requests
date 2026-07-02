import { PageShell } from "@/components/PageShell";
import { ReviewBoard } from "@/components/ReviewBoard";

export default function RequestsPage() {
  return (
    <PageShell
      title="Review board"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Review board" },
      ]}
    >
      <ReviewBoard />
    </PageShell>
  );
}
