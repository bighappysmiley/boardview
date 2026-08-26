import { Card, Container } from "./layout";

/** Shown when accounts aren't available yet — written for teachers, not operators. */
export function SetupNotice({ what }: { what: string }) {
  return (
    <div className="py-16 sm:py-20">
      <Container size="narrow">
        <Card>
          <h1 className="text-xl font-semibold">{what}</h1>
          <p className="mt-3 text-muted">
            This isn&apos;t ready yet. Write to{" "}
            <a
              href="mailto:hello@boardview.org"
              className="font-medium text-accent hover:underline"
            >
              hello@boardview.org
            </a>{" "}
            and we&apos;ll help you get in.
          </p>
        </Card>
      </Container>
    </div>
  );
}
