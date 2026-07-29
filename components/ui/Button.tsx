'use client';

import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',

    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800',

    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white',

    danger:
      'bg-red-600 hover:bg-red-700 text-white',

    ghost:
      'hover:bg-slate-100 text-slate-700',
  };

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-medium transition-all duration-200',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        styles[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.25"
            />

            <path
              d="M22 12a10 10 0 00-10-10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}