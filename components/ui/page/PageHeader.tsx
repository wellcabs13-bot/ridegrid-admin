"use client";

import { ReactNode } from "react";
import Button from "@/components/ui/Button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-2 text-base text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">

        {children}

        {actionLabel && (
          <Button
            variant="primary"
            onClick={onAction}
            className="px-6 py-3"
          >
            <div className="flex items-center gap-2">
              {actionIcon}
              <span>{actionLabel}</span>
            </div>
          </Button>
        )}

      </div>
    </div>
  );
}