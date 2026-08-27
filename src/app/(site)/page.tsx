import { ButtonLink } from "@/components/Button";
import { Section, SectionHeader, SpecRows } from "@/components/layout";

const system = [
  {
    term: "Camera",
    detail:
      "Goes on the ceiling or wall, facing the board, a second board, or a poster.",
  },
  {
    term: "Desk screen",
    detail:
      "A small screen on the student's desk. They enter a PIN, then it only shows the board.",
  },
  {
    term: "Your computer",
    detail:
      "Map the room, seat students, name each view, and hide the board when it isn't part of the lesson.",
  },
];

const steps = [
  {
    term: "1",
    detail: (
      <>
        <span className="font-medium text-foreground">Put up the cameras.</span>{" "}
        Point one at each board or poster the student needs to see.
      </>
    ),
  },
  {
    term: "2",
    detail: (
      <>
        <span className="font-medium text-foreground">Map the room.</span>{" "}
        Place seats, screens, and the teacher&apos;s desk. Give each student a
        PIN.
      </>
    ),
  },
  {
    term: "3",
    detail: (
      <>
        <span className="font-medium text-foreground">They see the board.</span>{" "}
        The desk screen unlocks with their PIN. Next view goes to the next
        camera.
      </>
    ),
  },
];

const views = ["Front whiteboard", "Side whiteboard", "Poster"];

export default function Home() {
  return (
    <>
      <Section className="hero-wash !pt-20 sm:!pt-28">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
          The board, at their desk.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          When a student can&apos;t see the board — low vision, or the back of
          the room — BoardView puts it on a small screen on their desk.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/signup">Create an account</ButtonLink>
          <ButtonLink href="/request" variant="secondary">
            Request BoardView
          </ButtonLink>
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="What you get"
          lead="A camera, a desk screen, and controls on your computer. Nothing else on the desk."
        />
        <SpecRows items={system} />
      </Section>

      <Section id="how-it-works">
        <SectionHeader
          title="How it works"
          lead="A few minutes to set up. After that, the student enters a PIN and presses one button."
        />
        <SpecRows items={steps} />
      </Section>

      <Section id="multi-camera">
        <SectionHeader
          title="As many views as the room needs"
          lead="Lessons don't stay on one board. Add a camera for each surface. The student moves between them with one button."
        />
        <ul className="max-w-md border-t border-black/10">
          {views.map((label, i) => (
            <li
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-black/10 py-4"
            >
              <span>{label}</span>
              <span className="text-sm text-muted">{i + 1}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeader
          title="Hide the board when it isn't needed"
          lead="From your computer you can hide it for the whole class, or for one student. The screen keeps the time and the BoardView name — nothing else."
        />
      </Section>

      <Section>
        <div className="max-w-xl border-t border-black/10 pt-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Start with an account
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            Create an account, then submit a request for a classroom trial or
            for hardware. We review each request before anything is sent or
            billed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Create an account</ButtonLink>
            <ButtonLink href="/request" variant="secondary">
              Request BoardView
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
