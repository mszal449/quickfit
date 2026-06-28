import { useMemo, useState } from "react";
import { useExercises } from "../../mocks/hooks";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Tag";
import { PlusIcon, SearchIcon } from "../../components/icons";
import type { Exercise } from "../../mocks/types";

export function ExercisesPage() {
  const [search, setSearch] = useState("");
  const { data: exercises } = useExercises(search);

  // Group by muscle group for scannability.
  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const list = map.get(ex.muscle_group) ?? [];
      list.push(ex);
      map.set(ex.muscle_group, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [exercises]);

  return (
    <div>
      <PageHeader
        title="Exercises"
        actions={
          <Button iconLeft={<PlusIcon size={18} />}>
            <span className="hidden sm:inline">New exercise</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {/* search */}
      <div className="relative mb-5">
        <SearchIcon
          size={18}
          className="text-faint pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises or muscle groups…"
          aria-label="Search exercises"
          className="border-border bg-surface text-fg placeholder:text-faint focus:border-primary/50 focus-visible:ring-primary/40 h-12 w-full rounded-xl border pr-4 pl-11 focus:outline-none focus-visible:ring-2"
        />
      </div>

      {exercises.length === 0 ? (
        <Card className="text-muted p-10 text-center">
          No exercises match “{search}”.
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([muscle, list]) => (
            <section key={muscle}>
              <h2 className="text-faint mb-2 px-1 font-mono text-[11px] tracking-wide uppercase">
                {muscle} · {list.length}
              </h2>
              <Card className="divide-border divide-y overflow-hidden p-0">
                {list.map((ex) => (
                  <div
                    key={ex.id}
                    className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-fg truncate font-semibold">
                        {ex.name}
                      </div>
                      {ex.description && (
                        <div className="text-faint truncate text-sm">
                          {ex.description}
                        </div>
                      )}
                    </div>
                    <Tag tone={ex.category === "cardio" ? "primary" : "muted"}>
                      {ex.category}
                    </Tag>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
