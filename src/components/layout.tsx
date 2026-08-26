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
  // Sized in rem against the 17px root, so these stay a comfortable measure
  // rather than running edge-to-edge on a 1280px screen.
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
    <section id={id} className={`py-14 sm:py-16 ${id ? "scroll-mt-24" : ""} ${className}`}>
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
    <div className={`mb-9 ${centered ? "text-center" : ""}`}>
      <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
      {lead && (
        <p
          className={`mt-3 max-w-2xl text-lg leading-relaxed text-muted ${
            centered ? "mx-auto" : ""
          }`}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

/** Every card on the site uses this padding and radius. */
export function Card({
  children,
  className = "",
  solid = false,
}: {
  children: ReactNode;
  className?: string;
  solid?: boolean;
}) {
  return (
    <div
      className={`${solid ? "glass-panel-solid" : "glass-panel"} rounded-3xl p-7 sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
