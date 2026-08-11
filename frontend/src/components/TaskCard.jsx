import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, AlertCircle } from 'lucide-react';
import PriorityBadge, { PRIORITY_EDGE } from './PriorityBadge';
import Avatar from '../components/Avatar';
import { formatDate, isOverdue } from '../lib/utils';

export default function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(task.dueDate, task.status);
  const due = formatDate(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(task)}
      role="button"
      tabIndex={0}
      aria-label={`Open task ${task.title}`}
      className="group relative flex cursor-grab active:cursor-grabbing overflow-hidden rounded-xl border border-border bg-surface shadow-card hover:shadow-floating hover:-translate-y-0.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className={`w-1 shrink-0 ${PRIORITY_EDGE[task.priority] || PRIORITY_EDGE.medium}`} aria-hidden="true" />
      <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-2.5">
        <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{task.title}</p>

        {task.description && <p className="text-xs text-ink-faint line-clamp-2 leading-relaxed">{task.description}</p>}

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {due && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono ${
                  overdue ? 'text-priority-high font-semibold' : 'text-ink-faint'
                }`}
              >
                {overdue ? <AlertCircle size={11} /> : <CalendarDays size={11} />}
                {due}
              </span>
            )}
          </div>
          <Avatar name={task.assignee?.name} size={24} />
        </div>
      </div>
    </div>
  );
}
