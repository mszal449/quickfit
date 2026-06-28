import { cn } from "../../lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-150",
        "focus-visible:ring-primary/70 focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        checked
          ? "border-primary bg-primary"
          : "border-border-strong bg-surface-3",
      )}
    >
      <span
        className={cn(
          "bg-fg absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform duration-150",
          checked && "bg-primary-fg translate-x-5",
        )}
      />
    </button>
  );
}
