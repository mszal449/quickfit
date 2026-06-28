import logo from "../assets/logo.svg";
import { cn } from "../lib/cn";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function Logo({
  size = 32,
  withWordmark = false,
  className,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src={logo} alt="QuickFit" width={size} height={size} />
      {withWordmark && (
        <span className="font-display text-fg text-xl font-bold tracking-tight">
          QuickFit
        </span>
      )}
    </span>
  );
}
