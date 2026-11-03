'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { DEFAULT_PRIVACY, getProfile, savePrivacy, type Privacy } from '@/lib/profile';

type Notice = { type: 'ok' | 'error'; text: string } | null;

const buttonClass =
  'bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
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

export default function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [privacy, setPrivacy] = useState<Privacy>(DEFAULT_PRIVACY);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<Notice>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

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

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-white">Account Settings</h1>

        <Section
          title="Sign-in"
          description={`Signed in as ${user.email ?? 'unknown'} with ${
            user.providerData.map((p) => (p.providerId === 'google.com' ? 'Google' : p.providerId === 'github.com' ? 'GitHub' : p.providerId)).join(', ') || 'a linked account'
          }. Your password is managed by that provider; Co-Drop never stores one.`}
        >
          <p className="text-sm text-gray-400">To change your email or password, update it with Google or GitHub.</p>
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
