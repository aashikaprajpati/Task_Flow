import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { taskSchema } from '../lib/schemas';
import Modal from './Modal';
import Button from './Button';
import { Field, Input, TextArea, Select } from './FormField';
import { tasksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { toInputDate } from '../lib/utils';

export default function TaskFormModal({
  open,
  onClose,
  onSaved,
  onDeleted,
  task,
  projectId,
  defaultStatus,
  members = [],
  projects = [],
  initialDueDate,
}) {
  const toast = useToast();
  const isEdit = Boolean(task);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || projects[0]?.id || null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(taskSchema) });

  useEffect(() => {
    if (open) {
      const pid = task?.projectId || projectId || projects[0]?.id || null;
      setSelectedProjectId(pid);
      reset({
        title: task?.title || '',
        description: task?.description || '',
        status: task?.status || defaultStatus || 'todo',
        priority: task?.priority || 'medium',
        dueDate: toInputDate(task?.dueDate) || initialDueDate || '',
        assigneeId: task?.assigneeId ? String(task.assigneeId) : '',
      });
    }
  }, [open, task, defaultStatus, projectId, projects, initialDueDate, reset]);

  const onSubmit = async (data) => {
    const finalProjectId = selectedProjectId || projectId;
    if (!finalProjectId) {
      toast.error('Please select a department or project.');
      return;
    }
    const payload = {
      ...data,
      projectId: Number(finalProjectId),
      assigneeId: data.assigneeId ? Number(data.assigneeId) : null,
      dueDate: data.dueDate || null,
    };
    try {
      const result = isEdit ? await tasksApi.update(task.id, payload) : await tasksApi.create(payload);
      toast.success(isEdit ? 'Task updated.' : 'Task created.');
      if (onSaved) onSaved(result.task);
      onClose();
    } catch (err) {
      if (err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => setError(field, { message }));
      } else {
        toast.error(err.message || 'Could not save the task.');
      }
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      await tasksApi.remove(task.id);
      toast.success('Task deleted.');
      if (onDeleted) onDeleted(task.id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not delete the task.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit task' : 'New task'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {projects.length > 0 && !projectId && (
          <Field label="Department / Project">
            <Select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" placeholder="e.g. Design the login screen" {...register('title')} />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description?.message} hint="Optional, up to 1000 characters.">
          <TextArea id="description" placeholder="Add more detail..." {...register('description')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="status" error={errors.status?.message}>
            <Select id="status" {...register('status')}>
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </Select>
          </Field>
          <Field label="Priority" htmlFor="priority" error={errors.priority?.message}>
            <Select id="priority" {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date" htmlFor="dueDate" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" {...register('dueDate')} />
          </Field>
          <Field label="Assignee" htmlFor="assigneeId" error={errors.assigneeId?.message}>
            <Select id="assigneeId" {...register('assigneeId')}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex justify-between items-center mt-1">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 text-sm text-priority-high hover:underline"
            >
              <Trash2 size={14} /> Delete task
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
