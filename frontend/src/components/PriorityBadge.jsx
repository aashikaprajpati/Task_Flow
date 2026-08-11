const CONFIG = {
  low: { label: 'Low', text: 'text-priority-low', bg: 'bg-priority-lowSoft' },
  medium: { label: 'Medium', text: 'text-priority-medium', bg: 'bg-priority-mediumSoft' },
  high: { label: 'High', text: 'text-priority-high', bg: 'bg-priority-highSoft' },
};

export default function PriorityBadge({ priority }) {
  const c = CONFIG[priority] || CONFIG.medium;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.text} ${c.bg}`}>
      {c.label}
    </span>
  );
}

export const PRIORITY_EDGE = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
};
