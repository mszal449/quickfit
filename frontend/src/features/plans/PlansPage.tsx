import { usePlans } from "../../mocks/hooks";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PlusIcon } from "../../components/icons";
import { PlanCard } from "./components/PlanCard";

export function PlansPage() {
  const { data: plans } = usePlans();

  return (
    <div>
      <PageHeader
        title="Plans"
        actions={
          <Button iconLeft={<PlusIcon size={18} />}>
            <span className="hidden sm:inline">New plan</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {plans.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-muted">You don't have any plans yet.</p>
          <Button iconLeft={<PlusIcon size={18} />}>
            Create your first plan
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
