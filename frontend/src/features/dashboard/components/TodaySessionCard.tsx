import { useNavigate } from "react-router-dom";
import { Card, Eyebrow } from "../../../components/ui/Card";
import { Tag } from "../../../components/ui/Tag";
import { Button } from "../../../components/ui/Button";
import { ArrowRightIcon } from "../../../components/icons";
import type { DashboardData } from "../../../mocks/types";

type Today = NonNullable<DashboardData["today"]>;

/** Hero "what's on today" card with a clear single CTA into the live session. */
export function TodaySessionCard({ today }: { today: Today }) {
  const navigate = useNavigate();
  const start = () => navigate("/session/live");

  return (
    <Card className="relative overflow-hidden p-5">
      {/* subtle accent glow, decorative */}
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full blur-3xl"
      />
      <Eyebrow>
        Today · {today.plan_name} · {today.session_name}
      </Eyebrow>

      <div className="mt-3 flex items-end gap-3">
        <span className="tabular text-fg font-mono text-5xl leading-none font-bold">
          {today.exercise_count}
        </span>
        <span className="text-muted pb-1 text-lg">exercises</span>
      </div>

      <div className="text-faint mt-2 flex items-center gap-2 font-mono text-xs">
        <span>{today.set_count} sets</span>
        <span>·</span>
        <span>~{today.est_minutes} min</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {today.exercise_preview.map((name) => (
          <Tag key={name} tone="muted">
            {name}
          </Tag>
        ))}
        <Tag tone="muted">
          +{Math.max(0, today.exercise_count - today.exercise_preview.length)}{" "}
          more
        </Tag>
      </div>

      <Button
        className="mt-5"
        size="lg"
        fullWidth
        onClick={start}
        iconRight={<ArrowRightIcon size={20} />}
      >
        Start session
      </Button>
    </Card>
  );
}
