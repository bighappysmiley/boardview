const inputClasses =
  "w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-base text-foreground placeholder:text-muted/70 transition-colors hover:border-black/20 focus-visible:border-accent";

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
      className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-foreground">
      {message}
    </p>
  );
}

export function TextArea({
  label,
  hint,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea
        className={`${inputClasses} min-h-28 resize-y`}
        {...props}
      />
      {hint && <span className="mt-1.5 block text-sm text-muted">{hint}</span>}
    </label>
  );
}
