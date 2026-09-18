import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  FolderKanban,
  LogOut,
  Plus,
  ChevronDown,
  Building2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { useWorkspace } from '../context/WorkspaceContext';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import WorkspaceMembersModal from './WorkspaceMembersModal';

function WorkspaceSwitcher({ onManageMembers }) {
  const { workspaces, current, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative px-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-xl p-2 hover:bg-bg border border-border/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Building2 size={15} />
        </div>
        <span className="flex-1 text-left text-sm font-semibold truncate text-ink">
          {current ? current.name : 'Select workspace'}
        </span>
        <ChevronDown size={14} className="text-ink-faint shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 z-20 mt-1.5 rounded-xl border border-border bg-surface shadow-floating py-1.5 animate-fadeIn">
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  switchWorkspace(w.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm truncate hover:bg-bg transition-colors flex items-center justify-between ${
                  current?.id === w.id ? 'text-accent font-semibold bg-accent-soft/30' : 'text-ink'
                }`}
              >
                <span className="truncate">{w.name}</span>
                <span className="text-[10px] text-ink-faint font-mono">
                  {w.departments?.length || 0} depts
                </span>
              </button>
            ))}

            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/workspaces/new');
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-accent hover:bg-bg transition-colors flex items-center gap-1.5"
              >
                <Plus size={13} /> New company workspace
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout({ children, onNewProject }) {
  const { user, logout } = useAuth();
  const { projects } = useProjects();
  const { current: currentWorkspace, refresh: refreshWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [membersModalOpen, setMembersModalOpen] = useState(false);

  const departments = currentWorkspace
    ? projects.filter((p) => p.workspaceId === currentWorkspace.id)
    : [];
  const otherProjects = projects.filter(
    (p) => !currentWorkspace || p.workspaceId !== currentWorkspace.id
  );

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill="#4338EC" />
              <rect x="6" y="8" width="6" height="16" rx="2" fill="white" opacity="0.95" />
              <rect x="13" y="8" width="6" height="10" rx="2" fill="white" opacity="0.75" />
              <rect x="20" y="8" width="6" height="6" rx="2" fill="white" opacity="0.55" />
            </svg>
            <span className="font-display font-semibold text-lg tracking-tight text-ink">
              TaskFlow
            </span>
          </div>

          <NotificationBell />
        </div>

        {/* Workspace selector */}
        <WorkspaceSwitcher onManageMembers={() => setMembersModalOpen(true)} />

        {/* Workspace roster quick link */}
        {currentWorkspace && (
          <div className="px-3 mt-2">
            <button
              onClick={() => setMembersModalOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-soft hover:bg-bg hover:text-ink transition-colors border border-dashed border-border"
            >
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-accent" /> Company Members
              </span>
              <span className="text-[10px] font-mono bg-bg px-1.5 py-0.5 rounded text-ink-faint">
                {currentWorkspace.members?.length || 0}
              </span>
            </button>
          </div>
        )}

        {/* Primary Nav */}
        <nav className="px-3 flex flex-col gap-0.5 mt-4">
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

          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-bg hover:text-ink'
              }`
            }
          >
            <CalendarDays size={17} />
            Calendar & Deadlines
          </NavLink>
        </nav>

        {/* Departments / Projects */}
        <div className="mt-5 px-3 flex-1 overflow-y-auto scrollbar-thin">
          {currentWorkspace && (
            <>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Departments
                </span>
                <button
                  onClick={onNewProject}
                  aria-label="Create department"
                  title="Create custom department"
                  className="rounded p-1 text-ink-faint hover:bg-bg hover:text-accent transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>
              <div className="flex flex-col gap-0.5 mb-5">
                {departments.map((p) => (
                  <NavLink
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors truncate ${
                        isActive
                          ? 'bg-accent-soft text-accent font-medium'
                          : 'text-ink-soft hover:bg-bg hover:text-ink'
                      }`
                    }
                  >
                    <FolderKanban size={15} className="shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </NavLink>
                ))}
                {departments.length === 0 && (
                  <div className="px-3 py-2 rounded-lg border border-dashed border-border text-center">
                    <p className="text-xs text-ink-faint">No departments yet.</p>
                    <button
                      onClick={onNewProject}
                      className="text-xs text-accent font-medium hover:underline mt-1 inline-block"
                    >
                      + Add department
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!currentWorkspace && (
            <button
              onClick={() => navigate('/workspaces/new')}
              className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-ink-soft hover:border-accent/40 hover:text-accent transition-colors mb-5"
            >
              <Building2 size={15} /> Set up a company workspace
            </button>
          )}

          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {currentWorkspace ? 'Other Projects' : 'Projects'}
            </span>
            {!currentWorkspace && (
              <button
                onClick={onNewProject}
                aria-label="Create project"
                className="rounded p-1 text-ink-faint hover:bg-bg hover:text-accent transition-colors"
              >
                <Plus size={15} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {otherProjects.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors truncate ${
                    isActive
                      ? 'bg-accent-soft text-accent font-medium'
                      : 'text-ink-soft hover:bg-bg hover:text-ink'
                  }`
                }
              >
                <FolderKanban size={15} className="shrink-0" />
                <span className="truncate">{p.title}</span>
              </NavLink>
            ))}
            {otherProjects.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-faint leading-relaxed">
                {currentWorkspace
                  ? 'No standalone projects outside this workspace.'
                  : 'No projects yet. Create one to get started.'}
              </p>
            )}
          </div>
        </div>

        {/* User bar */}
        <div className="border-t border-border px-4 py-3 flex items-center gap-2.5">
          <Avatar name={user?.name} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-ink">{user?.name}</p>
            <p className="text-xs text-ink-faint truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Log out"
            title="Log out"
            className="rounded-lg p-2 text-ink-faint hover:bg-bg hover:text-priority-high transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>

      {/* Workspace Members Modal */}
      <WorkspaceMembersModal
        open={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        workspace={currentWorkspace}
        onUpdated={() => {
          refreshWorkspace();
        }}
      />
    </div>
  );
}
