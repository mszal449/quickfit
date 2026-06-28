import { Card } from "../../../components/ui/Card";
import { TrophyIcon } from "../../../components/icons";
import type { PersonalRecord } from "../../../mocks/types";
import { formatWeight, relativeTime } from "../../../lib/format";

/** Recent personal records list. Empty state guides the user when none exist. */
export function RecentPRs({ prs }: { prs: PersonalRecord[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrophyIcon size={18} className="text-primary" />
        <h2 className="text-fg text-base font-semibold">Recent PRs</h2>
      </div>

      {prs.length === 0 ? (
        <p className="text-muted py-6 text-center text-sm">
          No personal records yet — log a few sessions and they'll show up here.
        </p>
      ) : (
        <ul className="flex flex-col">
          {prs.map((pr, i) => (
            <li
              key={`${pr.exercise_name}-${pr.rep_label}`}
              className="border-border flex items-center gap-3 py-3 [&:not(:last-child)]:border-b"
            >
              <span className="bg-surface-2 text-faint flex h-9 w-12 items-center justify-center rounded-md font-mono text-[11px] font-semibold">
                {pr.rep_label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-fg truncate text-sm font-semibold">
                  {pr.exercise_name}
                </div>
                <div className="text-faint text-xs">
                  {relativeTime(pr.achieved_at)}
                </div>
              </div>
              <div className="tabular text-fg shrink-0 font-mono text-lg font-bold">
                {formatWeight(pr.weight)}
                <span className="text-faint ml-0.5 text-xs font-medium">
                  kg
                </span>
              </div>
              {i === 0 && (
                <span className="bg-primary-soft text-primary ml-1 hidden rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold sm:inline">
                  NEW
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
