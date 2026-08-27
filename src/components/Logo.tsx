type LogoProps = {
  className?: string;
  withWordmark?: boolean;
};

/** Classroom board over a smaller desk screen. Accent blue, no mascot. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="BoardView"
    >
      <rect x="4" y="6" width="24" height="14" rx="2.5" fill="#0071e3" />
      <rect x="10" y="22" width="12" height="5.5" rx="1.5" fill="#0071e3" />
    </svg>
  );
}

export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-foreground ${className ?? ""}`}
    >
      <LogoMark />
      {withWordmark && (
        <span className="text-[1.05rem] font-semibold tracking-tight">
          BoardView
        </span>
      )}
    </span>
  );
}
