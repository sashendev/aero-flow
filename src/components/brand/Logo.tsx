import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-xl shadow-glow"
        style={{ background: "var(--gradient-primary)" }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary-foreground" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"/>
        </svg>
      </span>
      <span className="font-display text-lg tracking-tight">Aero Flow</span>
    </span>
  );
}
