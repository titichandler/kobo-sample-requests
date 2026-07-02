import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="type-caption mb-6" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-ink-faint">/</span> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-ink" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
