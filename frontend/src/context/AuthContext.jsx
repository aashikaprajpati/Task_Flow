import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('taskflow_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('taskflow_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { user, token } = await authApi.login(credentials);
    localStorage.setItem('taskflow_token', token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    const { user, token } = await authApi.register(data);
    localStorage.setItem('taskflow_token', token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('taskflow_token');
    setUser(null);
    authApi.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
