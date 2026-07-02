import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import type { PlanOut } from "../../api/generated/quickfitApi.schemas";

export interface PlanFormValues {
  name: string;
  description: string | null;
}

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PlanFormValues) => void;
  isSubmitting: boolean;
  plan?: Pick<PlanOut, "name" | "description"> | null;
}

const inputClass =
  "border-border bg-surface-2 text-fg placeholder:text-faint focus:border-primary/50 focus-visible:ring-primary/40 h-11 w-full rounded-xl border px-3.5 focus:outline-none focus-visible:ring-2";

export function PlanFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  plan,
}: PlanFormModalProps) {
  const isEdit = !!plan;
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), description: description.trim() || null });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="plan-form-title">
      <h2 id="plan-form-title" className="font-display text-fg text-2xl font-bold tracking-tight">
        {isEdit ? "Edit plan" : "New plan"}
      </h2>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label className="text-faint mb-1.5 block font-mono text-[11px] tracking-wide uppercase">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Upper / Lower split"
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className="text-faint mb-1.5 block font-mono text-[11px] tracking-wide uppercase">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Goal, split, duration…"
            rows={2}
            className={`${inputClass} h-auto resize-none py-2.5`}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} loading={isSubmitting}>
          {isEdit ? "Save changes" : "Create plan"}
        </Button>
      </div>
    </Modal>
  );
}
