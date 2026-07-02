import { PageShell } from "@/components/PageShell";
import { RequestForm } from "@/components/RequestForm";

export default function NewRequestPage() {
  return (
    <PageShell
      title="New sample request"
      subtitle="Complete the steps below — details, samples, then review and submit."
    >
      <RequestForm />
    </PageShell>
  );
}
