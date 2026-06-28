import { ChevronLeftIcon } from "../../../components/icons";
import { formatClock } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface SessionTopBarProps {
  sessionName: string;
  elapsedSeconds: number;
  exerciseCount: number;
  currentExerciseIndex: number;
  incompleteIndices?: number[];
  onBack: () => void;
  onFinish: () => void;
  onSelectExercise: (index: number) => void;
}

/** Live-session header: back, centred title + running timer, finish, progress dots. */
export function SessionTopBar({
  sessionName,
  elapsedSeconds,
  exerciseCount,
  currentExerciseIndex,
  incompleteIndices = [],
  onBack,
  onFinish,
  onSelectExercise,
}: SessionTopBarProps) {
  return (
    <header
      className="border-border bg-bg/95 sticky top-0 z-30 border-b backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="text-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-primary/70 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronLeftIcon size={22} />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-faint font-mono text-[10px] tracking-[0.16em] uppercase">
            {sessionName}
          </span>
          <span className="tabular text-fg font-mono text-xl font-bold">
            {formatClock(elapsedSeconds)}
          </span>
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="text-primary hover:bg-primary-soft focus-visible:ring-primary/70 h-10 cursor-pointer rounded-lg px-3 font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          Finish
        </button>
      </div>

      <div className="mx-auto flex max-w-2xl gap-1.5 px-4 pb-3">
        {Array.from({ length: exerciseCount }).map((_, i) => {
          const isWarn = incompleteIndices.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectExercise(i)}
              aria-label={`Go to exercise ${i + 1}`}
              aria-current={i === currentExerciseIndex}
              className={cn(
                "h-2.5 flex-1 cursor-pointer rounded-full transition-colors",
                isWarn
                  ? "bg-warning"
                  : i < currentExerciseIndex
                    ? "bg-primary/50"
                    : i === currentExerciseIndex
                      ? "bg-primary"
                      : "bg-surface-3",
              )}
            />
          );
        })}
      </div>
    </header>
  );
}
