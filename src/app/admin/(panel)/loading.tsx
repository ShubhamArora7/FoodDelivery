export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-2" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-ash/70" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-line bg-ember/60" />
        ))}
      </div>
    </div>
  );
}
