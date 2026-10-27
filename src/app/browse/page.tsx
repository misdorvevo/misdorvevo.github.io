'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import SampleFxControls from '@/components/SampleFxControls';
import SampleFilters, { DEFAULT_FILTERS, filterSamples, type Filters } from '@/components/SampleFilters';

interface Sample {
  packId: string;
  packName: string;
  packCoverImage?: string;
  uploaderName: string;
  fileName: string;
  fileUrl: string;
  genre?: string;
  type?: string;
  key?: string;
  bpm?: string;
  emotions?: string[];
}

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
  files: SampleFile[];
  coverImage?: string;
  uploaderName: string;
}

export default function Browse() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'samplePacks'));
        const allSamples: Sample[] = [];

        querySnapshot.docs.forEach(doc => {
          const pack = doc.data() as SamplePack;
          
          // Flatten each sample in the pack
          pack.files.forEach(file => {
            allSamples.push({
              packId: doc.id,
              packName: pack.name,
              packCoverImage: pack.coverImage,
              uploaderName: pack.uploaderName,
              fileName: file.name,
              fileUrl: file.url,
              genre: file.genre,
              type: file.type,
              key: file.key,
              bpm: file.bpm,
              emotions: file.emotions,
            });
          });
        });

        setSamples(allSamples);
      } catch (error) {
        console.error('Error fetching packs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const handlePlaySample = (sampleId: string) => {
    if (playingId === sampleId) {
      setPlayingId(null);
    } else {
      setPlayingId(sampleId);
    }
  };

  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const visibleSamples = filterSamples(samples, filters).filter((sample) => {
    if (terms.length === 0) return true;
    const haystack = [
      sample.fileName, sample.packName, sample.uploaderName, sample.genre, sample.type, sample.key, sample.bpm,
      ...(sample.emotions || []),
    ].filter(Boolean).join(' ').toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });

  if (loading) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-white">Browse Samples</h1>
          <div className="text-center text-gray-400">Loading samples...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white">Browse Samples</h1>
        <div className="relative mb-4">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search samples by name, pack, creator, genre, key, mood..."
            aria-label="Search samples"
            className="w-full rounded-xl border border-gray-700 bg-gray-900/70 py-3 pl-12 pr-4 text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500"
          />
        </div>
        <SampleFilters filters={filters} onChange={setFilters} />
        {samples.length === 0 ? (
          <div className="text-center text-gray-400">No samples uploaded yet.</div>
        ) : visibleSamples.length === 0 ? (
          <div className="text-center text-gray-400">No samples match your search.</div>
        ) : (
          <div className="space-y-2">
            {visibleSamples.map((sample) => (
              <div 
                key={`${sample.packId}-${sample.fileUrl}`} 
                className="bg-gray-900/50 rounded-xl border border-gray-800 hover:border-brand-500 hover:bg-gray-900 transition-all flex flex-wrap items-center gap-4 p-4 group"
              >
                {/* Pack Cover Image - Small Square - Clickable */}
                <Link href={`/packs/${sample.packId}`} className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-brand-500/30 transition-shadow cursor-pointer">
                    {sample.packCoverImage ? (
                      <img 
                        src={sample.packCoverImage} 
                        alt={sample.packName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
                        <span className="text-xs text-white font-bold">♪</span>
                      </div>
                    )}
                  </div>
                </Link>


                {/* Play Button */}
                <button
                  onClick={() => handlePlaySample(`${sample.packId}-${sample.fileUrl}`)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    playingId === `${sample.packId}-${sample.fileUrl}`
                      ? 'bg-brand-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                  title={playingId === `${sample.packId}-${sample.fileUrl}` ? 'Stop' : 'Play'}
                  style={{ marginRight: 8 }}
                >
                  {playingId === `${sample.packId}-${sample.fileUrl}` ? '⏸' : '▶'}
                </button>

                {/* Sample Info + Waveform (single block) */}
                <div className="flex-1 min-w-0 flex items-center">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate group-hover:text-brand-400 transition-colors">{sample.fileName}</h3>
                    <p className="text-xs text-gray-400 mb-2">
                      {sample.packName} • by {sample.uploaderName}
                    </p>
                    {/* Metadata Tags */}
                    <div className="flex gap-2 flex-wrap items-center">
                      {sample.genre && (
                        <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded">
                          {sample.genre}
                        </span>
                      )}
                      {sample.type && (
                        <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                          {sample.type}
                        </span>
                      )}
                      {sample.key && (
                        <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded">
                          {sample.key}
                        </span>
                      )}
                      {sample.type === 'loop' && sample.bpm && (
                        <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded">
                          {sample.bpm} BPM
                        </span>
                      )}
                      {sample.emotions && sample.emotions.length > 0 && (
                        <span className="text-xs bg-brand-900 text-brand-200 px-2 py-1 rounded">
                          {sample.emotions.slice(0, 2).join(', ')}
                          {sample.emotions.length > 2 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <SampleFxControls
                  fileUrl={sample.fileUrl}
                  fileName={sample.fileName}
                  sampleKey={sample.key}
                  bpm={sample.bpm}
                  isPlaying={playingId === `${sample.packId}-${sample.fileUrl}`}
                  onFinish={() => setPlayingId(null)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}