import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
  isSubmitting: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "border-border bg-surface-2 text-fg placeholder:text-faint focus:border-primary/50 focus-visible:ring-primary/40 h-11 w-full rounded-xl border px-3.5 focus:outline-none focus-visible:ring-2";

export function AddFriendModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: AddFriendModalProps) {
  const [email, setEmail] = useState("");

  const canSubmit = EMAIL_PATTERN.test(email.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(email.trim());
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setEmail("");
        onClose();
      }}
      labelledBy="add-friend-title"
    >
      <h2
        id="add-friend-title"
        className="font-display text-fg text-2xl font-bold tracking-tight"
      >
        Add friend
      </h2>
      <p className="text-muted mt-2 text-sm">
        Send a friend request by email. They'll need to accept before you can
        share plans.
      </p>

      <div className="mt-4">
        <label className="text-faint mb-1.5 block font-mono text-[11px] tracking-wide uppercase">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="friend@example.com"
          className={inputClass}
          autoFocus
        />
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
        >
          Send request
        </Button>
      </div>
    </Modal>
  );
}
