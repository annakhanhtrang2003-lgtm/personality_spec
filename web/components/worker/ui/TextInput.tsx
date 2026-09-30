'use client';

type TextInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  error?: string;
  disabled?: boolean;
  type?: string;
};

export function TextInput({ label, value, onChange, placeholder, helpText, error, disabled, type = 'text' }: TextInputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs text-worker-text-secondary">{label}</span>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`border rounded-md px-3 py-2.5 text-sm disabled:bg-worker-bg disabled:text-worker-text-disabled ${
          error ? 'border-worker-danger' : 'border-worker-border'
        }`}
      />
      {error ? (
        <span className="text-xs text-worker-danger">{error}</span>
      ) : helpText ? (
        <span className="text-xs text-worker-text-secondary">{helpText}</span>
      ) : null}
    </label>
  );
}
