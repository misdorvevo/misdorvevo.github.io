'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  MAX_BATTLE_MINUTES,
  MAX_BATTLE_PROMPT_LENGTH,
  MAX_BATTLE_SAMPLES,
  MAX_BATTLE_TITLE_LENGTH,
  createBattle,
  type BattleSample,
} from '@/lib/battles';

interface PackFile {
  name: string;
  url: string;
}
interface Pack {
  id: string;
  name: string;
  files: PackFile[];
}

export default function NewChallengePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [packId, setPackId] = useState('');
  const [selected, setSelected] = useState<Map<string, BattleSample>>(new Map());
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let active = true;
    getDocs(collection(db, 'samplePacks'))
      .then((snap) => {
        if (!active) return;
        setPacks(
          snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, name: data.name ?? 'Untitled pack', files: (data.files ?? []) as PackFile[] };
          })
        );
      })
      .catch(() => active && setPacks([]));
    return () => { active = false; };
  }, []);

  const pack = packs?.find((p) => p.id === packId) ?? null;
  const toSample = (p: Pack, f: PackFile): BattleSample => ({ name: f.name, url: f.url, packId: p.id, packName: p.name });

  const toggle = (p: Pack, f: PackFile) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(f.url)) next.delete(f.url);
      else if (next.size < MAX_BATTLE_SAMPLES) next.set(f.url, toSample(p, f));
      return next;
    });
  };

  const selectAllInPack = (p: Pack) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const f of p.files) {
        if (next.size >= MAX_BATTLE_SAMPLES) break;
        next.set(f.url, toSample(p, f));
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setBusy(true);
    try {
      const id = await createBattle(user, { title, prompt, durationMin: minutes, samples: [...selected.values()] });
      router.push(`/challenges/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create challenge.');
      setBusy(false);
    }
  };

  const field = 'w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500';

  if (user === undefined) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-3xl mx-auto text-gray-400">Loading...</p></main>;
  }
  if (!user) {
    return (
      <main className="flex-1 py-12 px-6">
        <p className="max-w-3xl mx-auto text-gray-400">
          <Link href="/login" className="text-brand-500 underline">Log in</Link> to create a challenge.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 py-12 px-6">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/challenges" className="text-brand-500 hover:text-brand-400 text-sm">← All challenges</Link>
          <h1 className="text-4xl font-bold text-white mt-2">Create a challenge</h1>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_BATTLE_TITLE_LENGTH} placeholder="Challenge title" required className={field} />
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={MAX_BATTLE_PROMPT_LENGTH} rows={3} placeholder="Prompt or rules (optional)" className={field} />

        <label className="block text-sm text-gray-400">
          Timer length (minutes) — starts when you start the battle
          <input type="number" min={1} max={MAX_BATTLE_MINUTES} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} required className={`${field} mt-1 max-w-40`} />
        </label>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xl font-bold text-white">Samples</h2>
            <span className="text-sm text-gray-400">{selected.size} / {MAX_BATTLE_SAMPLES} selected</span>
          </div>
          {packs === null ? (
            <p className="text-gray-500">Loading packs...</p>
          ) : (
            <select value={packId} onChange={(e) => setPackId(e.target.value)} className={field}>
              <option value="">Choose a pack to pick samples from…</option>
              {packs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.files.length})</option>)}
            </select>
          )}

          {pack && (
            <div className="mt-4">
              <button type="button" onClick={() => selectAllInPack(pack)} className="text-sm text-brand-400 hover:text-brand-300 mb-2">
                Select all in this pack
              </button>
              <ul className="max-h-80 overflow-y-auto space-y-1">
                {pack.files.map((f) => (
                  <li key={f.url} className="flex items-center gap-3 rounded-lg bg-gray-800 px-3 py-2">
                    <input type="checkbox" checked={selected.has(f.url)} onChange={() => toggle(pack, f)} className="accent-brand-500" />
                    <span className="flex-1 min-w-0 truncate text-sm text-white">{f.name}</span>
                    <audio controls preload="none" src={f.url} className="h-8 w-40 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.size > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {[...selected.values()].map((s) => (
                <li key={s.url} className="flex items-center gap-2 rounded-full bg-brand-500/20 px-3 py-1 text-xs text-brand-200">
                  <span className="max-w-40 truncate">{s.name}</span>
                  <button type="button" aria-label={`Remove ${s.name}`} onClick={() => setSelected((prev) => { const n = new Map(prev); n.delete(s.url); return n; })}>×</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-lg">
          {busy ? 'Creating…' : 'Create lobby'}
        </button>
      </form>
    </main>
  );
}
