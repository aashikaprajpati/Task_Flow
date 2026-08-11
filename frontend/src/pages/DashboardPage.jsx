import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, ListTodo, Clock, CheckCircle2, Plus, ArrowRight, CalendarDays } from 'lucide-react';
import Layout from '../components/Layout';
import ProjectFormModal from '../components/ProjectFormModal';
import Button from '../components/Button';
import { dashboardApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { formatDate, isOverdue } from '../lib/utils';

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-display font-semibold text-ink leading-none">{value}</p>
        <p className="text-xs text-ink-faint mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { refresh: refreshSidebar } = useProjects();
  const [data, setData] = useState(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const load = useCallback(() => {
    dashboardApi.get().then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = user?.name?.split(' ')[0];

  return (
    <Layout onNewProject={() => setNewProjectOpen(true)}>
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Welcome back, {firstName}</h1>
            <p className="text-sm text-ink-soft mt-1">Here's what's happening across your projects.</p>
          </div>
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus size={15} /> New project
          </Button>
        </div>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard icon={FolderKanban} label="Projects" value={data.totals.totalProjects} tint="bg-accent-soft text-accent" />
            <StatCard icon={ListTodo} label="To do" value={data.totals.todo} tint="bg-status-todoSoft text-status-todo" />
            <StatCard icon={Clock} label="In progress" value={data.totals.inProgress} tint="bg-status-progressSoft text-status-progress" />
            <StatCard icon={CheckCircle2} label="Done" value={data.totals.done} tint="bg-status-doneSoft text-status-done" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-ink mb-3">Your projects</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {data?.projects.map((p) => {
                const pct = p.totalTasks ? Math.round((p.taskCounts.done / p.totalTasks) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="group rounded-2xl border border-border bg-surface p-5 shadow-card hover:shadow-floating hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-display font-semibold text-ink group-hover:text-accent transition-colors">{p.title}</h3>
                      <ArrowRight size={15} className="text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                    {p.description && <p className="text-xs text-ink-faint mt-1.5 line-clamp-2">{p.description}</p>}
                    <div className="mt-4 flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-bg overflow-hidden">
                        <div className="h-full bg-status-done" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-ink-faint shrink-0">
                        {p.taskCounts.done}/{p.totalTasks}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] text-ink-faint">{p.memberCount} member{p.memberCount !== 1 ? 's' : ''}</span>
                    </div>
                  </Link>
                );
              })}
              {data && data.projects.length === 0 && (
                <div className="col-span-2 rounded-2xl border-2 border-dashed border-border p-10 text-center">
                  <p className="text-sm text-ink-soft mb-3">You don't have any projects yet.</p>
                  <Button size="sm" onClick={() => setNewProjectOpen(true)}>
                    <Plus size={14} /> Create your first project
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink mb-3">Assigned to you</h2>
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {data?.myTasks.map((t) => {
                const overdue = isOverdue(t.dueDate, t.status);
                const due = formatDate(t.dueDate);
                return (
                  <Link key={t.id} to={`/projects/${t.projectId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                      <p className="text-xs text-ink-faint truncate">{t.projectTitle}</p>
                    </div>
                    {due && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-mono shrink-0 ${overdue ? 'text-priority-high font-semibold' : 'text-ink-faint'}`}>
                        <CalendarDays size={11} /> {due}
                      </span>
                    )}
                  </Link>
                );
              })}
              {data && data.myTasks.length === 0 && (
                <p className="px-4 py-6 text-xs text-ink-faint text-center leading-relaxed">No tasks assigned to you yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProjectFormModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSaved={() => {
          refreshSidebar();
          load();
        }}
      />
    </Layout>
  );
}
