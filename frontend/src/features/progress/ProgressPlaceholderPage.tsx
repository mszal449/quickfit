import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { ProgressIcon } from "../../components/icons";

export function ProgressPlaceholderPage() {
  return (
    <div>
      <PageHeader title="Progress" />
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <ProgressIcon size={28} className="text-faint" />
        <p className="text-muted">Progress tracking is coming soon.</p>
        <p className="text-faint text-sm">
          Volume trends, PR timelines, and per-exercise charts will land once
          there's enough logged history to make them useful.
        </p>
      </Card>
    </div>
  );
}
