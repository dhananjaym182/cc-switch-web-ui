
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'warning' | 'success';
  label?: string;
  pulse?: boolean;
}

export function StatusBadge({
  status,
  label,
  pulse = false,
}: StatusBadgeProps) {
  const statusStyles = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    inactive: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  const dotStyles = {
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
  };

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${dotStyles[status]} ${pulse ? 'animate-pulse' : ''}`}
      />
      {displayLabel}
    </span>
  );
}
