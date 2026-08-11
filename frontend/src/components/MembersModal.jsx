import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Input } from './FormField';
import Avatar from './Avatar';
import { authApi, projectsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

export default function MembersModal({ open, onClose, project, onUpdated, isOwner }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
      const memberIds = new Set(project.members.map((m) => m.id));
      setResults(users.filter((u) => !memberIds.has(u.id)));
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(userId) {
    try {
      const { project: updated } = await projectsApi.addMember(project.id, userId);
      onUpdated(updated);
      setResults((r) => r.filter((u) => u.id !== userId));
      toast.success('Member added.');
    } catch (err) {
      toast.error(err.message || 'Could not add member.');
    }
  }

  async function handleRemove(userId) {
    try {
      const { project: updated } = await projectsApi.removeMember(project.id, userId);
      onUpdated(updated);
      toast.success('Member removed.');
    } catch (err) {
      toast.error(err.message || 'Could not remove member.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Project members">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-ink mb-2">Current members ({project.members.length})</p>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
                <Avatar name={m.name} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-ink-faint truncate">{m.email}</p>
                </div>
                {m.id === project.ownerId ? (
                  <span className="text-[11px] font-semibold text-accent bg-accent-soft rounded-full px-2 py-0.5">Owner</span>
                ) : isOwner ? (
                  <button
                    onClick={() => handleRemove(m.id)}
                    aria-label={`Remove ${m.name}`}
                    className="text-ink-faint hover:text-priority-high p-1"
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {isOwner && (
          <div>
            <p className="text-sm font-medium text-ink mb-2">Add a member</p>
            <Input placeholder="Search by name or email..." value={query} onChange={handleSearch} />
            {searching && <p className="text-xs text-ink-faint mt-2">Searching...</p>}
            {results.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 max-h-40 overflow-y-auto scrollbar-thin">
                {results.map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
                    <Avatar name={u.name} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-ink-faint truncate">{u.email}</p>
                    </div>
                    <button onClick={() => handleAdd(u.id)} aria-label={`Add ${u.name}`} className="text-ink-faint hover:text-accent p-1">
                      <UserPlus size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
