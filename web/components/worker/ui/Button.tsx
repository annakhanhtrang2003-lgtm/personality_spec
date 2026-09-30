'use client';

import type { ReactNode } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'tonal' | 'danger' | 'transparent';
  icon?: ReactNode;
  loading?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
};

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-worker-primary text-white',
  secondary: 'bg-white text-worker-text-secondary border border-worker-border',
  outline: 'bg-white text-worker-primary border border-worker-primary',
  tonal: 'bg-worker-accent text-worker-primary',
  danger: 'bg-worker-danger text-white',
  transparent: 'bg-transparent text-worker-primary',
};

export function Button({ children, variant = 'primary', icon, loading, type = 'button', onClick, disabled }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-1.5 rounded-worker-pill px-5 py-2.5 text-sm font-bold disabled:opacity-50 ${VARIANT_CLASSES[variant]}`}
    >
      {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
