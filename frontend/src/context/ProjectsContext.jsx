import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { projectsApi } from '../api/endpoints';
import { useAuth } from './AuthContext';

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { projects } = await projectsApi.list();
      setProjects(projects);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else {
      setProjects([]);
      setLoading(false);
    }
  }, [user, refresh]);

  return <ProjectsContext.Provider value={{ projects, loading, refresh }}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider');
  return ctx;
}
