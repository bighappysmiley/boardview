type LogoProps = {
  className?: string;
  withWordmark?: boolean;
};

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="BoardView"
    >
      <rect x="3" y="7" width="26" height="18" rx="3" fill="currentColor" />
      <circle cx="16" cy="4.5" r="2.2" fill="currentColor" />
      <rect
        x="10"
        y="12"
        width="12"
        height="9"
        rx="1.25"
        fill="#0b0d12"
      />
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
