'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const RESEND_COOLDOWN_S = 60;
const POLL_MS = 4000;

export default function VerifyEmail() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setReady(true); }), []);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
    if (user?.emailVerified) router.replace('/');
  }, [ready, user, router]);

  // Pick up verification done in another tab or on another device.
  useEffect(() => {
    if (!user || user.emailVerified) return;
    const id = setInterval(async () => {
      await user.reload().catch(() => {});
      if (auth.currentUser?.emailVerified) {
        await auth.currentUser.getIdToken(true).catch(() => {});
        router.replace('/');
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = async () => {
    if (!user || cooldown > 0) return;
    try {
      await sendEmailVerification(user);
      setMessage('Verification email sent.');
      setCooldown(RESEND_COOLDOWN_S);
    } catch {
      setMessage('Could not send the email right now. Please try again in a minute.');
    }
  };

  const check = async () => {
    if (!user) return;
    setChecking(true);
    await user.reload().catch(() => {});
    setChecking(false);
    if (auth.currentUser?.emailVerified) {
      await auth.currentUser.getIdToken(true).catch(() => {});
      router.replace('/');
    } else {
      setMessage('Not verified yet. Open the link in the email we sent you.');
    }
  };

  if (!user) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-md mx-auto text-gray-400">Loading...</p></main>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Verify your email</h2>
        <p className="text-gray-300 mb-6">
          We sent a verification link to <span className="font-semibold text-white break-all">{user.email}</span>. Open it to confirm your account.
          Check your spam folder if you don&apos;t see it.
        </p>
        {message && <p className="text-sm text-brand-400 mb-4">{message}</p>}
        <div className="flex flex-col gap-3">
          <button onClick={check} disabled={checking} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-black font-semibold py-3 rounded-lg">
            {checking ? 'Checking…' : "I've verified my email"}
          </button>
          <button onClick={resend} disabled={cooldown > 0} className="border border-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 py-3 rounded-lg">
            {cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend email'}
          </button>
          <button onClick={() => signOut(auth).then(() => router.push('/'))} className="text-sm text-gray-500 hover:text-gray-300">
            Log out
          </button>
        </div>
        <p className="mt-6 text-xs text-gray-500">
          Wrong address? <Link href="/signup" className="text-brand-500 underline">Sign up again</Link> after logging out.
        </p>
      </div>
    </div>
  );
}
