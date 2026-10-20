'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Avatar from '@/components/Avatar';
import AvatarCropper from '@/components/AvatarCropper';
import {
  BIO_MAX, LINKS_MAX, LINK_PLATFORMS, NAME_MAX, Profile, ProfileLink,
  emptyProfile, getProfile, normalizeUrl, removeAvatarFile, saveProfile, uploadAvatar, validateAvatar,
} from '@/lib/profile';

export default function AccountAppearance() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) return;
      try {
        const existing = await getProfile(u.uid);
        setProfile(existing ?? emptyProfile(u));
      } catch {
        setProfile(emptyProfile(u));
      }
    });
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!authReady || (user && !profile)) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-2xl mx-auto text-gray-400">Loading...</p></main>;
  }

  if (!user || !profile) {
    return (
      <main className="flex-1 py-12 px-6">
        <p className="max-w-2xl mx-auto text-gray-400">
          <Link href="/login" className="text-brand-500 underline">Log in</Link> to edit your profile.
        </p>
      </main>
    );
  }

  const update = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch });
  const updateLink = (i: number, patch: Partial<ProfileLink>) =>
    update({ links: profile.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    const err = validateAvatar(file);
    if (err) {
      setMessage({ type: 'error', text: err });
      return;
    }
    setMessage(null);
    setCropSource(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!profile.displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name is required.' });
      return;
    }
    const badLink = profile.links.find((l) => l.url.trim() && !normalizeUrl(l.url));
    if (badLink) {
      setMessage({ type: 'error', text: `"${badLink.url}" is not a valid web address.` });
      return;
    }

    setSaving(true);
    try {
      let next = profile;
      if (avatarFile) {
        const { photoURL, photoPath } = await uploadAvatar(user, avatarFile, profile.photoPath);
        next = { ...next, photoURL, photoPath };
      } else if (removeAvatar) {
        await removeAvatarFile(profile.photoPath);
        next = { ...next, photoURL: null, photoPath: null };
      }
      await saveProfile(user, next);
      setProfile({ ...next, links: next.links.filter((l) => l.url.trim()) });
      setAvatarFile(null);
      setRemoveAvatar(false);
      setMessage({ type: 'ok', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not save profile.' });
    } finally {
      setSaving(false);
    }
  };

  const shownPhoto = removeAvatar ? null : avatarPreview ?? profile.photoURL;
  const inputClass = 'w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700';

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Edit Profile</h1>
          <Link href={`/users/${user.uid}`} className="text-brand-500 hover:text-brand-400 text-sm">View public profile →</Link>
        </div>

        <form onSubmit={handleSave} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 space-y-8">
          <section>
            <h2 className="text-white font-semibold mb-3">Profile photo</h2>
            <div className="flex items-center gap-5">
              <Avatar name={profile.displayName} photoURL={shownPhoto} size={96} />
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }}
                />
                <button type="button" onClick={() => fileInput.current?.click()} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm">
                  Choose photo
                </button>
                {shownPhoto && (
                  <button type="button" onClick={() => { setAvatarFile(null); setRemoveAvatar(true); }} className="text-red-400 hover:text-red-300 text-sm text-left">
                    Remove photo
                  </button>
                )}
                <p className="text-gray-500 text-xs">Images only, up to 5 MB.</p>
              </div>
            </div>
          </section>

          <section>
            <label htmlFor="displayName" className="block text-white font-semibold mb-2">Display name</label>
            <input id="displayName" className={inputClass} value={profile.displayName} maxLength={NAME_MAX} onChange={(e) => update({ displayName: e.target.value })} required />
          </section>

          <section>
            <label htmlFor="bio" className="block text-white font-semibold mb-2">Bio</label>
            <textarea id="bio" rows={4} className={`${inputClass} resize-none`} value={profile.bio} maxLength={BIO_MAX} placeholder="Tell people a bit about yourself and your music..." onChange={(e) => update({ bio: e.target.value })} />
            <p className="text-gray-500 text-xs mt-1 text-right">{profile.bio.length}/{BIO_MAX}</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3">Links</h2>
            <div className="space-y-3">
              {profile.links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <select aria-label="Platform" value={link.label} onChange={(e) => updateLink(i, { label: e.target.value })} className="px-3 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {LINK_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input aria-label="URL" className={inputClass} value={link.url} placeholder="https://..." onChange={(e) => updateLink(i, { url: e.target.value })} />
                  <button type="button" aria-label="Remove link" onClick={() => update({ links: profile.links.filter((_, idx) => idx !== i) })} className="px-3 text-gray-400 hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
            {profile.links.length < LINKS_MAX && (
              <button type="button" onClick={() => update({ links: [...profile.links, { label: LINK_PLATFORMS[0], url: '' }] })} className="mt-3 text-brand-500 hover:text-brand-400 text-sm">
                + Add link
              </button>
            )}
          </section>

          {message && <p className={message.type === 'ok' ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{message.text}</p>}

          <button type="submit" disabled={saving} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>

      {cropSource && (
        <AvatarCropper
          file={cropSource}
          onCancel={() => setCropSource(null)}
          onConfirm={(cropped) => {
            setAvatarFile(cropped);
            setRemoveAvatar(false);
            setCropSource(null);
          }}
        />
      )}
    </main>
  );
}
