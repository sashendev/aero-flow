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
          <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 013 16.5v-9c0-.38.21-.71.53-.88L11.43 2.18a1.02 1.02 0 011.14 0l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L5.04 8 12 11.85 18.96 8 12 4.15z" />
        </svg>
      </span>
      <span className="font-display text-lg tracking-tight">AeroFlow</span>
    </span>
  );
}
