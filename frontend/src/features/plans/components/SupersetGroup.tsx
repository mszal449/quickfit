import type { ReactNode } from "react";
import { LinkIcon } from "../../../components/icons";

/** Visual wrapper grouping back-to-back superset exercises under one labelled frame. */
export function SupersetGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-primary/25 bg-primary-soft rounded-2xl border p-2.5">
      <div className="text-primary mb-2 flex items-center gap-1.5 px-1 font-mono text-[10px] tracking-wide uppercase">
        <LinkIcon size={13} />
        Superset {label}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
