'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { ApiRequestError } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, fullName || undefined);
      router.push('/profile');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Set up once, reuse your details on every form.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
        <Input id="fullName" label="Full Name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input id="email" type="email" label="Email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          id="password"
          type="password"
          label="Password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="font-label-sm text-label-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="rounded w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
      <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-md">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
