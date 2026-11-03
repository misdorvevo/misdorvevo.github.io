'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { needsLicenseAcceptance, recordLicenseAcceptance } from '@/lib/profile';

type State = 'none' | 'checking' | 'needed' | 'ok';

// Blocks the whole site for any signed-in account that hasn't accepted the sample license,
// no matter which page or sign-in route they came through.
export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<State>('none');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecked(false);
      setError('');
      if (!u) return setState('none');
      setState('checking');
      // Fail closed: if the check errors, keep the gate up.
      needsLicenseAcceptance(u.uid)
        .then((needed) => setState(needed ? 'needed' : 'ok'))
        .catch(() => setState('needed'));
    });
  }, []);

  const accept = async () => {
    if (!user || !checked) return;
    setBusy(true);
    setError('');
    try {
      await recordLicenseAcceptance(user, user.displayName ?? '');
      setState('ok');
    } catch {
      setError('Could not save your agreement. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'none' || state === 'ok') return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black px-4 py-8">
      {state === 'checking' ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-3xl font-bold text-center mb-3 text-white">One last step</h2>
          <p className="text-center text-gray-400 text-sm mb-6">You need to accept the sample license before using Co-Drop.</p>
          <label className="flex items-start gap-3 mb-6 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
            />
            <span>
              I agree that any samples I upload are licensed to all Co-Drop users under a{' '}
              <strong className="text-white">royalty-free, non-exclusive, perpetual, worldwide license</strong>, allowing them to use, modify and
              include the samples in their own commercial and non-commercial music without payment or attribution. I keep ownership of my
              work, and I confirm I own or control the rights to everything I upload.
            </span>
          </label>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="button"
            onClick={accept}
            disabled={!checked || busy}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {busy ? 'Saving…' : 'Agree and continue'}
          </button>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-4 w-full text-sm text-gray-400 hover:text-white"
          >
            Decline and sign out
          </button>
        </div>
      )}
    </div>
  );
}
