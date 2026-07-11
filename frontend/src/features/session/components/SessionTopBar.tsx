import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  ListIcon,
  MoreIcon,
} from "../../../components/icons";
import { formatClock } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { Menu } from "../../../components/ui/Menu";

interface ExerciseNavItem {
  name: string;
  done: boolean;
  warn: boolean;
}

interface SessionTopBarProps {
  sessionName: string;
  elapsedSeconds: number;
  exerciseCount: number;
  currentExerciseIndex: number;
  incompleteIndices?: number[];
  exercises?: ExerciseNavItem[];
  onBack: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onSelectExercise: (index: number) => void;
}

export function SessionTopBar({
  sessionName,
  elapsedSeconds,
  exerciseCount,
  currentExerciseIndex,
  incompleteIndices = [],
  exercises = [],
  onBack,
  onFinish,
  onCancel,
  onSelectExercise,
}: SessionTopBarProps) {
  const [listOpen, setListOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setListOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setListOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [listOpen]);

  const selectExercise = (index: number) => {
    setListOpen(false);
    onSelectExercise(index);
  };

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

        <div className="flex min-w-0 flex-col items-center">
          <span className="text-faint max-w-[60vw] truncate font-mono text-[10px] tracking-[0.16em] uppercase">
            {sessionName}
          </span>
          <span className="tabular text-fg font-mono text-xl font-bold">
            {formatClock(elapsedSeconds)}
          </span>
        </div>

        <Menu
          label="Session options"
          trigger={<MoreIcon size={18} />}
          items={[
            {
              label: "Finish workout",
              icon: <CheckIcon size={16} />,
              onSelect: onFinish,
            },
            {
              label: "Cancel workout",
              icon: <CloseIcon size={16} />,
              destructive: true,
              onSelect: onCancel,
            },
          ]}
        />
      </div>

      <div ref={navRef} className="relative mx-auto max-w-2xl px-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1.5">
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

          {exercises.length > 0 && (
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={listOpen}
              aria-label="Exercise list"
              className="text-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-primary/70 flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <ListIcon size={15} />
              <span className="tabular">
                {currentExerciseIndex + 1}/{exerciseCount}
              </span>
            </button>
          )}
        </div>

        {listOpen && exercises.length > 0 && (
          <div
            role="menu"
            className="border-border bg-surface-2 absolute right-4 left-4 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border p-1 shadow-xl shadow-black/40"
          >
            {exercises.map((ex, i) => {
              const isCurrent = i === currentExerciseIndex;
              return (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  onClick={() => selectExercise(i)}
                  aria-current={isCurrent}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isCurrent ? "bg-surface-3" : "hover:bg-surface-3",
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      ex.warn
                        ? "bg-warning"
                        : ex.done
                          ? "bg-primary"
                          : isCurrent
                            ? "bg-primary"
                            : "border-border-strong border bg-transparent",
                    )}
                  />
                  <span className="text-faint w-5 shrink-0 font-mono text-xs">
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      isCurrent ? "text-fg font-semibold" : "text-fg",
                    )}
                  >
                    {ex.name}
                  </span>
                  {ex.warn ? (
                    <span className="text-warning shrink-0 font-mono text-[10px] tracking-wide uppercase">
                      Skipped
                    </span>
                  ) : ex.done ? (
                    <CheckIcon size={15} className="text-primary shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
