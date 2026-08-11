import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import { tasksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

const STATUSES = ['todo', 'in-progress', 'done'];

export default function KanbanBoard({ tasks, setTasks, onTaskClick, onAddTask }) {
  const toast = useToast();
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const grouped = { todo: [], 'in-progress': [], done: [] };
    [...tasks]
      .sort((a, b) => a.position - b.position)
      .forEach((t) => grouped[t.status]?.push(t));
    return grouped;
  }, [tasks]);

  function findTask(id) {
    return tasks.find((t) => t.id === id);
  }

  function handleDragStart(event) {
    setActiveTask(findTask(event.active.id));
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeTask = findTask(active.id);
    if (!activeTask) return;

    // Destination column: either dropped on a column itself or on a task within one
    const overIsColumn = STATUSES.includes(over.id);
    const destStatus = overIsColumn ? over.id : findTask(over.id)?.status;
    if (!destStatus) return;

    const destTasks = columns[destStatus].filter((t) => t.id !== active.id);
    let destIndex = overIsColumn ? destTasks.length : destTasks.findIndex((t) => t.id === over.id);
    if (destIndex < 0) destIndex = destTasks.length;

    const reordered = [...destTasks];
    reordered.splice(destIndex, 0, { ...activeTask, status: destStatus });

    // Optimistic update: recompute positions for the destination column locally
    const updated = tasks.map((t) => {
      if (t.id === active.id) return { ...t, status: destStatus, position: destIndex };
      if (t.status === destStatus) {
        const idx = reordered.findIndex((r) => r.id === t.id);
        return idx >= 0 ? { ...t, position: idx } : t;
      }
      return t;
    });
    setTasks(updated);

    try {
      await tasksApi.move(active.id, { status: destStatus, position: destIndex });
    } catch (err) {
      toast.error(err.message || 'Could not move the task. Reverting.');
      setTasks(tasks); // revert on failure
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-5 h-full overflow-x-auto pb-4 scrollbar-thin">
        {STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} tasks={columns[status]} onTaskClick={onTaskClick} onAddTask={onAddTask} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 shadow-dragged rounded-xl">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
