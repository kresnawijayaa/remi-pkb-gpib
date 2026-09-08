export default function Loading() {
  return (
    <main className="app-container grid gap-5 py-7">
      <div className="border-b border-border pb-5">
        <div className="h-4 w-40 animate-pulse bg-muted" />
        <div className="mt-4 h-10 w-72 animate-pulse bg-muted" />
        <div className="mt-3 h-4 w-64 animate-pulse bg-muted" />
      </div>

      <section className="grid gap-0 border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-20 animate-pulse border-b border-border bg-muted sm:odd:border-r lg:border-b-0 lg:border-r" />
        <div className="h-20 animate-pulse border-b border-border bg-muted sm:odd:border-r lg:border-b-0 lg:border-r" />
        <div className="h-20 animate-pulse border-b border-border bg-muted sm:odd:border-r lg:border-b-0 lg:border-r" />
        <div className="h-20 animate-pulse bg-muted" />
      </section>

      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="h-72 animate-pulse border border-border bg-muted" />
        <div className="grid gap-4">
          <div className="h-96 animate-pulse border border-border bg-muted" />
          <div className="h-80 animate-pulse border border-border bg-muted" />
        </div>
      </div>
    </main>
  );
}
