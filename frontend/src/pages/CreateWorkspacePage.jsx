import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, X, Check, Sparkles } from 'lucide-react';
import { workspacesApi, COMPANY_TYPE_LABELS, COMPANY_DEPARTMENT_SUGGESTIONS } from '../api/workspaces';
import { useWorkspace } from '../context/WorkspaceContext';
import { useProjects } from '../context/ProjectsContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Field, Input, Select } from '../components/FormField';
import Button from '../components/Button';
import AuthShell from '../components/AuthShell';

export default function CreateWorkspacePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { refresh: refreshWorkspaces, switchWorkspace } = useWorkspace();
  const { refresh: refreshProjects } = useProjects();

  const [name, setName] = useState('');
  const [companyType, setCompanyType] = useState(user?.companyType || 'agency');
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // When companyType changes, preload suggested departments
  useEffect(() => {
    if (companyType && COMPANY_DEPARTMENT_SUGGESTIONS[companyType]) {
      setSelectedDepartments([...COMPANY_DEPARTMENT_SUGGESTIONS[companyType]]);
    } else {
      setSelectedDepartments([]);
    }
  }, [companyType]);

  const toggleDepartment = (dept) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const addCustomDepartment = (e) => {
    e.preventDefault();
    const trimmed = customDeptInput.trim();
    if (!trimmed) return;
    if (selectedDepartments.includes(trimmed)) {
      toast.error('This department is already added.');
      return;
    }
    setSelectedDepartments((prev) => [...prev, trimmed]);
    setCustomDeptInput('');
  };

  const removeDepartment = (dept) => {
    setSelectedDepartments((prev) => prev.filter((d) => d !== dept));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Workspace name must be at least 2 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const { workspace } = await workspacesApi.create({
        name: name.trim(),
        companyType,
        departments: selectedDepartments,
      });
      await refreshWorkspaces();
      switchWorkspace(workspace.id);
      await refreshProjects();
      toast.success(`"${workspace.name}" created with ${workspace.departments?.length || 0} departments.`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Could not create your workspace.');
    } finally {
      setSubmitting(false);
    }
  }

  const suggestions = COMPANY_DEPARTMENT_SUGGESTIONS[companyType] || [];

  return (
    <AuthShell
      title="Create Company Workspace"
      subtitle="Set up an environment for your company, customize your departments, and start assigning work."
      footer={
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs text-ink-faint hover:text-ink transition-colors"
        >
          Skip to dashboard
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Company / Team Name" htmlFor="wsName">
          <Input
            id="wsName"
            placeholder="e.g. Upaya Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>

        <Field
          label="What kind of company do you run?"
          htmlFor="wsType"
          hint="We will suggest department structures tailored to your industry."
        >
          <Select
            id="wsType"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
          >
            {Object.entries(COMPANY_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        {/* Department Selection & Custom Additions */}
        <div className="rounded-xl border border-border bg-bg/50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent" /> Suggested Departments
            </span>
            <span className="text-[11px] text-ink-faint">
              {selectedDepartments.length} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((dept) => {
              const active = selectedDepartments.includes(dept);
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDepartment(dept)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-surface border border-border text-ink-soft hover:border-accent/40'
                  }`}
                >
                  {active ? <Check size={12} /> : <Plus size={12} />}
                  {dept}
                </button>
              );
            })}
          </div>

          {/* Any custom departments added not in suggestions */}
          {selectedDepartments.filter((d) => !suggestions.includes(d)).length > 0 && (
            <div className="mt-1 pt-2 border-t border-border">
              <span className="text-[11px] font-medium text-ink-faint mb-1.5 block">
                Custom Departments:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedDepartments
                  .filter((d) => !suggestions.includes(d))
                  .map((dept) => (
                    <span
                      key={dept}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-accent-soft text-accent font-medium"
                    >
                      {dept}
                      <button
                        type="button"
                        onClick={() => removeDepartment(dept)}
                        className="hover:text-priority-high p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Custom Department Input */}
          <div className="mt-2 pt-2 border-t border-border flex gap-2">
            <Input
              placeholder="Add custom department (e.g. Video Editing Team)..."
              value={customDeptInput}
              onChange={(e) => setCustomDeptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomDepartment(e);
                }
              }}
              className="text-xs py-1.5"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addCustomDepartment}
              disabled={!customDeptInput.trim()}
              className="shrink-0 text-xs"
            >
              <Plus size={13} /> Add
            </Button>
          </div>
          <p className="text-[11px] text-ink-faint">
            You can always add, rename, or delete departments later.
          </p>
        </div>

        {error && (
          <p className="text-sm text-priority-high bg-priority-highSoft rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting} className="w-full mt-1">
          <Building2 size={15} /> Create Workspace & Departments
        </Button>
      </form>
    </AuthShell>
  );
}
