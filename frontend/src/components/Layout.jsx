import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import Avatar from './Avatar';

export default function Layout({ children, onNewProject }) {
  const { user, logout } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#4338EC" />
            <rect x="6" y="8" width="6" height="16" rx="2" fill="white" opacity="0.95" />
            <rect x="13" y="8" width="6" height="10" rx="2" fill="white" opacity="0.75" />
            <rect x="20" y="8" width="6" height="6" rx="2" fill="white" opacity="0.55" />
          </svg>
          <span className="font-display font-semibold text-lg tracking-tight">TaskFlow</span>
        </div>

        <nav className="px-3 flex flex-col gap-0.5 mt-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-bg hover:text-ink'
              }`
            }
          >
            <LayoutDashboard size={17} />
            Dashboard
          </NavLink>
        </nav>

        <div className="mt-6 px-3 flex-1 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Projects</span>
            <button
              onClick={onNewProject}
              aria-label="Create project"
              className="rounded p-1 text-ink-faint hover:bg-bg hover:text-accent transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {projects.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors truncate ${
                    isActive ? 'bg-accent-soft text-accent font-medium' : 'text-ink-soft hover:bg-bg hover:text-ink'
                  }`
                }
              >
                <FolderKanban size={15} className="shrink-0" />
                <span className="truncate">{p.title}</span>
              </NavLink>
            ))}
            {projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-faint leading-relaxed">No projects yet. Create one to get started.</p>
            )}
          </div>
        </div>

        <div className="border-t border-border px-4 py-3 flex items-center gap-2.5">
          <Avatar name={user?.name} size={30} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-ink-faint truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Log out"
            className="rounded-lg p-2 text-ink-faint hover:bg-bg hover:text-priority-high transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
