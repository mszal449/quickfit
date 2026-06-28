import type { ReactNode } from "react";
import { Eyebrow } from "../ui/Card";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  /** Right-aligned actions (CTA buttons etc.). Wraps below on small screens. */
  actions?: ReactNode;
}

/** Consistent page heading block used at the top of each route. */
export function PageHeader({ eyebrow, title, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-1 block">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-fg text-3xl leading-none font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
