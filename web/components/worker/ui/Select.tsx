'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';

type Option = { value: string; label: string };

type SelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  helpText?: string;
  error?: string;
  disabled?: boolean;
};

export function Select({ label, value, onChange, options, placeholder = 'Select a value', helpText, error, disabled }: SelectProps) {
  const hasEmptyOption = options.some((o) => o.value === '');

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs text-worker-text-secondary">{label}</span>}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none border rounded-md pl-3 pr-8 py-2.5 text-sm disabled:bg-worker-bg disabled:text-worker-text-disabled ${
            error ? 'border-worker-danger' : 'border-worker-border'
          }`}
        >
          {!hasEmptyOption && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </span>
      {error ? (
        <span className="text-xs text-worker-danger">{error}</span>
      ) : helpText ? (
        <span className="text-xs text-worker-text-secondary">{helpText}</span>
      ) : null}
    </label>
  );
}
