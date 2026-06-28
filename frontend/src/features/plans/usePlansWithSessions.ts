import { useQueries } from "@tanstack/react-query";
import { useGetPlansGet } from "../../api/generated/plan/plan";
import { getGetSessionsGetQueryOptions } from "../../api/generated/plan-session/plan-session";
import type {
  PlanOut,
  PlanSessionOut,
} from "../../api/generated/quickfitApi.schemas";

export interface PlanWithSessions extends PlanOut {
  sessions: PlanSessionOut[];
}

export function usePlansWithSessions() {
  const { data: plansPage, isLoading: plansLoading } = useGetPlansGet();
  const plans = plansPage?.items ?? [];

  const sessionQueries = useQueries({
    queries: plans.map((plan: PlanOut) =>
      getGetSessionsGetQueryOptions(plan.id),
    ),
  });

  const isLoading = plansLoading || sessionQueries.some((q) => q.isLoading);
  const data: PlanWithSessions[] = plans.map((plan, i) => ({
    ...plan,
    sessions: sessionQueries[i]?.data?.items ?? [],
  }));

  return { data, isLoading };
}
