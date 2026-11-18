'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import Brand from './Brand';
import { errorMessage, useAuth, type User } from '@/context/AuthContext';

export default function AuthForm({ register = false }: { register?: boolean }) {
  const { login, apiFetch } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    setError('');
    setBusy(true);
    try {
      const result = await apiFetch<{ token: string; user: User }>(register ? '/auth/register' : '/auth/login', {
        method: 'POST', body: JSON.stringify(form),
      });
      login(result.token, result.user);
    } catch (error) {
      setError(errorMessage(error, 'Unable to continue. Please try again.'));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="public-container flex min-h-[72px] items-center justify-between gap-3"><Brand /></div>
      </header>
      <main className="mx-auto w-full max-w-[465px] px-4 pt-10 pb-16 sm:pt-18">
        <div className="surface-card p-6 sm:p-9">
          <h1 className="page-title">{register ? 'Create your account' : 'Sign in'}</h1>
          <p className="mt-2 text-sm text-copy">{register ? 'Set up your contracts and billing workspace.' : 'Access your contracts and billing workspace.'}</p>
          {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <form onSubmit={submit} className="mt-6 grid gap-4">
            {register && <label className="grid gap-1.5 text-sm font-semibold">
              Full name
              <input className="field min-h-11 px-3 font-normal" name="name" autoComplete="name" required minLength={2} maxLength={100} />
            </label>}
            <label className="grid gap-1.5 text-sm font-semibold">
              Email address
              <input className="field min-h-11 px-3 font-normal" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Password
              <input className="field min-h-11 px-3 font-normal" name="password" type="password"
                autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required />
              {register && <span className="text-xs font-normal text-copy">At least 8 characters.</span>}
            </label>
            <button type="submit" disabled={busy} className="action mt-2">
              {busy && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
              {register ? 'Create account' : 'Sign in'}
              {!busy && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </form>
          <p className="mt-6 border-t border-line pt-5 text-sm text-copy">
            {register ? 'Already have an account?' : 'New here?'}{' '}
            <Link href={register ? '/login' : '/register'} className="font-semibold text-brand hover:underline">
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
