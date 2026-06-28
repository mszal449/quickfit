import { Link } from "react-router-dom";
import { Card } from "../../../components/ui/Card";
import { Tag } from "../../../components/ui/Tag";
import { ArrowRightIcon, LinkIcon } from "../../../components/icons";
import type { Plan } from "../../../mocks/types";

/** Plan summary tile in the plans list; links to the builder. */
export function PlanCard({ plan }: { plan: Plan }) {
  const sessionCount = plan.sessions.length;
  return (
    <Link
      to={`/plans/${plan.id}`}
      className="group focus-visible:ring-primary/70 block rounded-2xl focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="group-hover:border-border-strong flex h-full flex-col p-5 transition-colors">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="font-display text-fg text-xl font-bold tracking-tight">
            {plan.name}
          </h2>
          {plan.visibility === "shared" && (
            <Tag tone="primary">
              <LinkIcon size={12} /> Shared
            </Tag>
          )}
        </div>
        <p className="text-faint font-mono text-xs">{plan.schedule_label}</p>
        {plan.description && (
          <p className="text-muted mt-2 line-clamp-2 text-sm">
            {plan.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {plan.sessions.map((s) => (
            <Tag key={s.id} tone="muted">
              {s.name}
            </Tag>
          ))}
        </div>

        <div className="border-border mt-4 flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-faint font-mono text-xs">
            {sessionCount} sessions
          </span>
          <span className="text-primary flex items-center gap-1 font-semibold">
            Edit plan
            <ArrowRightIcon
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Card>
    </Link>
  );
}
