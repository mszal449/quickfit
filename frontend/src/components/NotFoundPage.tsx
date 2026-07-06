import { useNavigate } from "react-router-dom";
import { Button } from "./ui/Button";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-bg flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="font-display text-primary num text-6xl">404</span>
      <p className="text-muted">This page doesn't exist.</p>
      <Button variant="secondary" onClick={() => navigate("/dashboard")}>
        Back to dashboard
      </Button>
    </div>
  );
}
