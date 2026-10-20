'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import SampleFxControls from '@/components/SampleFxControls';
import Comments from '@/components/Comments';
import { subscribeToSongs } from '@/lib/songs';
import SampleFilters, { DEFAULT_FILTERS, filterSamples, type Filters } from '@/components/SampleFilters';

interface Sample {
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
  description: string;
  files: SampleFile[];
  coverImage?: string;
  uploaderName: string;
  uploaderUid: string;
  createdAt: Date;
  likes: string[];
}

export default function PackDetail() {
  const params = useParams();
  const router = useRouter();
  const packId = params.id as string;
  const [pack, setPack] = useState<SamplePack | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [songCount, setSongCount] = useState<number | null>(null);

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!packId) return;
    return subscribeToSongs(
      packId,
      (songs) => setSongCount(songs.length),
      () => setSongCount(null)
    );
  }, [packId]);

  // Fetch pack data
  useEffect(() => {
    if (!packId) return;

    const unsubscribe = onSnapshot(doc(db, 'samplePacks', packId), (packSnap) => {
      if (packSnap.exists()) {
        const packData = {
          id: packSnap.id,
          ...packSnap.data(),
          createdAt: packSnap.data().createdAt.toDate(),
        } as SamplePack;
        setPack(packData);

        // Extract samples from the pack
        const extractedSamples = packData.files.map(file => ({
          fileName: file.name,
          fileUrl: file.url,
          genre: file.genre,
          type: file.type,
          key: file.key,
          bpm: file.bpm,
          emotions: file.emotions,
        }));
        setSamples(extractedSamples);

        // Check if current user has liked this pack
        if (currentUserId && packData.likes?.includes(currentUserId)) {
          setIsLiked(true);
        } else {
          setIsLiked(false);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [packId, currentUserId]);

  const handleToggleLike = async () => {
    if (!currentUserId || !pack) return;

    try {
      const packRef = doc(db, 'samplePacks', packId);
      const updatedLikes = isLiked 
        ? pack.likes.filter(id => id !== currentUserId)
        : [...(pack.likes || []), currentUserId];

      await updateDoc(packRef, { likes: updatedLikes });
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    if (!pack || currentUserId !== pack.uploaderUid) return;

    if (!confirm('Are you sure you want to delete this pack? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'samplePacks', packId));
      router.push('/packs');
    } catch (error) {
      console.error('Error deleting pack:', error);
      setIsDeleting(false);
    }
  };

  const handlePlaySample = (fileUrl: string, sampleIndex: number) => {
    const sampleId = `${packId}-${sampleIndex}`;
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
          <Link href="/packs" className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
            ← Back to Packs
          </Link>
          <div className="text-center text-gray-400">Loading pack...</div>
        </div>
      </main>
    );
  }

  if (!pack) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/packs" className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
            ← Back to Packs
          </Link>
          <div className="text-center text-gray-400">Pack not found.</div>
        </div>
      </main>
    );
  }

  const isCreator = currentUserId === pack.uploaderUid;

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/packs" className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
          ← Back to Packs
        </Link>

        {/* Pack Header */}
        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden mb-8 flex flex-col md:flex-row">
          {/* Cover Image */}
          <div className="flex-shrink-0 w-full md:w-80 h-80 bg-gradient-to-br from-brand-600 to-brand-800">
            {pack.coverImage ? (
              <img 
                src={pack.coverImage} 
                alt={pack.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800">
                <span className="text-white text-center px-4 font-semibold text-2xl">{pack.name}</span>
              </div>
            )}
          </div>

          {/* Pack Info */}
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div>
              <h1 className="text-5xl font-bold text-white mb-4">{pack.name}</h1>
              <p className="text-brand-500 font-semibold mb-6">by <Link href={'/users/' + pack.uploaderUid} className="hover:underline">{pack.uploaderName}</Link></p>
              <p className="text-gray-300 text-lg leading-relaxed mb-4">{pack.description}</p>
              <div className="flex gap-4 text-sm text-gray-400">
                <span className="bg-gray-800 px-3 py-1 rounded-lg font-semibold text-brand-500">
                  {pack.files.length} {pack.files.length === 1 ? 'Sample' : 'Samples'}
                </span>
                <span className="bg-gray-800 px-3 py-1 rounded-lg font-semibold text-brand-500">
                  {pack.likes?.length || 0} {pack.likes?.length === 1 ? 'Like' : 'Likes'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap mt-6">
              <Link href={`/packs/${packId}/songs`}>
                <button className="px-6 py-3 rounded-lg font-semibold bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors">
                  🎵 Songs made with this pack{songCount !== null ? ` (${songCount})` : ''}
                </button>
              </Link>
              {currentUserId && !isCreator && (
                <button
                  onClick={handleToggleLike}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    isLiked 
                      ? 'bg-brand-500 hover:bg-brand-600 text-black' 
                      : 'border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-black'
                  }`}
                >
                  {isLiked ? '❤ Liked' : '♡ Like'}
                </button>
              )}

              {isCreator && (
                <>
                  <Link href={`/packs/${packId}/edit`}>
                    <button className="px-6 py-3 rounded-lg font-semibold border border-gray-600 text-white hover:border-brand-400 hover:text-brand-300 transition-colors">
                      Edit Pack
                    </button>
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-6 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Pack'}
                  </button>
                </>
              )}


            </div>
          </div>
        </div>

        {/* Samples Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Samples</h2>
          <SampleFilters filters={filters} onChange={setFilters} />
          {samples.length === 0 ? (
            <div className="text-center text-gray-400">No samples in this pack.</div>
          ) : (
            <div className="space-y-2">
              {filterSamples(samples, filters).map((sample, index) => (
                <div 
                  key={index} 
                  className="bg-gray-900/50 rounded-xl border border-gray-800 hover:border-brand-500 hover:bg-gray-900 transition-all flex flex-wrap items-center gap-4 p-4 group"
                >
                  {/* Pack Cover Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                    {pack.coverImage ? (
                      <img 
                        src={pack.coverImage} 
                        alt={pack.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
                        <span className="text-xs text-white font-bold">♪</span>
                      </div>
                    )}
                  </div>

                  {/* Play Button */}
                  <button
                    onClick={() => handlePlaySample(sample.fileUrl, index)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      playingId === `${packId}-${index}`
                        ? 'bg-brand-500 text-black'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                    title={playingId === `${packId}-${index}` ? 'Stop' : 'Play'}
                    style={{ marginRight: 8 }}
                  >
                    {playingId === `${packId}-${index}` ? '⏸' : '▶'}
                  </button>

                  {/* Sample Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate group-hover:text-brand-400 transition-colors">{sample.fileName}</h3>
                    <p className="text-xs text-gray-400 mb-2">
                      from {pack.name}
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

                  <SampleFxControls
                    fileUrl={sample.fileUrl}
                    fileName={sample.fileName}
                    sampleKey={sample.key}
                    bpm={sample.bpm}
                    isPlaying={playingId === `${packId}-${index}`}
                    onFinish={() => setPlayingId(null)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <Comments packId={packId} />
      </div>
    </main>
  );
}
