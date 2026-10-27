'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { DEFAULT_PRIVACY, getProfile, savePrivacy, type Privacy } from '@/lib/profile';

type Notice = { type: 'ok' | 'error'; text: string } | null;

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500';
const buttonClass =
  'bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm';

function errorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Your current password is incorrect.';
    case 'auth/email-already-in-use':
      return 'That email is already used by another account.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a bit and try again.';
    case 'auth/requires-recent-login':
      return 'Please log out and back in, then try again.';
    case 'auth/operation-not-allowed':
      return 'Changing email this way is not enabled for this project.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong.';
  }
}

function NoticeText({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <p className={`text-sm ${notice.type === 'ok' ? 'text-brand-400' : 'text-red-400'}`}>{notice.text}</p>;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span>
        <span className="block text-white font-medium">{label}</span>
        <span className="block text-gray-400 text-sm">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-brand-500"
      />
    </label>
  );
}

async function reauthenticate(user: User, currentPassword: string) {
  if (!user.email) throw new Error('This account has no email address.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
}

export default function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [privacy, setPrivacy] = useState<Privacy>(DEFAULT_PRIVACY);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<Notice>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailNotice, setEmailNotice] = useState<Notice>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) return;
      try {
        const profile = await getProfile(u.uid);
        if (profile) setPrivacy(profile.privacy);
      } catch {
        // Fall back to defaults; saving still works.
      }
      setPrivacyLoaded(true);
    });
  }, []);

  if (!authReady) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-2xl mx-auto text-gray-400">Loading...</p></main>;
  }

  if (!user) {
    return (
      <main className="flex-1 py-12 px-6">
        <p className="max-w-2xl mx-auto text-gray-400">
          <Link href="/login" className="text-brand-500 underline">Log in</Link> to manage your account.
        </p>
      </main>
    );
  }

  const handlePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrivacy(true);
    setPrivacyNotice(null);
    try {
      await savePrivacy(user.uid, privacy);
      setPrivacyNotice({ type: 'ok', text: 'Privacy settings saved.' });
    } catch (err) {
      setPrivacyNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      setEmailNotice({ type: 'error', text: 'That is already your email.' });
      return;
    }
    setSavingEmail(true);
    setEmailNotice(null);
    try {
      await reauthenticate(user, emailPassword);
      await verifyBeforeUpdateEmail(user, email);
      setEmailNotice({ type: 'ok', text: `We sent a confirmation link to ${email}. Your email changes once you click it.` });
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      setEmailNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordNotice({ type: 'error', text: 'Choose a different password than your current one.' });
      return;
    }
    setSavingPassword(true);
    setPasswordNotice(null);
    try {
      await reauthenticate(user, currentPassword);
      await updatePassword(user, newPassword);
      setPasswordNotice({ type: 'ok', text: 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-white">Account Settings</h1>

        <Section title="Email" description={`Signed in as ${user.email ?? 'unknown'}${user.emailVerified ? '' : ' (not verified)'}.`}>
          <form onSubmit={handleEmail} className="space-y-4">
            <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" autoComplete="email" className={inputClass} />
            <input type="password" required value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="Current password" autoComplete="current-password" className={inputClass} />
            <NoticeText notice={emailNotice} />
            <button type="submit" disabled={savingEmail} className={buttonClass}>
              {savingEmail ? 'Sending...' : 'Change email'}
            </button>
          </form>
        </Section>

        <Section title="Password">
          <form onSubmit={handlePassword} className="space-y-4">
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" autoComplete="current-password" className={inputClass} />
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" autoComplete="new-password" className={inputClass} />
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className={inputClass} />
            <NoticeText notice={passwordNotice} />
            <button type="submit" disabled={savingPassword} className={buttonClass}>
              {savingPassword ? 'Updating...' : 'Change password'}
            </button>
          </form>
        </Section>

        <Section title="Privacy" description="Control who can contact you and what appears on your public profile.">
          <form onSubmit={handlePrivacy} className="space-y-5">
            <Toggle
              label="Allow direct messages"
              description="When off, other users can't start or continue a conversation with you."
              checked={privacy.allowDMs}
              onChange={(allowDMs) => setPrivacy({ ...privacy, allowDMs })}
            />
            <Toggle
              label="Show my bio on my profile"
              description="Hide your bio from other visitors. You'll still see it."
              checked={privacy.showBio}
              onChange={(showBio) => setPrivacy({ ...privacy, showBio })}
            />
            <Toggle
              label="Show my social links on my profile"
              description="Hide your Instagram, SoundCloud and other links from other visitors."
              checked={privacy.showLinks}
              onChange={(showLinks) => setPrivacy({ ...privacy, showLinks })}
            />
            <NoticeText notice={privacyNotice} />
            <button type="submit" disabled={savingPrivacy || !privacyLoaded} className={buttonClass}>
              {savingPrivacy ? 'Saving...' : 'Save privacy settings'}
            </button>
          </form>
        </Section>
      </div>
    </main>
  );
}
