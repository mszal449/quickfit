import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentUser } from "./useCurrentUser";
import { useAuth } from "./useAuth";
import { clearReturnTo, peekReturnTo } from "./returnTo";
import { Button } from "../components/ui/Button";
import { ChevronLeftIcon } from "../components/icons";
import { Logo } from "../components/Logo";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.94H1.3v3.1A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.32a7.2 7.2 0 0 1 0-4.63v-3.1H1.3a12 12 0 0 0 0 10.83l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.17 15.24 0 12 0A11.99 11.99 0 0 0 1.3 6.59l4.01 3.1C6.25 6.85 8.89 4.75 12 4.75z"
      />
    </svg>
  );
}

function AuthSplash({ label }: { label: string }) {
  return (
    <div className="bg-bg flex min-h-dvh items-center justify-center">
      <div className="text-muted flex items-center gap-3 font-mono text-sm">
        <span className="border-border-strong border-t-primary h-4 w-4 animate-spin rounded-full border-2" />
        {label}
      </div>
    </div>
  );
}

const LoginPage = () => {
  const { data: user, isLoading } = useCurrentUser();
  const { login } = useAuth();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (user && !redirected.current) {
      redirected.current = true;
      const target = peekReturnTo() ?? "/dashboard";
      clearReturnTo();
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  if (isLoading) return <AuthSplash label="Loading…" />;
  if (user) return <AuthSplash label="Taking you in…" />;

  return (
    <div className="bg-bg relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute top-[-20%] left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full blur-[120px]"
      />

      <header
        className="relative z-10 mx-auto w-full max-w-6xl px-5 py-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <Link to="/">
          <Logo withWordmark />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5">
        <div className="rise w-full max-w-sm">
          <p className="text-primary font-mono text-[12px] font-semibold tracking-[0.28em] uppercase">
            Welcome back
          </p>
          <h1 className="num text-fg mt-4 text-5xl sm:text-6xl">
            Let&apos;s get to work
          </h1>
          <p className="text-muted mt-4 text-base">
            Sign in to pick up your plans, sessions and PRs where you left them.
          </p>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            className="mt-8"
            onClick={login}
            iconLeft={<GoogleMark />}
          >
            Continue with Google
          </Button>

          <p className="text-faint mt-4 text-center font-mono text-[11px] tracking-wide">
            By continuing you agree to the Terms &amp; Privacy Policy.
          </p>

          <Link
            to="/"
            className="text-muted hover:text-fg mt-8 inline-flex items-center gap-1 text-sm font-medium transition-colors"
          >
            <ChevronLeftIcon size={16} />
            Back to home
          </Link>
        </div>
      </main>

      <footer className="text-faint relative z-10 mx-auto w-full max-w-6xl px-5 py-5 font-mono text-[11px] tracking-wide">
        © 2026 QuickFit
      </footer>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise 600ms cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  );
};

export default LoginPage;
