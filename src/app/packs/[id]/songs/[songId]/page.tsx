'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Comments from '@/components/Comments';
import { timeAgo } from '@/lib/social';
import { deleteSong, setSongLiked, subscribeToSong, type Song } from '@/lib/songs';

const Waveform = dynamic(() => import('@/components/Waveform'), { ssr: false });

export default function SongDetail() {
  const { id: packId, songId } = useParams<{ id: string; songId: string }>();
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    return subscribeToSong(
      packId,
      songId,
      (s) => {
        setSong(s);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading song:', error);
        setLoading(false);
      }
    );
  }, [packId, songId]);

  const backLink = (
    <Link href={`/packs/${packId}/songs`} className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
      ← Back to songs
    </Link>
  );

  if (loading || !song) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {backLink}
          <div className="text-center text-gray-400">{loading ? 'Loading song...' : 'Song not found.'}</div>
        </div>
      </main>
    );
  }

  const liked = !!user && song.likes.includes(user.uid);
  const isAuthor = user?.uid === song.authorUid;

  const handleLike = async () => {
    if (!user) return;
    try {
      await setSongLiked(packId, song.id, user.uid, !liked);
    } catch (error) {
      console.error('Error liking song:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this song and all of its comments? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteSong(song);
      router.push(`/packs/${packId}/songs`);
    } catch (error) {
      console.error('Error deleting song:', error);
      setDeleting(false);
    }
  };

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {backLink}

        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-8">
          <h1 className="text-4xl font-bold text-white mb-2">{song.title}</h1>
          <p className="text-brand-500 font-semibold mb-4">
            by <Link href={'/users/' + song.authorUid} className="hover:underline">{song.authorName}</Link> <span className="text-gray-500 font-normal">• {timeAgo(song.createdAt)}</span>
          </p>
          {song.description && <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">{song.description}</p>}

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setPlaying((p) => !p)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                playing ? 'bg-brand-500 text-black' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <div className="flex-1">
              <Waveform audioUrl={song.audioUrl} isPlaying={playing} onFinish={() => setPlaying(false)} />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={handleLike}
              disabled={!user}
              aria-pressed={liked}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-60 ${
                liked
                  ? 'bg-brand-500 hover:bg-brand-600 text-black'
                  : 'border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-black'
              }`}
            >
              {liked ? '❤ Liked' : '♡ Like'} · {song.likes.length}
            </button>
            {!user && (
              <span className="text-gray-400 text-sm">
                <Link href="/login" className="text-brand-500 underline">Log in</Link> to like this song.
              </span>
            )}
            {isAuthor && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Song'}
              </button>
            )}
          </div>
        </div>

        <Comments packId={packId} songId={songId} noun="song" />
      </div>
    </main>
  );
}
