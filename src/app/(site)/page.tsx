import { ButtonLink } from "@/components/Button";
import { Section, SectionHeader, SpecRows } from "@/components/layout";

const system = [
  {
    term: "Camera",
    detail:
      "Mounts on the ceiling or wall, pointed at a whiteboard, a second board, or a poster.",
  },
  {
    term: "Desk screen",
    detail:
      "Sits on the student's desk. It shows the board. It runs no other apps.",
  },
  {
    term: "Teacher controls",
    detail:
      "From your computer you name the views, set their order, and black the screen out when the board is not part of the lesson.",
  },
];

const steps = [
  {
    term: "1",
    detail: (
      <>
        <span className="font-medium text-foreground">Mount the cameras.</span>{" "}
        Point one at each thing the student needs to see.
      </>
    ),
  },
  {
    term: "2",
    detail: (
      <>
        <span className="font-medium text-foreground">Name the views.</span>{" "}
        Give each camera a name the student will recognise.
      </>
    ),
  },
  {
    term: "3",
    detail: (
      <>
        <span className="font-medium text-foreground">They pick their view.</span>{" "}
        The desk screen shows one camera at a time. Next view moves to the next
        one.
      </>
    ),
  },
];

const views = ["Front whiteboard", "Side whiteboard", "Poster"];

export default function Home() {
  return (
    <>
      <Section className="!pt-20 sm:!pt-28">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
          The board, at their desk.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          For students who cannot see the classroom board — because of low
          vision, or because they sit too far away. A camera on the board. A
          screen on the desk.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/signup">Create an account</ButtonLink>
          <ButtonLink href="/pricing" variant="secondary">
            Hardware
          </ButtonLink>
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="The system"
          lead="Two pieces of hardware, and the controls on your computer. Nothing else on the desk."
        />
        <SpecRows items={system} />
      </Section>

      <Section id="how-it-works">
        <SectionHeader
          title="How it works"
          lead="Set up once. The student uses one button."
        />
        <SpecRows items={steps} />
      </Section>

      <Section id="multi-camera">
        <SectionHeader
          title="As many views as the room needs"
          lead="A lesson does not stay on one board. Add a camera for each surface. The student moves between them with one button."
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
          title="Black out when the board is not needed"
          lead="From your account you hide the feed instantly. The screen keeps the time and the BoardView name — nothing else."
        />
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
              Hardware
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
