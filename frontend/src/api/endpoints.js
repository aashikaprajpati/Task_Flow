import client from './client';

export const authApi = {
  register: (data) => client.post('/auth/register', data).then((r) => r.data),
  login: (data) => client.post('/auth/login', data).then((r) => r.data),
  logout: () => client.post('/auth/logout').then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
  searchUsers: (q) => client.get('/auth/users', { params: { q } }).then((r) => r.data),
};

export const projectsApi = {
  list: () => client.get('/projects').then((r) => r.data),
  get: (id) => client.get(`/projects/${id}`).then((r) => r.data),
  create: (data) => client.post('/projects', data).then((r) => r.data),
  update: (id, data) => client.put(`/projects/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/projects/${id}`).then((r) => r.data),
  addMember: (id, userId) => client.post(`/projects/${id}/members`, { userId }).then((r) => r.data),
  removeMember: (id, userId) => client.delete(`/projects/${id}/members/${userId}`).then((r) => r.data),
};

export const tasksApi = {
  list: (projectId) => client.get('/tasks', { params: { projectId } }).then((r) => r.data),
  create: (data) => client.post('/tasks', data).then((r) => r.data),
  update: (id, data) => client.put(`/tasks/${id}`, data).then((r) => r.data),
  move: (id, data) => client.patch(`/tasks/${id}/move`, data).then((r) => r.data),
  remove: (id) => client.delete(`/tasks/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  get: () => client.get('/dashboard').then((r) => r.data),
};
