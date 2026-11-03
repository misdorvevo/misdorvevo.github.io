'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { subscribeToBattles, type Battle } from '@/lib/battles';
import { timeAgo } from '@/lib/social';

const badge: Record<Battle['status'], string> = {
  lobby: 'bg-brand-500/20 text-brand-300',
  live: 'bg-red-500/20 text-red-300',
  ended: 'bg-gray-700 text-gray-300',
};
const label: Record<Battle['status'], string> = { lobby: 'In lobby', live: 'Live', ended: 'Ended' };

export default function ChallengesPage() {
  const [battles, setBattles] = useState<Battle[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => subscribeToBattles(setBattles, () => { setFailed(true); setBattles([]); }), []);
  // Re-render periodically so live battles flip to "ended" without a snapshot.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const order = { live: 0, lobby: 1, ended: 2 } as const;
  const sorted = battles && [...battles].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">Beat Battles</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white">Challenges</h1>
            <p className="text-gray-400 mt-2">Join a lobby, or create your own challenge with samples you choose.</p>
          </div>
          <Link href="/challenges/new" className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-lg">
            Create challenge
          </Link>
        </div>

        {failed ? (
          <p className="text-red-400">Couldn&apos;t load challenges. If this is a new setup, make sure the latest Firestore rules are deployed.</p>
        ) : sorted === null ? (
          <p className="text-gray-500">Loading...</p>
        ) : sorted.length === 0 ? (
          <p className="text-gray-500">No challenges yet — create the first one!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map((b) => (
              <Link key={b.id} href={`/challenges/${b.id}`} className="card-lift bg-gray-900 border border-gray-800 hover:border-brand-500 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-white text-lg break-words min-w-0">{b.title}</p>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge[b.status]}`}>{label[b.status]}</span>
                </div>
                {b.prompt && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{b.prompt}</p>}
                <p className="text-sm text-gray-500 mt-3">
                  by {b.creatorName} • {b.samples.length} samples • {b.durationMin} min • {timeAgo(b.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
