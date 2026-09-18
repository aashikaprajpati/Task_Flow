import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ListTodo,
  Calendar as CalendarIcon,
} from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import PriorityBadge from '../components/PriorityBadge';
import TaskQuickViewModal from '../components/TaskQuickViewModal';
import TaskFormModal from '../components/TaskFormModal';
import ProjectFormModal from '../components/ProjectFormModal';
import { tasksApi } from '../api/endpoints';
import { useWorkspace } from '../context/WorkspaceContext';
import { useProjects } from '../context/ProjectsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function CalendarPage() {
  const { current: workspace } = useWorkspace();
  const { projects } = useProjects();
  const { user } = useAuth();
  const toast = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all'); // 'all' or 'mine'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'done'

  // Modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormDefaultDate, setTaskFormDefaultDate] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  // Load calendar tasks
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (workspace) params.workspaceId = workspace.id;
      const data = await tasksApi.calendar(params);
      setTasks(data.tasks || []);
    } catch {
      toast.error('Could not load calendar tasks.');
    } finally {
      setLoading(false);
    }
  }, [workspace, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Calendar dates computation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (departmentFilter !== 'all' && String(t.projectId) !== String(departmentFilter)) {
        return false;
      }
      if (assigneeFilter === 'mine' && t.assignee?.id !== user?.id && t.assigneeId !== user?.id) {
        return false;
      }
      if (statusFilter === 'done' && t.status !== 'done') return false;
      if (statusFilter === 'pending' && t.status === 'done') return false;
      return true;
    });
  }, [tasks, departmentFilter, assigneeFilter, statusFilter, user]);

  // Map tasks by date YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = t.dueDate.split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [filteredTasks]);

  const handleDayClick = (day) => {
    setTaskFormDefaultDate(format(day, 'yyyy-MM-dd'));
    setTaskToEdit(null);
    setTaskFormOpen(true);
  };

  const handleTaskClick = (e, task) => {
    e.stopPropagation();
    setSelectedTask(task);
    setQuickViewOpen(true);
  };

  const departmentsList = workspace ? workspace.departments || [] : projects;

  return (
    <Layout onNewProject={() => setNewProjectOpen(true)}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                {workspace ? workspace.name : 'TaskFlow'}
              </span>
              <span className="text-ink-faint">·</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                Calendar View
              </span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2.5">
              <CalendarIcon className="text-accent" size={24} />
              Task Schedule & Deadlines
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setTaskFormDefaultDate(format(new Date(), 'yyyy-MM-dd'));
                setTaskToEdit(null);
                setTaskFormOpen(true);
              }}
            >
              <Plus size={15} /> Add Task
            </Button>
          </div>
        </div>

        {/* Calendar Navigation & Filters */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Month Stepper */}
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-semibold text-ink min-w-[170px]">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-bg/50">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                aria-label="Previous Month"
                className="p-1.5 rounded-lg text-ink-soft hover:bg-surface hover:text-ink transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-ink-soft hover:bg-surface hover:text-ink transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                aria-label="Next Month"
                className="p-1.5 rounded-lg text-ink-soft hover:bg-surface hover:text-ink transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-bg/50 border border-border rounded-xl px-3 py-1.5">
              <Filter size={13} className="text-ink-faint" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-transparent text-ink font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-bg/50 border border-border rounded-xl p-1">
              <button
                type="button"
                onClick={() => setAssigneeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  assigneeFilter === 'all'
                    ? 'bg-surface text-ink font-semibold shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                All Members
              </button>
              <button
                type="button"
                onClick={() => setAssigneeFilter('mine')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  assigneeFilter === 'mine'
                    ? 'bg-surface text-ink font-semibold shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                My Tasks
              </button>
            </div>

            <div className="flex items-center bg-bg/50 border border-border rounded-xl p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-surface text-ink font-semibold shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-surface text-ink font-semibold shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('done')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  statusFilter === 'done'
                    ? 'bg-surface text-ink font-semibold shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-card">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-border bg-bg/60 text-center text-xs font-semibold uppercase tracking-wider text-ink-faint py-3">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border min-h-[640px]">
            {calendarDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[dayStr] || [];
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={dayStr}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[110px] p-2 flex flex-col transition-colors cursor-pointer hover:bg-bg/40 relative group ${
                    !inCurrentMonth ? 'bg-bg/20 opacity-50' : 'bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center ${
                        isTodayDay
                          ? 'bg-accent text-white font-bold'
                          : inCurrentMonth
                          ? 'text-ink'
                          : 'text-ink-faint'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-ink-faint font-mono font-medium">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Tasks for this day */}
                  <div className="flex flex-col gap-1.5 mt-1 overflow-y-auto max-h-[100px] scrollbar-none">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => handleTaskClick(e, t)}
                        className={`px-2 py-1.5 rounded-lg text-left text-xs transition-all border shadow-xs group/card hover:scale-[1.02] cursor-pointer ${
                          t.status === 'done'
                            ? 'bg-bg border-border/60 opacity-60 text-ink-faint'
                            : t.priority === 'high'
                            ? 'bg-priority-highSoft/40 border-priority-high/30 hover:border-priority-high'
                            : t.priority === 'medium'
                            ? 'bg-status-progressSoft/40 border-status-progress/30 hover:border-status-progress'
                            : 'bg-bg border-border hover:border-accent/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`font-medium truncate text-[11px] ${
                              t.status === 'done' ? 'line-through text-ink-faint' : 'text-ink'
                            }`}
                          >
                            {t.title}
                          </p>
                          {t.status === 'done' ? (
                            <CheckCircle2 size={11} className="text-status-done shrink-0" />
                          ) : t.status === 'in-progress' ? (
                            <Clock size={11} className="text-status-progress shrink-0" />
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-ink-faint">
                          <span className="truncate max-w-[80px]">
                            {t.projectTitle || 'Project'}
                          </span>
                          {t.assignee && (
                            <Avatar name={t.assignee.name} size={15} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hover Add Task Prompt */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(day);
                    }}
                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-surface border border-border text-ink-faint hover:text-accent hover:border-accent transition-all"
                    title="Add task on this date"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Quick View Modal */}
      <TaskQuickViewModal
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        task={selectedTask}
        onUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          setSelectedTask(updated);
        }}
        onDeleted={(id) => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }}
        onEditFull={(t) => {
          setTaskToEdit(t);
          setTaskFormOpen(true);
        }}
      />

      {/* Task Full Create / Edit Modal */}
      <TaskFormModal
        open={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setTaskToEdit(null);
          setTaskFormDefaultDate(null);
        }}
        task={taskToEdit}
        projectId={taskToEdit?.projectId || departmentsList[0]?.id}
        projects={departmentsList}
        initialDueDate={taskFormDefaultDate}
        onSaved={() => {
          loadTasks();
        }}
      />

      <ProjectFormModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        workspaceId={workspace?.id}
        onSaved={() => {
          loadTasks();
        }}
      />
    </Layout>
  );
}
