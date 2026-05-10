import mascot from "@/assets/mascot.png";
import { cn } from "@/lib/utils";

export function LoadingScreen({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "grid min-h-screen place-items-center bg-gradient-sunset px-6",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse-ring [animation-delay:600ms]" />
          <img
            src={mascot}
            alt=""
            width={120}
            height={120}
            className="relative h-28 w-28 animate-bounce-soft drop-shadow-lg"
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-bounce-dot" />
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-bounce-dot [animation-delay:150ms]" />
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-bounce-dot [animation-delay:300ms]" />
          <span className="ml-2">{label}</span>
        </div>
      </div>
    </main>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      aria-hidden="true"
    />
  );
}
