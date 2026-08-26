export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <div className="glass-panel rounded-[2rem] p-8 sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      <input
        className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-2.5 text-base text-foreground placeholder:text-muted/70 focus-visible:border-accent"
        {...props}
      />
    </label>
  );
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
