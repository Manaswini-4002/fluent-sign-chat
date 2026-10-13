import type { ReactNode } from "react";

export function PageHeading({ title, description, category, action }: { title: string; description: string; category: string; action?: ReactNode }) {
  return (
    <header className="page-heading">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-semibold uppercase text-primary">{category}</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="section-heading">
      <h2 className="text-lg font-semibold">{title}</h2>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}