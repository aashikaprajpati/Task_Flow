import client from './client';

export const workspacesApi = {
  list: () => client.get('/workspaces').then((r) => r.data),
  get: (id) => client.get(`/workspaces/${id}`).then((r) => r.data),
  create: (data) => client.post('/workspaces', data).then((r) => r.data),
  update: (id, data) => client.put(`/workspaces/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/workspaces/${id}`).then((r) => r.data),
  addMember: (id, userId, workspaceRole) =>
    client.post(`/workspaces/${id}/members`, { userId, workspaceRole }).then((r) => r.data),
  removeMember: (id, userId) => client.delete(`/workspaces/${id}/members/${userId}`).then((r) => r.data),
  addDepartment: (id, data) => client.post(`/workspaces/${id}/departments`, data).then((r) => r.data),
  companyTypes: () => client.get('/workspaces/meta/company-types').then((r) => r.data),
};

// Human-friendly labels and starter department suggestions
export const COMPANY_TYPE_LABELS = {
  agency: 'Agency (creative, video, marketing)',
  tech: 'Tech / Software development',
  financial: 'Financial services',
  consulting: 'Consulting',
  production: 'Production / Studio',
  other: 'Other / General team',
};

export const COMPANY_DEPARTMENT_SUGGESTIONS = {
  agency: ['Video Editing Team', 'Production Team', 'Graphic Team', 'Client Accounts'],
  tech: ['Frontend Team', 'Backend Team', 'QA & Testing', 'DevOps & Cloud'],
  financial: ['Compliance', 'Client Services', 'Financial Reporting', 'Audit & Risk'],
  consulting: ['Client Engagements', 'Market Research', 'Proposal Writing'],
  production: ['Pre-Production', 'Production Crew', 'Post-Production'],
  other: ['Operations', 'Marketing', 'Product Team'],
};
