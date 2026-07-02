import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="type-caption mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-3 px-4 py-6 text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Kobo — Internal sample request portal</span>
        <div className="flex flex-wrap gap-4">
          <Link href="/request/new" className="hover:text-ink">
            New request
          </Link>
          <Link href="/requests" className="hover:text-ink">
            Review board
          </Link>
          <Link href="/requests/all" className="hover:text-ink">
            All requests
          </Link>
        </div>
      </div>
    </footer>
  );
}
