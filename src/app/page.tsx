import { ButtonLink } from "@/components/Button";
import { LogoMark } from "@/components/Logo";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent">
              For classrooms &amp; low-vision students
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Whatever&apos;s on the board, right at their desk.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              BoardView mounts a small camera above your whiteboard or a
              poster on the wall, and streams a clear, framed view to a
              student&apos;s desktop screen — live, distraction-free, and
              controlled entirely from your own computer.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/signup">Sign up free</ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="glass-panel rounded-[2rem] p-4">
              <div className="rounded-[1.5rem] bg-[#0b0d12] px-6 py-16 text-center">
                <LogoMark className="mx-auto h-10 w-10 text-white" />
                <p className="mt-3 text-sm font-medium tracking-wide text-white/70">
                  BoardView
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-muted">
              The student screen shows nothing but this — until you frame a
              shot.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          Three steps, no IT department required.
        </p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Mount the camera",
              body: "Attach the small camera to the ceiling or wall so it faces the board, poster, or anything important the student needs to see.",
            },
            {
              step: "2",
              title: "Frame it from your computer",
              body: "Open the BoardView site on your teacher computer and drag to frame exactly what should appear on the student's screen.",
            },
            {
              step: "3",
              title: "It appears on their screen",
              body: "The student's small screen shows a live, steady view of the board — and nothing else. No apps, no distractions.",
            },
          ].map((item) => (
            <li key={item.step} className="glass-panel rounded-2xl p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">
                {item.step}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The two pieces */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">
          Two simple pieces
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          No tablets, no bulky hardware — just what&apos;s needed, and nothing
          else.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="glass-panel rounded-2xl p-8">
            <h3 className="text-xl font-semibold">The camera</h3>
            <p className="mt-3 text-muted">
              A compact camera mounted above the board, either with built-in
              connectivity or wired to a small 3D-printed enclosure. It runs
              off a battery pack that recharges between subjects — no cables
              running across the room.
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-8">
            <h3 className="text-xl font-semibold">The screen</h3>
            <p className="mt-3 text-muted">
              Roughly the size of a small tablet — big enough to read
              comfortably, small enough to sit unobtrusively on a desk. It
              does exactly one job: show the board. When idle, it shows only
              the BoardView logo.
            </p>
          </div>
        </div>
      </section>

      {/* Blackout mode */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Full control, without the clutter
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted">
              From your teacher account, you control the whole system — reframe
              the shot, or instantly black out the student&apos;s screen when
              the board isn&apos;t needed. Blacked out, it shows only the time
              and the BoardView name, nothing else.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <div className="glass-panel rounded-[2rem] p-4">
              <div className="flex h-56 flex-col justify-between rounded-[1.5rem] bg-[#0b0d12] p-5 text-white">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium tracking-wide">BoardView</span>
                  <span className="font-mono">10:42</span>
                </div>
                <span className="text-center text-xs text-white/40">
                  Screen blacked out
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="glass-panel-solid flex flex-col items-center gap-6 rounded-[2rem] px-8 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Free for every classroom
          </h2>
          <p className="max-w-xl text-lg text-muted">
            The BoardView software is free to use. Create a teacher account to
            get started, or see what&apos;s involved in getting the hardware
            set up.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <ButtonLink href="/signup">Sign up free</ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">
              Get the hardware
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
