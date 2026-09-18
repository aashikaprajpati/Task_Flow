import { useState, useEffect } from 'react';
import { CalendarDays, Clock, CheckCircle2, ListTodo, User, Trash2, Edit3, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import PriorityBadge from './PriorityBadge';
import Avatar from './Avatar';
import { tasksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { formatDate, isOverdue } from '../lib/utils';

export default function TaskQuickViewModal({
  open,
  onClose,
  task,
  onUpdated,
  onDeleted,
  onEditFull,
}) {
  const toast = useToast();
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task?.status || 'todo');

  useEffect(() => {
    if (task) setCurrentStatus(task.status);
  }, [task]);

  if (!task) return null;

  async function handleStatusChange(newStatus) {
    if (newStatus === currentStatus) return;
    setUpdating(true);
    try {
      const { task: updated } = await tasksApi.update(task.id, {
        title: task.title,
        description: task.description,
        status: newStatus,
        priority: task.priority,
        dueDate: task.dueDate,
        assigneeId: task.assignee?.id || task.assigneeId || null,
      });
      setCurrentStatus(newStatus);
      toast.success(`Status updated to ${newStatus}.`);
      onUpdated(updated);
    } catch (err) {
      toast.error(err.message || 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await tasksApi.remove(task.id);
      toast.success('Task deleted.');
      onDeleted(task.id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not delete task.');
    }
  }

  const overdue = isOverdue(task.dueDate, currentStatus);

  return (
    <Modal open={open} onClose={onClose} title="Task Overview">
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PriorityBadge priority={task.priority} />
            {task.projectTitle && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent">
                {task.projectTitle}
              </span>
            )}
          </div>
          <h2 className="text-lg font-display font-semibold text-ink leading-snug">
            {task.title}
          </h2>
          {task.description && (
            <p className="text-sm text-ink-soft mt-2 leading-relaxed whitespace-pre-line">
              {task.description}
            </p>
          )}
        </div>

        {/* Status Switcher */}
        <div className="rounded-xl border border-border bg-bg/50 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">
            Update Progress
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('todo')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                currentStatus === 'todo'
                  ? 'bg-status-todo text-white shadow-sm'
                  : 'bg-surface border border-border text-ink-soft hover:bg-bg'
              }`}
            >
              <ListTodo size={14} /> To Do
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('in-progress')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                currentStatus === 'in-progress'
                  ? 'bg-status-progress text-white shadow-sm'
                  : 'bg-surface border border-border text-ink-soft hover:bg-bg'
              }`}
            >
              <Clock size={14} /> In Progress
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('done')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                currentStatus === 'done'
                  ? 'bg-status-done text-white shadow-sm'
                  : 'bg-surface border border-border text-ink-soft hover:bg-bg'
              }`}
            >
              <CheckCircle2 size={14} /> Done
            </button>
          </div>
        </div>

        {/* Details List */}
        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-border">
            <span className="text-ink-faint flex items-center gap-1.5">
              <CalendarDays size={13} /> Due Date
            </span>
            <span className={`font-mono font-medium ${overdue ? 'text-priority-high font-semibold' : 'text-ink'}`}>
              {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
              {overdue && ' (Overdue)'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-border">
            <span className="text-ink-faint flex items-center gap-1.5">
              <User size={13} /> Assigned To
            </span>
            <div className="flex items-center gap-1.5">
              {task.assignee ? (
                <>
                  <Avatar name={task.assignee.name} size={20} />
                  <span className="font-medium text-ink">{task.assignee.name}</span>
                </>
              ) : (
                <span className="text-ink-faint italic">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-priority-high hover:underline flex items-center gap-1 font-medium"
          >
            <Trash2 size={13} /> Delete
          </button>
          <div className="flex items-center gap-2">
            {onEditFull && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onClose();
                  onEditFull(task);
                }}
              >
                <Edit3 size={13} /> Edit Full Details
              </Button>
            )}
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
