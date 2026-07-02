import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 border border-line bg-surface p-4 sm:p-6 ${className}`}>
      {title ? <h2 className="type-card-title mb-5">{title}</h2> : null}
      {children}
    </section>
  );
}
