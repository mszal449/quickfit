import { useMemo } from "react";
import { useGetExercisesGet } from "../../api/generated/exercise/exercise";

export function useExerciseNames() {
  const { data, isLoading } = useGetExercisesGet();

  const namesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of data?.items ?? []) map.set(ex.id, ex.name);
    return map;
  }, [data]);

  return { namesById, isLoading };
}
