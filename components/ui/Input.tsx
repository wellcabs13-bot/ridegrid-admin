'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled}
            className={clsx(
              'w-full rounded-xl border bg-white transition-all duration-200 outline-none',
              'border-slate-300',
              'focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
              'placeholder:text-slate-400',
              'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
              leftIcon ? 'pl-11' : 'pl-4',
              rightIcon ? 'pr-11' : 'pr-4',
              'py-2.5',
              error &&
                'border-red-500 focus:border-red-500 focus:ring-red-100',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : (
          hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;