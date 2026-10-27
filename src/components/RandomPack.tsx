"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { db } from "@/lib/firebase";
import Reveal from "@/components/Reveal";

interface RandomPackData {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  uploaderName?: string;
  files: { name: string }[];
  likes?: string[];
}

export default function RandomPack() {
  const [packs, setPacks] = useState<RandomPackData[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [spins, setSpins] = useState(0);

  useEffect(() => {
    getDocs(collection(db, "samplePacks"))
      .then((snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RandomPackData[];
        setPacks(all);
        if (all.length > 0) setCurrentId(all[Math.floor(Math.random() * all.length)].id);
      })
      .catch((e) => console.error("Error fetching packs for shuffle", e))
      .finally(() => setLoading(false));
  }, []);

  const shuffle = useCallback(() => {
    if (packs.length === 0) return;
    const pool = packs.length > 1 ? packs.filter((p) => p.id !== currentId) : packs;
    setCurrentId(pool[Math.floor(Math.random() * pool.length)].id);
    setSpins((n) => n + 1);
  }, [packs, currentId]);

  const pack = packs.find((p) => p.id === currentId);

  return (
    <section className="px-6 pb-28">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-400">Discover</p>
          <h2 className="text-4xl font-bold md:text-5xl">Feeling lucky?</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-400">A random pack from everything on Co-Drop. Don&apos;t like it? Shuffle again.</p>
        </Reveal>

        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : !pack ? (
          <div className="text-center text-gray-400">No packs to shuffle yet.</div>
        ) : (
          <div className="glass relative overflow-hidden rounded-3xl border border-brand-500/20 p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col items-center gap-6 md:flex-row md:gap-8"
              >
                <Link
                  href={`/packs/${pack.id}`}
                  className="relative flex aspect-square w-full max-w-[16rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900"
                >
                  {pack.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pack.coverImage} alt={pack.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-4 text-center text-lg font-bold text-white">{pack.name}</span>
                  )}
                </Link>
                <div className="min-w-0 flex-1 text-center md:text-left">
                  <h3 className="truncate text-3xl font-bold text-white">{pack.name}</h3>
                  {pack.uploaderName && <p className="mt-1 text-sm text-gray-400">by {pack.uploaderName}</p>}
                  <p className="mt-3 line-clamp-3 text-gray-300">{pack.description || "No description."}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                    <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">
                      {pack.files.length} {pack.files.length === 1 ? "Sample" : "Samples"}
                    </span>
                    <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">
                      {pack.likes?.length || 0} {pack.likes?.length === 1 ? "Like" : "Likes"}
                    </span>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                    <Link
                      href={`/packs/${pack.id}`}
                      className="rounded-full bg-brand-400 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-300"
                    >
                      Open pack
                    </Link>
                    <button
                      type="button"
                      onClick={shuffle}
                      disabled={packs.length < 2}
                      className="group inline-flex items-center gap-2 rounded-full border border-brand-500/50 px-6 py-2.5 text-sm font-semibold text-brand-300 transition-colors hover:bg-brand-500/10 disabled:opacity-40"
                    >
                      <motion.svg
                        animate={{ rotate: spins * 360 }}
                        transition={{ duration: 0.5 }}
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                      </motion.svg>
                      Shuffle
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
