// components/ui/Card.tsx

import { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className,
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300",
        hover && "hover:-translate-y-1 hover:shadow-xl",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={clsx(
        "mb-6 flex items-start justify-between gap-4",
        className
      )}
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({
  children,
  className,
}: CardContentProps) {
  return <div className={clsx(className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({
  children,
  className,
}: CardFooterProps) {
  return (
    <div
      className={clsx(
        "mt-6 border-t border-slate-200 pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}