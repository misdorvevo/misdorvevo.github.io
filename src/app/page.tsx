"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

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
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-black via-gray-950 to-gray-900 py-32 px-6 overflow-hidden">
        {/* Atmospheric effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-400 rounded-full blur-3xl opacity-10"></div>
        </div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-7xl md:text-8xl font-bold mb-6 text-white drop-shadow-lg">
            AudioCave
          </h1>
          <p className="text-xl md:text-2xl text-orange-200 mb-4 max-w-3xl mx-auto font-light">
            Professional Audio Sample Library
          </p>
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
            Discover, share, and download premium drum hits, loops, samples, and one-shots. 
            Connect with producers worldwide and build your sonic palette.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/browse" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:shadow-lg hover:shadow-orange-500/50">
              Browse Samples
            </a>
            <a href="/upload" className="bg-gray-800 hover:bg-gray-700 text-orange-400 font-bold px-8 py-4 rounded-full text-lg transition-colors border-2 border-orange-500">
              Upload Your Samples
            </a>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Featured Sample Packs</h2>
            <div className="h-1 w-24 bg-gradient-to-r from-orange-500 to-orange-300 mx-auto"></div>
            <p className="text-gray-400 mt-4">Explore curated collections from our community</p>
          </div>
          {loading ? (
            <div className="text-center text-gray-400">Loading featured packs...</div>
          ) : featuredPacks.length === 0 ? (
            <div className="text-center text-gray-400">No featured packs yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredPacks.map((pack) => (
                <div key={pack.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-orange-500 transition-all hover:shadow-xl hover:shadow-orange-500/20 group flex flex-col">
                  <Link href={`/packs/${pack.id}`} className="w-full h-48 rounded-xl mb-4 overflow-hidden flex items-center justify-center group-hover:shadow-lg group-hover:shadow-orange-500/40 transition-shadow relative bg-gradient-to-br from-orange-600 to-orange-800">
                    {pack.coverImage ? (
                      <img src={pack.coverImage} alt={pack.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-lg font-bold text-center px-4 relative z-10">{pack.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-black to-transparent"></div>
                  </Link>
                  <h3 className="text-xl font-bold mb-2 text-white truncate">{pack.name}</h3>
                  <p className="text-gray-400 mb-4 text-sm line-clamp-2 min-h-[2.5em]">{pack.description || "No description."}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-gray-800 text-orange-400 px-3 py-1 rounded-lg text-xs font-semibold">
                      {pack.files.length} {pack.files.length === 1 ? "Sample" : "Samples"}
                    </span>
                    <span className="bg-gray-800 text-orange-400 px-3 py-1 rounded-lg text-xs font-semibold">
                      {pack.likes?.length || 0} {pack.likes?.length === 1 ? "Like" : "Likes"}
                    </span>
                  </div>
                  <Link href={`/packs/${pack.id}`} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg transition-colors text-center">
                    Preview & Download
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative py-24 px-6 bg-gradient-to-r from-gray-950 via-black to-gray-950 overflow-hidden">
        {/* Atmospheric glow */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl font-bold mb-4 text-white">Join the Community</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Create your account today and start sharing your sounds with producers worldwide.
          </p>
          <a href="/signup" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:shadow-lg hover:shadow-orange-500/50">
            Sign Up Now
          </a>
        </div>
      </section>
    </main>
  );
}
