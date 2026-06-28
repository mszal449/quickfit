import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ArrowRightIcon } from "../../components/icons";
import { Logo } from "../../components/Logo";

const KEYWORDS = ["Plan", "Log", "Progress", "PRs"];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-bg relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute top-[-20%] left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full blur-[120px]"
      />
      <div
        aria-hidden
        className="bg-primary/[0.06] pointer-events-none absolute right-[-10%] bottom-[-20%] h-[50vh] w-[50vh] rounded-full blur-[120px]"
      />

      <header
        className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <Logo withWordmark />
        <Link
          to="/login"
          className="text-muted hover:text-fg focus-visible:ring-primary/70 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5">
        <div className="mx-auto w-full max-w-3xl py-16 text-center">
          <p
            className="rise text-primary font-mono text-[12px] font-semibold tracking-[0.28em] uppercase"
            style={{ animationDelay: "0ms" }}
          >
            QuickFit — training, tracked
          </p>

          <h1
            className="rise num text-fg mt-6 text-5xl sm:text-7xl lg:text-8xl"
            style={{ animationDelay: "80ms" }}
          >
            You know why
            <br />
            you&apos;re here
            <span className="blink bg-primary ml-2 inline-block h-[0.72em] w-[0.5ch] translate-y-[0.04em] align-baseline" />
          </h1>

          <p
            className="rise text-muted mx-auto mt-6 max-w-md text-base sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Build the plan. Log every set. Watch the numbers climb. No fluff.
          </p>

          <div
            className="rise mt-9 flex flex-col items-center gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <Button
              size="lg"
              className="px-8"
              onClick={() => navigate("/dashboard")}
              iconRight={<ArrowRightIcon size={20} />}
            >
              Get in
            </Button>

            <div className="text-faint flex items-center gap-2 font-mono text-[11px] tracking-wide uppercase">
              {KEYWORDS.map((word, i) => (
                <span key={word} className="flex items-center gap-2">
                  {i > 0 && <span className="text-border-strong">/</span>}
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="text-faint relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 font-mono text-[11px] tracking-wide">
        <span>© 2026 QuickFit</span>
        <span className="uppercase">Built for lifters</span>
      </footer>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise 600ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
        .blink { animation: blink 1.1s step-end infinite; }
      `}</style>
    </div>
  );
}
