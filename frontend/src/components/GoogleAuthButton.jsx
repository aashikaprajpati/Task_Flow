import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import Button from './Button';
import { Field, Select } from './FormField';

export default function GoogleAuthButton({ label = 'Continue with Google' }) {
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyType, setCompanyType] = useState('agency');
  const isSignup = label.toLowerCase().includes('sign up');

  const demoAccounts = [
    { name: 'Aashika Prajapati', email: 'aashika.prajapati@gmail.com' },
    { name: 'Matina Maharjan', email: 'matina.maharjan@gmail.com' },
    { name: 'Samriddhi Shrestha', email: 'samriddhi.shrestha@gmail.com' },
  ];

  async function handleGoogleLogin(email, name) {
    setLoading(true);
    try {
      await loginWithGoogle({ email, name, companyType: isSignup ? companyType : '' });
      toast.success(`Welcome, ${name}!`);
      setModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm hover:bg-bg transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.4 7.37 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.6 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{label}</span>
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sign in with Google"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-soft leading-relaxed">
            No Google Cloud project is configured for this environment, so sign-in is limited to
            these fixed demo accounts (they cannot be used to access anyone else's account).
          </p>

          {isSignup && (
            <Field label="What kind of company do you run?">
              <Select value={companyType} onChange={(e) => setCompanyType(e.target.value)}>
                <option value="agency">Agency (creative, video, marketing)</option>
                <option value="tech">Tech / Software development</option>
                <option value="financial">Financial services</option>
                <option value="consulting">Consulting</option>
                <option value="production">Production / Studio</option>
                <option value="other">Other / General team</option>
              </Select>
            </Field>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Demo Google Accounts
            </span>
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => handleGoogleLogin(acc.email, acc.name)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent hover:bg-accent-soft/30 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-semibold flex items-center justify-center text-xs">
                  {acc.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{acc.name}</p>
                  <p className="text-xs text-ink-faint truncate">{acc.email}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
