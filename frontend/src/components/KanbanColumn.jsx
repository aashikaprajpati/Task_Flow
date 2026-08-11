import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const COLUMN_STYLES = {
  todo: { dot: 'bg-status-todo', label: 'To do' },
  'in-progress': { dot: 'bg-status-progress', label: 'In progress' },
  done: { dot: 'bg-status-done', label: 'Done' },
};

export default function KanbanColumn({ status, tasks, onTaskClick, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = COLUMN_STYLES[status];

  return (
    <div className="flex flex-col w-[300px] shrink-0 h-full">
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
          <h3 className="text-sm font-semibold text-ink">{style.label}</h3>
          <span className="text-xs font-mono text-ink-faint bg-bg border border-border rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          aria-label={`Add task to ${style.label}`}
          className="rounded-lg p-1 text-ink-faint hover:bg-bg hover:text-accent transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2.5 rounded-2xl p-2.5 overflow-y-auto scrollbar-thin transition-colors min-h-[200px] ${
          isOver ? 'bg-accent-soft/60' : 'bg-transparent'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <button
            onClick={() => onAddTask(status)}
            className="flex-1 min-h-[100px] flex items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-ink-faint hover:border-accent/40 hover:text-accent transition-colors"
          >
            Drop tasks here or click to add
          </button>
        )}
      </div>
    </div>
  );
}
