import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-bg flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-fg font-semibold">Something went wrong.</p>
          <p className="text-muted text-sm">
            Try reloading the page. If it keeps happening, let us know.
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
