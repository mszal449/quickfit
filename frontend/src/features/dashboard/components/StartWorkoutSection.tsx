import { useState } from "react";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { SectionLabel } from "../../../components/ui/SectionLabel";
import { SessionStartCard } from "./SessionStartCard";
import type { PlanStartGroup } from "../startOptions";

interface StartWorkoutSectionProps {
  groups: PlanStartGroup[];
  onStart: (planId: string, sessionId: string) => void;
  heading?: string;
  excludeSessionId?: string;
}

export function StartWorkoutSection({
  groups,
  onStart,
  heading = "Start a workout",
  excludeSessionId,
}: StartWorkoutSectionProps) {
  const [activePlanId, setActivePlanId] = useState(groups[0]?.plan_id ?? "");
  const active = groups.find((g) => g.plan_id === activePlanId) ?? groups[0];

  if (!active) return null;

  const ordered = [...active.sessions]
    .filter((s) => s.session_id !== excludeSessionId)
    .sort((a, b) => Number(b.is_suggested) - Number(a.is_suggested));

  if (ordered.length === 0) return null;

  return (
    <section>
      <SectionLabel>{heading}</SectionLabel>

      {groups.length > 1 && (
        <SegmentedTabs
          className="mb-3"
          tabs={groups.map((g) => ({ id: g.plan_id, label: g.plan_name }))}
          active={active.plan_id}
          onChange={setActivePlanId}
        />
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ordered.map((option) => (
          <SessionStartCard
            key={option.session_id}
            option={option}
            onStart={() => onStart(option.plan_id, option.session_id)}
          />
        ))}
      </div>
    </section>
  );
}
