import { cn } from "../../lib/cn";

interface Tab {
  id: string;
  label: string;
}

interface SegmentedTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Horizontal pill tabs (e.g. plan day selector: Lower A / Upper A / …).
 * Scrolls horizontally when tabs overflow so it never wraps awkwardly on mobile.
 */
export function SegmentedTabs({
  tabs,
  active,
  onChange,
  className,
}: SegmentedTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "h-10 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-semibold whitespace-nowrap",
              "focus-visible:ring-primary/70 transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
              isActive
                ? "bg-primary text-primary-fg"
                : "border-border bg-surface-2 text-muted hover:text-fg border",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
