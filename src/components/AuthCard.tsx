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
        <Card className="!p-8 sm:!p-9">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </Card>
      </Container>
    </div>
  );
}

export { TextField as FormField, FormError, FormNotice } from "./form";
