'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { timeAgo } from '@/lib/social';
import { MAX_SONG_DESCRIPTION_LENGTH, MAX_SONG_TITLE_LENGTH } from '@/lib/songs';
import {
  ARCHIVE_WEEKS,
  EMPTY_CONFIG,
  deleteSubmission,
  isModerator,
  pickRandomPack,
  promptFor,
  submitEntry,
  getChallenge,
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
  description?: string;
  coverImage?: string;
  uploaderName?: string;
}

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function useCountdown(target: Date) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return '';
  const s = Math.max(0, Math.floor((target.getTime() - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m ${s % 60}s`;
}

function ChallengeView() {
  const params = useSearchParams();
  const currentWeek = weekIndexAt(new Date());
  const requested = Number(params.get('week'));
  const week = Number.isInteger(requested) && requested > 0 && requested <= currentWeek ? requested : currentWeek;
  const isCurrent = week === currentWeek;

  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [loaded, setLoaded] = useState<{ week: number; list: Submission[] } | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [configState, setConfigState] = useState<{ week: number; config: ChallengeConfig } | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let active = true;
    getChallenge(week).then((config) => active && setConfigState({ week, config }));
    return () => { active = false; };
  }, [week]);

  useEffect(() => {
    let active = true;
    getDocs(collection(db, 'samplePacks'))
      .then((snap) => active && setPacks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pack, 'id'>) }))))
      .catch(() => active && setPacks([]));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return subscribeToSubmissions(week, (list) => setLoaded({ week, list }), () => setLoaded({ week, list: [] }));
  }, [week]);

  const submissions = loaded?.week === week ? loaded.list : null;
  const config = configState?.week === week ? configState.config : EMPTY_CONFIG;
  const featuredPack = packs ? (packs.find((p) => p.id === config.packId) ?? pickRandomPack(packs, week)) : null;
  const prompt = config.prompt || promptFor(week);
  const winner = submissions?.find((s) => s.id === config.winnerId) ?? null;
  const countdown = useCountdown(weekEnd(week));
  const archive = Array.from({ length: ARCHIVE_WEEKS }, (_, i) => currentWeek - 1 - i).filter((w) => w > 0);

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">
          {isCurrent ? 'Weekly Challenge' : 'Challenge Archive'}
        </p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{config.title || 'Weekly Challenge'}</h1>
          {isModerator(user?.uid) && (
            <Link href={`/challenge/admin?week=${week}`} className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700">
              Manage
            </Link>
          )}
        </div>
        <p className="text-gray-400">{fmt(weekStart(week))} – {fmt(new Date(weekEnd(week).getTime() - 1))}</p>
        {!isCurrent && (
          <p className="mb-4">
            <Link href="/challenge" className="text-brand-500 hover:text-brand-400">← Back to this week&apos;s challenge</Link>
          </p>
        )}

        <div className="hero-panel rounded-3xl p-8 md:p-12 mt-6">
          <p className="text-brand-300 text-xs font-semibold uppercase tracking-[0.2em] mb-3">This week&apos;s prompt</p>
          <p className="text-3xl md:text-5xl font-bold text-gradient leading-tight">{prompt}</p>
          <p className="mt-4 text-sm text-gray-400">
            {isCurrent ? (
              <>Ends in <span className="text-brand-400 font-semibold tabular-nums">{countdown}</span></>
            ) : (
              'This challenge has ended. Submissions are archived below.'
            )}
          </p>
        </div>

        {winner && (
          <div className="mt-6 rounded-2xl border border-yellow-500/50 bg-yellow-500/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-yellow-400">🏆 Winner</p>
            <p className="mt-1 text-xl font-bold text-white">{winner.title}</p>
            <p className="text-sm text-gray-300">
              by <Link href={`/users/${winner.authorUid}`} className="text-brand-400 hover:underline">{winner.authorName}</Link>
            </p>
            <audio controls preload="none" src={winner.audioUrl} className="mt-3 w-full" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">Featured pack</h2>
        {packs === null ? (
          <p className="text-gray-500">Loading...</p>
        ) : !featuredPack ? (
          <p className="text-gray-500">No packs available yet.</p>
        ) : (
          <Link href={`/packs/${featuredPack.id}`} className="card-lift flex max-w-xl gap-4 bg-gray-900 border border-gray-800 hover:border-brand-500 rounded-xl overflow-hidden">
            <div className="w-40 shrink-0 aspect-square bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              {featuredPack.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featuredPack.coverImage} alt={featuredPack.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold px-4 text-center">{featuredPack.name}</span>
              )}
            </div>
            <div className="p-4 min-w-0 self-center">
              <p className="font-semibold text-white text-lg break-words">{featuredPack.name}</p>
              {featuredPack.uploaderName && <p className="text-sm text-gray-500">by {featuredPack.uploaderName}</p>}
              {featuredPack.description && <p className="text-sm text-gray-400 mt-2 line-clamp-3">{featuredPack.description}</p>}
            </div>
          </Link>
        )}

        {isCurrent && <SubmitForm user={user} week={week} pack={featuredPack} />}

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Submissions {submissions && `(${submissions.length})`}
        </h2>
        {submissions === null ? (
          <p className="text-gray-500">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-gray-500">{isCurrent ? 'No submissions yet — be the first!' : 'Nobody submitted this week.'}</p>
        ) : (
          <ul className="space-y-4">
            {submissions.map((s) => (
              <li key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-white break-words">{winner?.id === s.id && '🏆 '}{s.title}</p>
                    <p className="text-sm text-gray-400">
                      by <Link href={`/users/${s.authorUid}`} className="text-brand-400 hover:underline">{s.authorName}</Link>
                      {' • '}{timeAgo(s.createdAt)}
                      {s.packName && <> • made with <Link href={`/packs/${s.packId}`} className="hover:underline">{s.packName}</Link></>}
                    </p>
                  </div>
                  {(user?.uid === s.authorUid ? isCurrent : isModerator(user?.uid)) && (
                    <button
                      onClick={() => confirm('Delete this submission?') && deleteSubmission(s).catch(() => alert('Could not delete submission.'))}
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

        {archive.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-white mt-12 mb-4">Past challenges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {archive.map((w) => (
                <Link
                  key={w}
                  href={`/challenge?week=${w}`}
                  className={`card-lift bg-gray-900 border rounded-xl p-4 hover:border-brand-500 ${w === week ? 'border-brand-500' : 'border-gray-800'}`}
                >
                  <p className="text-sm text-brand-400">{fmt(weekStart(w))} – {fmt(new Date(weekEnd(w).getTime() - 1))}</p>
                  <p className="text-gray-300 text-sm mt-1 line-clamp-2">{promptFor(w)}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function SubmitForm({ user, week, pack }: { user: User | null; week: number; pack: Pack | null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!user) {
    return (
      <p className="mt-8 text-gray-400">
        <Link href="/login" className="text-brand-500 underline">Log in</Link> to submit your track.
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return setError('Choose an audio file.');
    if (!pack) return setError('No featured pack yet.');
    setError('');
    setDone(false);
    setProgress(0);
    try {
      await submitEntry(week, user, { title, description, file, packId: pack.id, packName: pack.name }, setProgress);
      setTitle('');
      setDescription('');
      setFile(null);
      e.currentTarget.reset();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
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
      {pack && <p className="text-sm text-gray-400">Make it with <span className="text-white font-semibold">{pack.name}</span>.</p>}
      <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required className="block w-full text-sm text-gray-300" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {done && <p className="text-brand-400 text-sm">Submitted! Your track is in the list below.</p>}
      <button
        type="submit"
        disabled={progress !== null || !pack}
        className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-lg"
      >
        {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : 'Submit'}
      </button>
    </form>
  );
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<main className="flex-1 py-12 px-6"><p className="max-w-5xl mx-auto text-gray-400">Loading...</p></main>}>
      <ChallengeView />
    </Suspense>
  );
}
