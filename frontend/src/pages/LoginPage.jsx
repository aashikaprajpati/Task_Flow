import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { loginSchema } from '../lib/schemas';
import { useAuth } from '../context/AuthContext';
import { Field, Input } from '../components/FormField';
import Button from '../components/Button';
import AuthShell from '../components/AuthShell';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await login(data);
      navigate('/dashboard');
    } catch (err) {
      if (err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => setError(field, { message }));
      }
      setServerError(err.message || 'Could not log in.');
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up where your team left off."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GoogleAuthButton label="Sign in with Google" />

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-2 text-ink-faint">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
        </Field>
        {serverError && (
          <p className="text-sm text-priority-high bg-priority-highSoft rounded-lg px-3 py-2" role="alert">
            {serverError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full mt-1">
          Log in
        </Button>
        <div className="text-xs text-ink-faint bg-bg border border-border rounded-lg px-3 py-2 leading-relaxed">
          Demo account: <span className="font-mono">alice@taskflow.dev</span> / <span className="font-mono">password123</span>
        </div>
      </form>
    </div>
  </AuthShell>
  );
}
