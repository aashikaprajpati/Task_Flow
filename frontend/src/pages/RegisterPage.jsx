import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { registerSchema } from '../lib/schemas';
import { useAuth } from '../context/AuthContext';
import { Field, Input, Select } from '../components/FormField';
import Button from '../components/Button';
import AuthShell from '../components/AuthShell';
import GoogleAuthButton from '../components/GoogleAuthButton';

const COMPANY_TYPES = {
  agency: 'Agency (creative, video, marketing)',
  tech: 'Tech / Software development',
  financial: 'Financial services',
  consulting: 'Consulting',
  production: 'Production / Studio',
  other: 'Other / General team',
};

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await registerUser(data);
      navigate('/workspaces/new');
    } catch (err) {
      if (err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => setError(field, { message }));
      }
      setServerError(err.message || 'Could not create your account.');
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start organizing your team's work in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GoogleAuthButton label="Sign up with Google" />

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-2 text-ink-faint">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field label="Full name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" autoComplete="name" placeholder="Jane Doe" {...register('name')} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters.">
            <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" {...register('password')} />
          </Field>
          <Field label="What kind of company do you run?" htmlFor="companyType" error={errors.companyType?.message}>
            <Select id="companyType" {...register('companyType')} defaultValue="agency">
              {Object.entries(COMPANY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          {serverError && (
            <p className="text-sm text-priority-high bg-priority-highSoft rounded-lg px-3 py-2" role="alert">
              {serverError}
            </p>
          )}
          <Button type="submit" loading={isSubmitting} className="w-full mt-1">
            Create account
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
