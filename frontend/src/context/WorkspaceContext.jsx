import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { workspacesApi } from '../api/workspaces';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentId, setCurrentId] = useState(() => localStorage.getItem('taskflow_workspace_id'));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { workspaces } = await workspacesApi.list();
      setWorkspaces(workspaces);
      setCurrentId((prev) => {
        const stillValid = workspaces.some((w) => String(w.id) === String(prev));
        const next = stillValid ? prev : workspaces[0]?.id ? String(workspaces[0].id) : null;
        if (next) localStorage.setItem('taskflow_workspace_id', next);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else {
      setWorkspaces([]);
      setLoading(false);
    }
  }, [user, refresh]);

  const switchWorkspace = useCallback((id) => {
    setCurrentId(String(id));
    localStorage.setItem('taskflow_workspace_id', String(id));
  }, []);

  const current = workspaces.find((w) => String(w.id) === String(currentId)) || null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, current, currentId, loading, refresh, switchWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
