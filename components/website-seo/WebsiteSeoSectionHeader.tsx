import type { ReactNode } from "react";

interface WebsiteSeoSectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function WebsiteSeoSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: WebsiteSeoSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-zinc-800 pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-red-500">
            {eyebrow}
          </div>
        ) : null}

        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
