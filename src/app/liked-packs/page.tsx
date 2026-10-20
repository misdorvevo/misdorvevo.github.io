'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface SamplePack {
  id: string;
  name: string;
  description: string;
  files: { name: string; url: string }[];
  coverImage?: string;
  uploaderName: string;
  createdAt: Date;
  likes: string[];
}

export default function LikedPacks() {
  const router = useRouter();
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.uid);
    });
    return unsubscribe;
  }, [router]);

  // Fetch all packs and filter by likes
  useEffect(() => {
    if (!currentUserId) return;

    const fetchLikedPacks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'samplePacks'));
        const likedPacksData = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
          } as SamplePack))
          .filter(pack => pack.likes?.includes(currentUserId));

        setPacks(likedPacksData);
      } catch (error) {
        console.error('Error fetching liked packs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedPacks();
  }, [currentUserId]);

  if (!currentUserId) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-white">My Liked Packs</h1>
          <div className="text-center text-gray-400">Loading packs...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-white">My Liked Packs</h1>
        <p className="text-gray-400 mb-12">{packs.length} {packs.length === 1 ? 'pack' : 'packs'} liked</p>

        {packs.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="mb-4">You haven't liked any packs yet.</p>
            <Link href="/packs" className="text-brand-500 hover:text-brand-400 underline">
              Browse packs to find ones you like
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packs.map((pack) => (
              <Link key={pack.id} href={`/packs/${pack.id}`}>
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-brand-500 transition-all overflow-hidden group cursor-pointer h-full flex flex-col">
                  <div className="w-full h-48 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl mb-4 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-brand-500/30 transition-shadow overflow-hidden">
                    {pack.coverImage ? (
                      <img 
                        src={pack.coverImage} 
                        alt={pack.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-lg font-semibold text-center px-4">{pack.name}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-brand-400 transition-colors">{pack.name}</h3>
                  <p className="text-gray-400 mb-2 text-sm">by {pack.uploaderName}</p>
                  <p className="text-gray-500 mb-4 text-sm line-clamp-2 flex-1">{pack.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-500 font-semibold text-sm">{pack.files.length} files</span>
                    <span className="text-brand-500 font-semibold text-sm">❤ {pack.likes?.length || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
