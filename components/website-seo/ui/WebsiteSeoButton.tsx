import type { ButtonHTMLAttributes, ReactNode } from "react";

interface WebsiteSeoButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark";
}

export default function WebsiteSeoButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: WebsiteSeoButtonProps) {
  const variants = {
    primary:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-950/20",
    secondary:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100",
    dark:
      "border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
