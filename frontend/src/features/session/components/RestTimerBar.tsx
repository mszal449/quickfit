import { TimerIcon } from "../../../components/icons";
import { formatClock } from "../../../lib/format";

interface RestTimerBarProps {
  secondsLeft: number;
  totalSeconds: number;
  onSkip: () => void;
  onAddTime: (delta: number) => void;
}

export function RestTimerBar({
  secondsLeft,
  totalSeconds,
  onSkip,
  onAddTime,
}: RestTimerBarProps) {
  const progress =
    totalSeconds > 0 ? Math.min(1, secondsLeft / totalSeconds) : 0;

  return (
    <div className="border-primary/30 bg-primary-soft relative overflow-hidden rounded-2xl border p-3 sm:p-4">
      <div
        className="bg-primary/15 absolute inset-y-0 left-0 transition-[width] duration-200 ease-linear"
        style={{ width: `${progress * 100}%` }}
      />
      <div className="relative flex items-center gap-3">
        <TimerIcon size={18} className="text-primary shrink-0" />
        <div className="flex-1">
          <div className="text-primary font-mono text-[11px] tracking-wide uppercase">
            Resting
          </div>
          <div className="tabular num text-fg text-2xl leading-none">
            {formatClock(secondsLeft)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAddTime(15)}
          className="border-border-strong bg-surface text-muted hover:text-fg cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-xs"
        >
          +15s
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="border-border-strong bg-surface text-muted hover:text-fg cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-xs"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
