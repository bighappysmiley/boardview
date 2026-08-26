import { ButtonLink } from "@/components/Button";
import { Card, Section, SectionHeader } from "@/components/layout";
import { ScreenDemo } from "@/components/ScreenDemo";
import { demoCameras } from "@/lib/demo";

const steps = [
  {
    title: "Mount the cameras",
    body: "Put a camera on the ceiling or wall facing each thing the student needs to see — the front board, a second board, a poster.",
  },
  {
    title: "Frame each one",
    body: "From your computer, line up every camera so what matters fills the shot, and give it a name the student will recognise.",
  },
  {
    title: "They pick their view",
    body: "The screen shows one camera at a time. A button on the screen cycles to the next one, so the student follows the lesson wherever it moves.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <Section className="!pt-10 sm:!pt-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <p className="inline-flex rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-accent">
              For classrooms &amp; low-vision students
            </p>
            <h1 className="mt-5 text-4xl font-semibold text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Whatever&apos;s on the board, right at their desk.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              BoardView mounts small cameras above your whiteboard, a second
              board, or a poster on the wall, and streams a clear, framed view
              to a screen on the student&apos;s desk — live, distraction-free,
              and controlled entirely from your own computer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Sign up free</ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[22rem]">
            <ScreenDemo />
            <p className="mt-3 text-center text-sm text-muted">
              Try it — press <strong className="font-medium">Next view</strong>{" "}
              to move between cameras.
            </p>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section id="how-it-works">
        <SectionHeader
          title="How it works"
          lead="Three steps, no IT department required."
        />
        <ol className="grid gap-5 sm:grid-cols-3">
          {steps.map((item, i) => (
            <li key={item.title}>
              <Card className="h-full">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{item.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* Multiple cameras */}
      <Section id="multi-camera">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              title="One room, as many views as it needs"
              lead="A lesson doesn't stay in one place. Connect several cameras to the same classroom and the student moves between them with a single button."
            />
            <ul className="space-y-3">
              {demoCameras.map((camera) => (
                <li key={camera.id} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-sm text-accent"
                  >
                    {camera.position + 1}
                  </span>
                  <span className="text-muted">{camera.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-muted">
              Rename them, reorder them, or add another mid-year — the screen
              picks up the change without anyone touching the device.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[22rem]">
            <ScreenDemo />
          </div>
        </div>
      </Section>

      {/* The two pieces */}
      <Section>
        <SectionHeader
          title="Two simple pieces"
          lead="No tablets, no bulky hardware — just what's needed, and nothing else."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold">The camera</h3>
            <p className="mt-2 leading-relaxed text-muted">
              A compact camera mounted above whatever it&apos;s pointed at, either
              with built-in connectivity or wired to a small 3D-printed
              enclosure. It runs off a battery pack that recharges between
              subjects — no cables running across the room.
            </p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold">The screen</h3>
            <p className="mt-2 leading-relaxed text-muted">
              Roughly the size of a small tablet — big enough to read
              comfortably, small enough to sit unobtrusively on a desk. It does
              exactly one job: show the board. When idle, it shows only the
              BoardView logo.
            </p>
          </Card>
        </div>
      </Section>

      {/* Blackout */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              title="Full control, without the clutter"
              lead="From your teacher account you control the whole room — reframe a shot, reorder the cameras, or black out the screen the moment the board isn't needed. Blacked out, it shows only the time and the BoardView name."
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

      {/* CTA */}
      <Section>
          <Card solid className="!px-8 !py-14 text-center sm:!px-12">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Free for every classroom
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-muted">
              The BoardView software is free to use. Create a teacher account
              to get started, or see what&apos;s involved in getting the
              hardware set up.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/signup">Sign up free</ButtonLink>
              <ButtonLink href="/pricing" variant="secondary">
                Get the hardware
              </ButtonLink>
            </div>
          </Card>
      </Section>
    </>
  );
}
