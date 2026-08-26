import { Card, Container } from "./layout";

/** Shown wherever a feature needs Supabase keys that aren't set yet. */
export function SetupNotice({ what }: { what: string }) {
  return (
    <div className="py-16 sm:py-20">
      <Container size="narrow">
        <Card>
          <h1 className="text-xl font-semibold">{what} isn&apos;t set up yet</h1>
          <p className="mt-3 text-muted">
            Add your Supabase keys as{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em]">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em]">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            , then run{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em]">
              supabase/schema.sql
            </code>{" "}
            in your project. The README walks through it step by step.
          </p>
        </Card>
      </Container>
    </div>
  );
}
