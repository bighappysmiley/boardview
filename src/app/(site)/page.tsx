import { ButtonLink } from "@/components/Button";
import { Section, SectionHeader } from "@/components/layout";
import { ScreenDemo } from "@/components/ScreenDemo";
import { demoCameras } from "@/lib/demo";

const steps = [
  {
    title: "Mount the cameras",
    body: "Point one at each thing the student needs to see — the front board, a second board, a poster.",
  },
  {
    title: "Name the views",
    body: "From your computer, give each camera a name the student will recognise.",
  },
  {
    title: "They pick their view",
    body: "The desk screen shows one camera at a time. Next view moves to the next one.",
  },
];

export default function Home() {
  return (
    <>
      <Section className="!pt-12 sm:!pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              The board, at their desk.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              A small camera on the board. A small screen on the student&apos;s
              desk. The student sees what&apos;s written, from anywhere in the
              room.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Create an account</ButtonLink>
              <ButtonLink href="/pricing" variant="secondary">
                Get the hardware
              </ButtonLink>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[22rem]">
            <ScreenDemo />
            <p className="mt-3 text-center text-sm text-muted">
              Press <strong className="font-medium text-foreground">Next view</strong>{" "}
              to switch cameras.
            </p>
          </div>
        </div>
      </Section>

      <Section id="how-it-works">
        <SectionHeader
          title="How it works"
          lead="Three steps. No extra apps on the desk."
        />
        <ol className="max-w-2xl space-y-8">
          {steps.map((item, i) => (
            <li key={item.title}>
              <p className="text-sm text-muted">{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
              <p className="mt-1.5 leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="multi-camera">
        <SectionHeader
          title="As many views as the room needs"
          lead="A lesson doesn't stay on one board. Add a camera for each surface; the student moves between them with one button."
        />
        <ul className="max-w-md space-y-3">
          {demoCameras.map((camera) => (
            <li
              key={camera.id}
              className="flex items-baseline justify-between gap-4 border-b border-black/10 py-3"
            >
              <span>{camera.label}</span>
              <span className="font-mono text-sm text-muted">
                {camera.position + 1}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-xl text-muted">
          Rename them, reorder them, or add another mid-year. The screen
          updates on its own.
        </p>
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              title="Black out the screen when the board isn't needed"
              lead="From your account you can hide the feed instantly. The screen keeps the time and the BoardView name — nothing else."
            />
            <ButtonLink href="/screen/demo" variant="secondary">
              Preview the screen
            </ButtonLink>
          </div>
          <div className="mx-auto w-full max-w-[22rem]">
            <ScreenDemo mode="blackout" />
          </div>
        </div>
      </Section>

      <Section>
        <div className="max-w-xl border-t border-black/10 pt-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Free for every classroom
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            The software is free. Hardware is bought once, per room.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Create an account</ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">
              Get the hardware
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
