export default function WebsiteSeoLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-zinc-200" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl bg-zinc-200"
          />
        ))}
      </div>
    </div>
  );
}
