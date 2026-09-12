import { Inbox } from "lucide-react";

interface WebsiteSeoEmptyStateProps {
  title: string;
  description: string;
}

export default function WebsiteSeoEmptyState({
  title,
  description,
}: WebsiteSeoEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-200 text-zinc-600">
        <Inbox size={22} />
      </div>

      <h3 className="mt-4 font-bold text-zinc-950">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}
