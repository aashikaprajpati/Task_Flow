export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-priority-high" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const baseInput =
  'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30';

export function Input({ error, className = '', ...props }) {
  return (
    <input
      className={`${baseInput} ${error ? 'border-priority-high focus:border-priority-high' : 'border-border focus:border-accent'} ${className}`}
      {...props}
    />
  );
}

export function TextArea({ error, className = '', ...props }) {
  return (
    <textarea
      className={`${baseInput} min-h-[88px] resize-y ${error ? 'border-priority-high focus:border-priority-high' : 'border-border focus:border-accent'} ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select
      className={`${baseInput} ${error ? 'border-priority-high focus:border-priority-high' : 'border-border focus:border-accent'} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
