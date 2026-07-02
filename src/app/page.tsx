import Link from "next/link";
import { cookies } from "next/headers";
import { PageShell } from "@/components/PageShell";
import { SESSION_COOKIE, isReviewerAuthenticated } from "@/lib/session";

export default async function HomePage() {
  const cookieStore = await cookies();
  const isReviewer = await isReviewerAuthenticated(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <PageShell title="Lab sample requests">
      <div className={`grid gap-6 ${isReviewer ? "md:grid-cols-2" : "max-w-xl"}`}>
        <section className="home-card">
          <h2 className="type-section-title mb-2">Submit a request</h2>
          <p className="type-muted mb-6 flex-1">
            Create a new request, add one or more formulas, and submit as a single batch.
          </p>
          <Link href="/request/new" className="btn-primary w-fit">
            New sample request
          </Link>
        </section>
        {isReviewer ? (
          <section className="home-card">
            <h2 className="type-section-title mb-2">Reviewer area</h2>
            <p className="type-muted mb-6 flex-1">
              Process formulas on the review board or browse the full request registry.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/requests" className="btn-primary">
                Open review board
              </Link>
              <Link href="/requests/all" className="btn-secondary">
                All requests
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
