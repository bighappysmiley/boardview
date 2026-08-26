import { Card, Container } from "./layout";

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
    <div className="py-16 sm:py-20">
      <Container size="form">
        <Card>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </Card>
      </Container>
    </div>
  );
}

export { TextField as FormField, FormError, FormNotice } from "./form";
