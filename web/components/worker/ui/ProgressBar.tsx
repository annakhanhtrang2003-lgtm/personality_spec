type ProgressBarProps = {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  status?: 'progress' | 'success' | 'disabled';
};

const HEIGHTS: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const FILL_COLORS: Record<NonNullable<ProgressBarProps['status']>, string> = {
  progress: 'bg-worker-primary',
  success: 'bg-worker-success',
  disabled: 'bg-worker-text-disabled',
};

export function ProgressBar({ value, size = 'md', status = 'progress' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full rounded-full bg-worker-border overflow-hidden ${HEIGHTS[size]}`}
    >
      <div className={`h-full rounded-full ${FILL_COLORS[status]}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
