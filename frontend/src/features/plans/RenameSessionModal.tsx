import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

interface RenameSessionModalProps {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isSubmitting: boolean;
}

export function RenameSessionModal({
  open,
  initialName,
  onClose,
  onSubmit,
  isSubmitting,
}: RenameSessionModalProps) {
  const [name, setName] = useState(initialName);
  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(name.trim());
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="rename-session-title">
      <h2
        id="rename-session-title"
        className="font-display text-fg text-2xl font-bold tracking-tight"
      >
        Rename session
      </h2>

      <div className="mt-4">
        <label className="text-faint mb-1.5 block font-mono text-[11px] tracking-wide uppercase">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
          autoFocus
          className="border-border bg-surface-2 text-fg placeholder:text-faint focus:border-primary/50 focus-visible:ring-primary/40 h-11 w-full rounded-xl border px-3.5 focus:outline-none focus-visible:ring-2"
        />
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} loading={isSubmitting}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
