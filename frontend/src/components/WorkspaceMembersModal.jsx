import { useState } from 'react';
import { UserPlus, X, Shield, ShieldCheck, User } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Input, Select } from './FormField';
import Avatar from './Avatar';
import { authApi } from '../api/endpoints';
import { workspacesApi } from '../api/workspaces';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function WorkspaceMembersModal({ open, onClose, workspace, onUpdated }) {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedRole, setSelectedRole] = useState('member');
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);

  if (!workspace) return null;

  const currentMemberRecord = workspace.members?.find((m) => m.id === currentUser?.id);
  const canManage = currentMemberRecord?.workspaceRole === 'owner' || currentMemberRecord?.workspaceRole === 'admin';

  async function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { users } = await authApi.searchUsers(q);
      const memberIds = new Set(workspace.members?.map((m) => m.id) || []);
      setResults(users.filter((u) => !memberIds.has(u.id)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(userId) {
    setAddingId(userId);
    try {
      const { workspace: updated } = await workspacesApi.addMember(workspace.id, userId, selectedRole);
      onUpdated(updated);
      setResults((prev) => prev.filter((u) => u.id !== userId));
      toast.success('Member added to workspace.');
    } catch (err) {
      toast.error(err.message || 'Could not add member.');
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(userId) {
    try {
      const { workspace: updated } = await workspacesApi.removeMember(workspace.id, userId);
      onUpdated(updated);
      toast.success('Member removed from workspace.');
    } catch (err) {
      toast.error(err.message || 'Could not remove member.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${workspace.name} — Members`}>
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-ink">
              Workspace Roster ({workspace.members?.length || 0})
            </p>
            <span className="text-xs text-ink-faint">
              All members can be assigned to departments
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-thin">
            {workspace.members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5"
              >
                <Avatar name={m.name} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                    {m.id === currentUser?.id && (
                      <span className="text-[10px] text-ink-faint">(You)</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-faint truncate">{m.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                      m.workspaceRole === 'owner'
                        ? 'bg-accent-soft text-accent'
                        : m.workspaceRole === 'admin'
                        ? 'bg-status-progressSoft text-status-progress'
                        : 'bg-bg text-ink-soft'
                    }`}
                  >
                    {m.workspaceRole === 'owner' && <ShieldCheck size={11} />}
                    {m.workspaceRole === 'admin' && <Shield size={11} />}
                    {m.workspaceRole === 'member' && <User size={11} />}
                    {m.workspaceRole}
                  </span>

                  {canManage && m.workspaceRole !== 'owner' && m.id !== currentUser?.id && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      aria-label={`Remove ${m.name}`}
                      className="text-ink-faint hover:text-priority-high p-1 rounded transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {canManage && (
          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold text-ink mb-2">Add Member to Workspace</p>
            <p className="text-xs text-ink-faint mb-3">
              Search any registered user to invite them into {workspace.name}.
            </p>

            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or email..."
                  value={query}
                  onChange={handleSearch}
                />
              </div>
              <div className="w-32">
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
            </div>

            {searching && <p className="text-xs text-ink-faint">Searching...</p>}

            {results.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 max-h-36 overflow-y-auto scrollbar-thin">
                {results.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 bg-bg/50 hover:bg-bg transition-colors"
                  >
                    <Avatar name={u.name} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{u.name}</p>
                      <p className="text-[11px] text-ink-faint truncate">{u.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAdd(u.id)}
                      loading={addingId === u.id}
                      className="shrink-0 text-xs py-1 px-2.5"
                    >
                      <UserPlus size={13} /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
