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
        <SampleFilters filters={filters} onChange={setFilters} />
        {samples.length === 0 ? (
          <div className="text-center text-gray-400">No samples uploaded yet.</div>
        ) : (
          <div className="space-y-2">
            {filterSamples(samples, filters).map((sample, index) => (
              <div 
                key={`${sample.packId}-${index}`} 
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
                  onClick={() => handlePlaySample(`${sample.packId}-${index}`)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    playingId === `${sample.packId}-${index}`
                      ? 'bg-brand-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                  title={playingId === `${sample.packId}-${index}` ? 'Stop' : 'Play'}
                  style={{ marginRight: 8 }}
                >
                  {playingId === `${sample.packId}-${index}` ? '⏸' : '▶'}
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
                  isPlaying={playingId === `${sample.packId}-${index}`}
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