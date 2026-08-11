import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';
import KanbanBoard from '../components/KanbanBoard';
import TaskFormModal from '../components/TaskFormModal';
import MembersModal from '../components/MembersModal';
import ProjectFormModal from '../components/ProjectFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Button from '../components/Button';
import { projectsApi, tasksApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useProjects } from '../context/ProjectsContext';

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { refresh: refreshProjects } = useProjects();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [taskModal, setTaskModal] = useState({ open: false, task: null, defaultStatus: 'todo' });
  const [membersOpen, setMembersOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ project }, { tasks }] = await Promise.all([projectsApi.get(id), tasksApi.list(id)]);
      setProject(project);
      setTasks(tasks);
    } catch (err) {
      toast.error(err.message || 'Could not load this project.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !project) {
    return (
      <Layout>
        <div className="p-8 text-sm text-ink-faint">Loading project...</div>
      </Layout>
    );
  }

  const isOwner = project.ownerId === user.id;
  const done = project.taskCounts?.done ?? tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function handleTaskSaved(task) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task];
    });
  }

  function handleTaskDeleted(taskId) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleDeleteProject() {
    setDeleting(true);
    try {
      await projectsApi.remove(project.id);
      toast.success('Project deleted.');
      refreshProjects();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Could not delete the project.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      <div className="flex flex-col h-screen">
        <header className="border-b border-border bg-surface px-8 py-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent mb-3"
          >
            <ArrowLeft size={13} /> All projects
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold text-ink truncate">{project.title}</h1>
              {project.description && <p className="text-sm text-ink-soft mt-1 max-w-2xl">{project.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setMembersOpen(true)}>
                <Users size={14} /> {project.members.length}
              </Button>
              {isOwner && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-priority-high hover:bg-priority-highSoft">
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 max-w-md">
            <div className="flex-1 h-1.5 rounded-full bg-bg overflow-hidden">
              <div className="h-full bg-status-done transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-mono text-ink-faint shrink-0">
              {done}/{total} done
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 px-8 py-6">
          <KanbanBoard
            tasks={tasks}
            setTasks={setTasks}
            onTaskClick={(task) => setTaskModal({ open: true, task, defaultStatus: task.status })}
            onAddTask={(status) => setTaskModal({ open: true, task: null, defaultStatus: status })}
          />
        </div>
      </div>

      <TaskFormModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, defaultStatus: 'todo' })}
        onSaved={handleTaskSaved}
        onDeleted={handleTaskDeleted}
        task={taskModal.task}
        projectId={project.id}
        defaultStatus={taskModal.defaultStatus}
        members={project.members}
      />

      <MembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        project={project}
        isOwner={isOwner}
        onUpdated={(updated) => setProject(updated)}
      />

      <ProjectFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        onSaved={(updated) => {
          setProject((p) => ({ ...p, ...updated }));
          refreshProjects();
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteProject}
        loading={deleting}
        title="Delete project?"
        message={`This will permanently delete "${project.title}" and all of its tasks. This can't be undone.`}
      />
    </Layout>
  );
}
