type LogoProps = {
  className?: string;
  withWordmark?: boolean;
};

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="BoardView"
    >
      <rect x="3" y="7" width="26" height="18" rx="4" fill="currentColor" />
      <rect
        x="3"
        y="7"
        width="26"
        height="18"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.15"
      />
      <circle cx="16" cy="4.5" r="2.5" fill="currentColor" />
      <rect x="10" y="12" width="12" height="9" rx="1.5" fill="white" fillOpacity="0.92" />
    </svg>
  );
}

export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 text-accent ${className ?? ""}`}>
      <LogoMark />
      {withWordmark && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          BoardView
        </span>
      )}
    </span>
  );
}
