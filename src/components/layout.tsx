import type { ReactNode } from "react";

/**
 * One horizontal gutter and one max width for every page, so nothing drifts
 * out of alignment between routes.
 */
export function Container({
  children,
  className = "",
  size = "wide",
}: {
  children: ReactNode;
  className?: string;
  size?: "wide" | "narrow" | "form";
}) {
  const widths = {
    wide: "max-w-5xl",
    narrow: "max-w-3xl",
    form: "max-w-md",
  };
  return (
    <div className={`mx-auto w-full ${widths[size]} px-6 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

/** A page section with the single vertical rhythm used site-wide. */
export function Section({
  children,
  className = "",
  size = "wide",
  id,
}: {
  children: ReactNode;
  className?: string;
  size?: "wide" | "narrow" | "form";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`py-16 sm:py-20 ${id ? "scroll-mt-24" : ""} ${className}`}
    >
      <Container size={size}>{children}</Container>
    </section>
  );
}

/** Section heading + optional lead paragraph, always spaced the same way. */
export function SectionHeader({
  title,
  lead,
  centered = false,
}: {
  title: string;
  lead?: string;
  centered?: boolean;
}) {
  return (
    <div className={`mb-10 ${centered ? "text-center" : ""}`}>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p
          className={`mt-3 max-w-xl text-lg leading-relaxed text-muted ${
            centered ? "mx-auto" : ""
          }`}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

/** Name + definition rows. Used for product specs, not marketing cards. */
export function SpecRows({
  items,
}: {
  items: { term: string; detail: ReactNode }[];
}) {
  return (
    <dl className="border-t border-black/10">
      {items.map((item) => (
        <div
          key={item.term}
          className="grid gap-2 border-b border-black/10 py-7 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-10"
        >
          <dt className="font-medium">{item.term}</dt>
          <dd className="leading-relaxed text-muted">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Every card on the site uses this padding and radius. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  /** @deprecated Hairline panels only; kept so existing call sites compile. */
  solid?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-black/10 bg-white p-6 ${className}`}>
      {children}
    </div>
  );
}
