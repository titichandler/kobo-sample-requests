import { PageShell } from "@/components/PageShell";
import { RequestsTable } from "@/components/RequestsTable";

export default function AllRequestsPage() {
  return (
    <PageShell
      title="All requests"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "All requests" },
      ]}
    >
      <RequestsTable />
    </PageShell>
  );
}
