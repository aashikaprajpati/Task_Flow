import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-card',
  secondary: 'bg-surface text-ink border border-border hover:bg-bg',
  ghost: 'bg-transparent text-ink-soft hover:bg-bg hover:text-ink',
  danger: 'bg-priority-high text-white hover:bg-red-600 shadow-card',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
