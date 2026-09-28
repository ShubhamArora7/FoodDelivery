// Shown instantly while the next page loads, so every click responds straight away.
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 rounded-lg bg-ash/70" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-ash/50" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-line bg-ember/60" />
        ))}
      </div>
    </div>
  );
}
