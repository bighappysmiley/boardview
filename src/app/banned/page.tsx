export default function BannedPage() {
  return (
    <main className="flex min-h-full items-center justify-center px-6 py-20">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">
          This visit can’t continue
        </h1>
        <p className="mt-4 leading-relaxed text-muted">
          Access from this network has been turned off. If you think that’s a
          mistake, email{" "}
          <a
            href="mailto:hello@boardview.org"
            className="font-medium text-accent hover:underline"
          >
            hello@boardview.org
          </a>
          .
        </p>
      </div>
    </main>
  );
}
