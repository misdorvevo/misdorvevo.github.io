'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface SamplePack {
  id: string;
  name: string;
  description: string;
  files: { name: string; url: string }[];
  coverImage?: string;
  uploaderName: string;
  uploaderUid: string;
  createdAt: Date;
  likes: string[];
}

export default function Packs() {
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'samplePacks'));
        const packsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        })) as SamplePack[];
        setPacks(packsData);
      } catch (error) {
        console.error('Error fetching packs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  if (loading) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-white">Sample Packs</h1>
          <div className="text-center text-gray-400">Loading packs...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-12 text-white">Sample Packs</h1>
        {packs.length === 0 ? (
          <div className="text-center text-gray-400">No sample packs uploaded yet.</div>
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
                    <span className="bg-brand-500 group-hover:bg-brand-600 text-black px-4 py-2 rounded-lg transition-colors font-semibold text-sm">
                      View Pack
                    </span>
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