const inputClasses =
  "w-full rounded-xl border border-black/10 bg-white/80 px-4 py-2.5 text-base text-foreground shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)] placeholder:text-muted/60 transition-colors hover:border-black/20 focus-visible:border-accent";

export function TextField({
  label,
  hint,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input className={inputClasses} {...props} />
      {hint && <span className="mt-1.5 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

/** Unlabelled input for inline/compact rows that carry their own heading. */
export function BareInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClasses} ${className}`} {...props} />;
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
    >
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent"
    >
      {message}
    </p>
  );
}
