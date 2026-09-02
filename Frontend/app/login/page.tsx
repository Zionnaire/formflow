'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { ApiRequestError } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/forms');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to pick up where you left off.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
        <Input id="email" type="email" label="Email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          id="password"
          type="password"
          label="Password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="font-label-sm text-label-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="rounded w-full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
        </Button>
      </form>
      <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-md">
        New to FormFlow?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
