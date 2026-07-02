import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { SESSION_COOKIE, isReviewerAuthenticated } from "@/lib/session";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  const destination = callbackUrl ?? "/requests";
  const cookieStore = await cookies();
  const isReviewer = await isReviewerAuthenticated(cookieStore.get(SESSION_COOKIE)?.value);

  if (isReviewer) {
    return (
      <PageShell title="Reviewer sign in" subtitle="You are already signed in as a reviewer.">
        <div className="mx-auto max-w-sm">
          <Card>
            <p className="type-muted mb-6">
              Open the review board or browse all requests, or sign out from the header to switch
              sessions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/requests" className="btn-primary">
                Review board
              </Link>
              <Link href="/requests/all" className="btn-secondary">
                All requests
              </Link>
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reviewer sign in">
      <div className="mx-auto max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image src="/kobo-logo.png" alt="Kobo" width={140} height={40} className="h-8 w-auto" />
        </div>
        <Card>
          <LoginForm callbackUrl={destination} />
        </Card>
      </div>
    </PageShell>
  );
}
