import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function NotFoundPage() {
  return (
    <PageShell title="Not found" subtitle="That request could not be found.">
      <Link href="/requests" className="btn-secondary">
        Back to all requests
      </Link>
    </PageShell>
  );
}
