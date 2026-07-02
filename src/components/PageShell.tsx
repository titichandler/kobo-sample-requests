import type { ReactNode } from "react";
import type { BreadcrumbItem } from "@/components/Breadcrumbs";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export function PageShell({
  title,
  subtitle,
  breadcrumbs,
  meta,
  children,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="mb-8 sm:mb-10">
        <h1 className="type-page-title">{title}</h1>
        {subtitle ? <p className="type-page-lead mt-2 max-w-2xl">{subtitle}</p> : null}
        {meta ? <div className="type-muted mt-4">{meta}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
