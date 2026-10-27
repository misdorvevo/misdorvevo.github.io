'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  ARCHIVE_WEEKS,
  EMPTY_CONFIG,
  getChallenge,
  MAX_CHALLENGE_PROMPT_LENGTH,
  MAX_CHALLENGE_TITLE_LENGTH,
  isModerator,
  pickRandomPack,
  promptFor,
  saveChallenge,
  subscribeToSubmissions,
  weekEnd,
  weekIndexAt,
  weekStart,
  type ChallengeConfig,
  type Submission,
} from '@/lib/challenges';

interface Pack {
  id: string;
  name: string;
}

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const field = 'w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500';

function AdminView() {
  const router = useRouter();
  const params = useSearchParams();
  const currentWeek = weekIndexAt(new Date());
  const requested = Number(params.get('week'));
  // Moderators can prepare up to two weeks ahead and edit any past week (e.g. to pick a winner).
  const week = Number.isInteger(requested) && requested > 0 && requested <= currentWeek + 2 ? requested : currentWeek;

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [submissions, setSubmissions] = useState<{ week: number; list: Submission[] } | null>(null);
  const [saved, setSaved] = useState<{ week: number; config: ChallengeConfig } | null>(null);
  const [draft, setDraft] = useState<{ week: number; config: ChallengeConfig } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); }), []);

  const allowed = isModerator(user?.uid);

  useEffect(() => {
    if (!allowed) return;
    getDocs(collection(db, 'samplePacks'))
      .then((snap) => setPacks(snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) ?? d.id }))))
      .catch(() => {});
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    getChallenge(week).then((config) => active && setSaved({ week, config }));
    return () => { active = false; };
  }, [allowed, week]);

  useEffect(() => {
    if (!allowed) return;
    return subscribeToSubmissions(week, (list) => setSubmissions({ week, list }), () => setSubmissions({ week, list: [] }));
  }, [allowed, week]);

  if (!authReady) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-3xl mx-auto text-gray-400">Loading...</p></main>;
  }

  if (!allowed) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-3xl mx-auto text-gray-400">
          <p>You don&apos;t have access to this page.</p>
          <Link href="/challenge" className="text-brand-500 underline">Back to the challenge</Link>
        </div>
      </main>
    );
  }

  const weekSubs = submissions?.week === week ? submissions.list : [];
  const savedConfig = saved?.week === week ? saved.config : null;
  const config = draft?.week === week ? draft.config : savedConfig ?? EMPTY_CONFIG;
  const update = (patch: Partial<ChallengeConfig>) => {
    setMessage('');
    setDraft({ week, config: { ...config, ...patch } });
  };

  const randomDefault = pickRandomPack(packs, week);
  const weeks = Array.from({ length: ARCHIVE_WEEKS + 3 }, (_, i) => currentWeek + 2 - i).filter((w) => w > 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await saveChallenge(week, config);
      setSaved({ week, config });
      setDraft(null);
      setMessage('Saved.');
    } catch {
      setMessage('Could not save. Make sure the latest Firestore rules are deployed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href={`/challenge?week=${Math.min(week, currentWeek)}`} className="text-brand-500 hover:text-brand-400 mb-6 inline-block">← Back to challenge</Link>
        <h1 className="text-4xl font-bold text-white mb-2">Manage challenges</h1>
        <p className="text-gray-400 mb-6">Blank fields fall back to the automatic prompt and a randomly picked pack.</p>

        <label className="block text-sm text-gray-300 mb-6">
          Week
          <select value={week} onChange={(e) => router.replace(`/challenge/admin?week=${e.target.value}`)} className={`${field} mt-1`}>
            {weeks.map((w) => (
              <option key={w} value={w}>
                {fmt(weekStart(w))} – {fmt(new Date(weekEnd(w).getTime() - 1))}
                {w === currentWeek ? ' (current)' : w > currentWeek ? ' (upcoming)' : ''}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          <label className="block text-sm text-gray-300">
            Challenge name
            <input value={config.title} onChange={(e) => update({ title: e.target.value })} maxLength={MAX_CHALLENGE_TITLE_LENGTH} placeholder="Weekly Challenge" className={`${field} mt-1`} />
          </label>

          <label className="block text-sm text-gray-300">
            Prompt
            <textarea value={config.prompt} onChange={(e) => update({ prompt: e.target.value })} maxLength={MAX_CHALLENGE_PROMPT_LENGTH} rows={3} placeholder={promptFor(week)} className={`${field} mt-1`} />
          </label>

          <label className="block text-sm text-gray-300">
            Featured pack
            <select value={config.packId} onChange={(e) => update({ packId: e.target.value })} className={`${field} mt-1`}>
              <option value="">Random{randomDefault ? ` (currently ${randomDefault.name})` : ''}</option>
              {packs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label className="block text-sm text-gray-300">
            Winner
            <select value={config.winnerId} onChange={(e) => update({ winnerId: e.target.value })} className={`${field} mt-1`}>
              <option value="">No winner yet</option>
              {weekSubs.map((s) => <option key={s.id} value={s.id}>{s.title} — {s.authorName}</option>)}
            </select>
            {weekSubs.length === 0 && <span className="text-xs text-gray-500">No submissions for this week yet.</span>}
          </label>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-lg">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {message && <p className={`text-sm ${message === 'Saved.' ? 'text-brand-400' : 'text-red-400'}`}>{message}</p>}
          </div>
        </form>
      </div>
    </main>
  );
}

export default function ChallengeAdminPage() {
  return (
    <Suspense fallback={<main className="flex-1 py-12 px-6"><p className="max-w-3xl mx-auto text-gray-400">Loading...</p></main>}>
      <AdminView />
    </Suspense>
  );
}
