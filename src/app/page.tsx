"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import Reveal from "@/components/Reveal";
import RandomPack from "@/components/RandomPack";
import SpotlightCard from "@/components/SpotlightCard";

interface SampleFile {
  name: string;
  url: string;
  genre?: string;
  type?: string;
  key?: string;
  bpm?: string;
  emotions?: string[];
}

interface SamplePack {
  id: string;
  name: string;
  description?: string;
  files: SampleFile[];
  coverImage?: string;
  uploaderName: string;
  likes?: string[];
}

export default function Home() {
  const [featuredPacks, setFeaturedPacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Get the 3 most liked packs as featured
        const q = query(collection(db, "samplePacks"), orderBy("likes", "desc"), limit(3));
        const snap = await getDocs(q);
        const packs: SamplePack[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as SamplePack[];
        setFeaturedPacks(packs);
      } catch (e) {
        console.error("Error fetching featured packs", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden px-6 pb-28 pt-24 md:pt-36">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-200"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            Now with speed, pitch and compression right in the player
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl font-bold leading-[1.02] sm:text-7xl md:text-8xl"
          >
            Drop sounds.
            <br />
            <span className="text-gradient">Build songs together.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-8 max-w-2xl text-lg text-gray-300 md:text-xl"
          >
            Co-Drop is where producers share drum hits, loops and one-shots, reshape them on the fly,
            and show off the songs they make with each other&apos;s samples.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/browse"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-400 px-8 py-4 text-base font-semibold text-black shadow-xl shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-300 hover:shadow-brand-400/40"
            >
              Browse samples
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-full border border-gray-600 bg-gray-900/50 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-300"
            >
              Upload your pack
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Genre marquee */}
      <section aria-hidden className="relative border-y border-gray-800/80 bg-black/30 py-5 backdrop-blur-sm [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.25em] text-gray-500">
          {[0, 1].map((n) => (
            <div key={n} className="flex gap-12">
              {["Hip-Hop", "Lo-Fi", "Trap", "House", "Drill", "Ambient", "Afrobeats", "Synthwave", "Drum & Bass", "R&B", "Experimental", "Jersey Club"].map((g) => (
                <span key={g} className="flex items-center gap-12">{g}<span className="text-brand-500">&#9679;</span></span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-400">Why Co-Drop</p>
            <h2 className="text-4xl font-bold md:text-5xl">Everything between a sample and a finished song</h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: "Reshape every sample", text: "Change speed and pitch independently, add compression, and download with the new key and BPM already in the filename.", icon: "M4 12h3l3-8 4 16 3-8h3" },
              { title: "Songs made with samples", text: "Every pack has its own songs page. Post what you made, see what others built, and talk about it in the comments.", icon: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
              { title: "A real profile", text: "Add a photo, bio and links, and get a page that shows your packs, so people know whose sounds they're using.", icon: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 0.1}>
                <SpotlightCard className="h-full p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 ring-1 ring-brand-400/30">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                  </div>
                  <h3 className="mb-3 text-xl font-semibold">{f.title}</h3>
                  <p className="leading-relaxed text-gray-400">{f.text}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured packs */}
      <section className="px-6 pb-28">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-400">Featured</p>
              <h2 className="text-4xl font-bold md:text-5xl">Packs the community loves</h2>
            </div>
            <Link href="/packs" className="group text-sm font-semibold text-brand-300 hover:text-brand-200">
              View all packs <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
          </Reveal>
          {loading ? (
            <div className="text-center text-gray-400">Loading featured packs...</div>
          ) : featuredPacks.length === 0 ? (
            <div className="text-center text-gray-400">No featured packs yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featuredPacks.map((pack, i) => (
                <Reveal key={pack.id} delay={i * 0.1}>
                  <SpotlightCard className="flex h-full flex-col p-5">
                    <Link href={`/packs/${pack.id}`} className="relative mb-5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-brand-900">
                      {pack.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pack.coverImage} alt={pack.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <span className="relative z-10 px-4 text-center text-lg font-bold text-white">{pack.name}</span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </Link>
                    <h3 className="mb-2 truncate text-xl font-semibold text-white">{pack.name}</h3>
                    <p className="mb-4 line-clamp-2 min-h-[2.5em] text-sm text-gray-400">{pack.description || "No description."}</p>
                    <div className="mb-5 flex items-center gap-2">
                      <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">
                        {pack.files.length} {pack.files.length === 1 ? "Sample" : "Samples"}
                      </span>
                      <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">
                        {pack.likes?.length || 0} {pack.likes?.length === 1 ? "Like" : "Likes"}
                      </span>
                    </div>
                    <Link href={`/packs/${pack.id}`} className="mt-auto rounded-full bg-brand-400 px-4 py-2.5 text-center text-sm font-semibold text-black transition-colors hover:bg-brand-300">
                      Preview &amp; Download
                    </Link>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Weekly challenge */}
      <section className="px-6 pb-20">
        <Reveal>
          <Link
            href="/challenge"
            className="group mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 rounded-3xl border border-brand-500/30 bg-gray-900/70 p-8 transition-colors hover:border-brand-400 md:flex-row md:items-center md:p-10"
          >
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-400">Weekly Challenge</p>
              <h2 className="text-3xl font-bold text-white">New packs. New prompt. Every week.</h2>
              <p className="mt-2 text-gray-400">Make a track with this week&apos;s featured packs and submit it before the timer runs out.</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-400 px-6 py-3 font-semibold text-black transition-colors group-hover:bg-brand-300">
              Join the challenge →
            </span>
          </Link>
        </Reveal>
      </section>

      <RandomPack />

      {/* Call to action */}
      <section className="px-6 pb-28">
        <Reveal>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-900/70 via-gray-900/80 to-gray-950/90 px-8 py-20 text-center backdrop-blur">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl" />
            <h2 className="relative text-4xl font-bold md:text-5xl">Ready to make some noise?</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-gray-300">
              Create your free account and start sharing your sounds with producers worldwide.
            </p>
            <Link
              href="/signup"
              className="relative mt-8 inline-block rounded-full bg-brand-400 px-8 py-4 text-base font-semibold text-black shadow-xl shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-300"
            >
              Create your account
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
