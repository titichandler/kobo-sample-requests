import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { NavLink } from "@/components/NavLink";
import { SignOutButton } from "@/components/SignOutButton";
import { SESSION_COOKIE, isReviewerAuthenticated } from "@/lib/session";

export async function SiteHeader() {
  const cookieStore = await cookies();
  const isReviewer = await isReviewerAuthenticated(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:gap-8 sm:px-6">
        <Link href="/" className="flex items-center gap-4">
          <Image
            src="/kobo-logo.png"
            alt="Kobo"
            width={120}
            height={32}
            className="h-7 w-auto"
            priority
          />
          <span className="type-caption hidden border-l border-line pl-4 sm:inline">
            Sample Requests
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink href="/request/new">New request</NavLink>
          {isReviewer ? (
            <>
              <NavLink href="/requests" exact>
                Review board
              </NavLink>
              <NavLink href="/requests/all">All requests</NavLink>
              <SignOutButton />
            </>
          ) : (
            <NavLink href="/login" exact>
              Sign in to reviewer area
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
