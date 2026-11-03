'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { timeAgo } from '@/lib/social';
import { MAX_SONG_DESCRIPTION_LENGTH, MAX_SONG_TITLE_LENGTH } from '@/lib/songs';
import {
  battleStatus,
  deleteBattle,
  deleteBattleSubmission,
  formatClock,
  joinBattle,
  leaveBattle,
  startBattle,
  submitBattleEntry,
  subscribeToBattle,
  subscribeToBattleSubmissions,
  subscribeToParticipants,
  type Battle,
  type BattleSubmission,
  type Participant,
} from '@/lib/battles';

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  // undefined = still loading, null = not found
  const [battle, setBattle] = useState<Battle | null | undefined>(undefined);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<BattleSubmission[]>([]);
  const [busy, setBusy] = useState(false);
  const now = useNow();

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => subscribeToBattle(id, setBattle, () => setBattle(null)), [id]);
  useEffect(() => subscribeToParticipants(id, setParticipants, () => setParticipants([])), [id]);
  useEffect(() => subscribeToBattleSubmissions(id, setSubmissions, () => setSubmissions([])), [id]);

  if (battle === undefined) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-4xl mx-auto text-gray-400">Loading...</p></main>;
  }
  if (battle === null) {
    return (
      <main className="flex-1 py-12 px-6">
        <p className="max-w-4xl mx-auto text-gray-400">
          This challenge doesn&apos;t exist. <Link href="/challenges" className="text-brand-500 underline">Back to challenges</Link>
        </p>
      </main>
    );
  }

  const status = battleStatus(battle.startedAt ? 'live' : 'lobby', battle.endsAt, now);
  const isCreator = user?.uid === battle.creatorUid;
  const joined = !!user && participants.some((p) => p.uid === user.uid);
  const mine = submissions.find((s) => s.authorUid === user?.uid);
  const remaining = battle.endsAt ? battle.endsAt.getTime() - now : battle.durationMin * 60_000;

  const run = async (fn: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      alert(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/challenges" className="text-brand-500 hover:text-brand-400 text-sm">← All challenges</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="min-w-0">
            <h1 className="text-4xl md:text-5xl font-bold text-white break-words">{battle.title}</h1>
            <p className="text-gray-400 mt-1">
              by <Link href={`/users/${battle.creatorUid}`} className="text-brand-400 hover:underline">{battle.creatorName}</Link>
              {' • '}{battle.durationMin} min • {timeAgo(battle.createdAt)}
            </p>
          </div>
          {isCreator && (
            <button
              onClick={() => confirm('Delete this challenge?') && run(async () => { await deleteBattle(id); router.push('/challenges'); }, 'Could not delete challenge.')}
              className="shrink-0 text-sm text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          )}
        </div>

        {battle.prompt && <p className="mt-4 text-gray-300 whitespace-pre-wrap break-words">{battle.prompt}</p>}

        <div className="hero-panel rounded-3xl p-8 md:p-12 mt-6 text-center">
          <p className="text-brand-300 text-xs font-semibold uppercase tracking-[0.2em] mb-3">
            {status === 'lobby' ? 'Waiting room' : status === 'live' ? 'Time remaining' : 'Battle over'}
          </p>
          <p className="text-6xl md:text-8xl font-bold text-gradient tabular-nums">{formatClock(status === 'ended' ? 0 : remaining)}</p>
          {status === 'lobby' && (
            <p className="mt-4 text-sm text-gray-400">
              {isCreator ? 'Start the battle when everyone has joined — the timer begins immediately.' : 'Waiting for the creator to start the battle…'}
            </p>
          )}
          {status === 'lobby' && isCreator && (
            <button
              onClick={() => run(() => startBattle(id), 'Could not start the battle.')}
              disabled={busy}
              className="mt-6 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-8 py-3 rounded-lg"
            >
              Start battle
            </button>
          )}
        </div>

        {status !== 'ended' && (
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-3">Lobby ({participants.length})</h2>
            {participants.length === 0 ? (
              <p className="text-gray-500">Nobody has joined yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {participants.map((p) => (
                  <li key={p.uid} className="flex items-center gap-2 rounded-full bg-gray-800 border border-gray-700 px-4 py-2 text-sm text-white">
                    <Link href={`/users/${p.uid}`} className="hover:underline">{p.name}</Link>
                    {p.uid === battle.creatorUid && <span className="text-xs text-brand-400">host</span>}
                    {isCreator && p.uid !== battle.creatorUid && (
                      <button aria-label={`Remove ${p.name}`} onClick={() => run(() => leaveBattle(id, p.uid), 'Could not remove participant.')} className="text-gray-400 hover:text-red-400">×</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              {!user ? (
                <p className="text-gray-400"><Link href="/login" className="text-brand-500 underline">Log in</Link> to join.</p>
              ) : !joined ? (
                <button onClick={() => run(() => joinBattle(id, user), 'Could not join.')} disabled={busy} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-6 py-2 rounded-lg">
                  Join lobby
                </button>
              ) : status === 'lobby' && !isCreator ? (
                <button onClick={() => run(() => leaveBattle(id, user.uid), 'Could not leave.')} disabled={busy} className="text-sm text-gray-400 hover:text-white">
                  Leave lobby
                </button>
              ) : null}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-white mb-3">Samples ({battle.samples.length})</h2>
          {status === 'lobby' && <p className="text-sm text-gray-400 mb-3">Preview the samples now — downloads unlock when the battle starts.</p>}
          <ul className="space-y-2">
            {battle.samples.map((s) => (
              <li key={s.url} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-900 border border-gray-800 px-4 py-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-white">{s.name}</p>
                  <Link href={`/packs/${s.packId}`} className="text-xs text-gray-500 hover:underline">{s.packName}</Link>
                </div>
                <audio controls preload="none" src={s.url} className="h-8 w-48" />
                {status !== 'lobby' && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" download={s.name} className="text-sm text-brand-400 hover:text-brand-300">Download</a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {status === 'live' && joined && !mine && user && <SubmitForm battleId={id} user={user} />}
        {status === 'live' && user && !joined && (
          <p className="mt-8 text-gray-400">Join the lobby above to submit a track.</p>
        )}

        {status !== 'lobby' && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-white mb-3">Submissions ({submissions.length})</h2>
            {submissions.length === 0 ? (
              <p className="text-gray-500">No submissions yet.</p>
            ) : (
              <ul className="space-y-4">
                {submissions.map((s) => (
                  <li key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-white break-words">{s.title}</p>
                        <p className="text-sm text-gray-400">
                          by <Link href={`/users/${s.authorUid}`} className="text-brand-400 hover:underline">{s.authorName}</Link> • {timeAgo(s.createdAt)}
                        </p>
                      </div>
                      {(user?.uid === s.authorUid || isCreator) && (
                        <button
                          onClick={() => confirm('Delete this submission?') && run(() => deleteBattleSubmission(id, s), 'Could not delete submission.')}
                          className="text-sm text-red-400 hover:text-red-300 shrink-0"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {s.description && <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap break-words">{s.description}</p>}
                    <audio controls preload="none" src={s.audioUrl} className="w-full mt-3" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function SubmitForm({ battleId, user }: { battleId: string; user: User }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Choose an audio file.');
    setError('');
    setProgress(0);
    try {
      await submitBattleEntry(battleId, user, { title, description, file }, setProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. The timer may have run out.');
    } finally {
      setProgress(null);
    }
  };

  const field = 'w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <form onSubmit={handleSubmit} className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white">Submit your track</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_SONG_TITLE_LENGTH} placeholder="Track title" required className={field} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={MAX_SONG_DESCRIPTION_LENGTH} rows={3} placeholder="Tell us about it (optional)" className={field} />
      <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required className="block w-full text-sm text-gray-300" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={progress !== null} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-lg">
        {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : 'Submit'}
      </button>
    </form>
  );
}
