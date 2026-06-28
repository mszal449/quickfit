import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlan } from "../../mocks/hooks";
import { Button } from "../../components/ui/Button";
import { Card, Eyebrow } from "../../components/ui/Card";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { ChevronLeftIcon, PlusIcon } from "../../components/icons";
import { ExerciseCard } from "./components/ExerciseCard";
import { SupersetGroup } from "./components/SupersetGroup";
import { groupExercises } from "./groupExercises";

export function PlanBuilderPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { data: plan } = usePlan(planId);
  const [activeSessionId, setActiveSessionId] = useState(
    plan?.sessions[0]?.id ?? "",
  );

  if (!plan) {
    return (
      <Card className="text-muted p-10 text-center">
        Plan not found.
        <div className="mt-3">
          <Button variant="secondary" onClick={() => navigate("/plans")}>
            Back to plans
          </Button>
        </div>
      </Card>
    );
  }

  const activeSession =
    plan.sessions.find((s) => s.id === activeSessionId) ?? plan.sessions[0];
  const units = groupExercises(activeSession.exercises);

  return (
    <div className="mx-auto max-w-2xl">
      {/* header */}
      <button
        onClick={() => navigate("/plans")}
        className="text-muted hover:text-fg mb-3 flex cursor-pointer items-center gap-1 text-sm font-medium"
      >
        <ChevronLeftIcon size={18} /> Plans
      </button>

      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-1 block">Edit plan</Eyebrow>
          <h1 className="font-display text-fg text-3xl font-bold tracking-tight">
            {plan.name}
          </h1>
          <p className="text-faint mt-1 font-mono text-xs">
            {plan.schedule_label}
          </p>
        </div>
        <Button>Save</Button>
      </div>

      {/* day selector */}
      <SegmentedTabs
        className="mb-5"
        tabs={plan.sessions.map((s) => ({ id: s.id, label: s.name }))}
        active={activeSession.id}
        onChange={setActiveSessionId}
      />

      {/* exercises (with supersets grouped) */}
      <div className="flex flex-col gap-3">
        {units.map((unit, i) =>
          unit.kind === "single" ? (
            <ExerciseCard
              key={unit.exercise.exercise_id + i}
              exercise={unit.exercise}
            />
          ) : (
            <SupersetGroup key={unit.superset_id} label={unit.label}>
              {unit.exercises.map((ex) => (
                <ExerciseCard key={ex.exercise_id} exercise={ex} />
              ))}
            </SupersetGroup>
          ),
        )}
      </div>

      {/* add exercise */}
      <button className="border-border-strong text-muted hover:border-primary/50 hover:text-primary mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-4 font-semibold transition-colors">
        <PlusIcon size={18} /> Add exercise
      </button>
    </div>
  );
}
