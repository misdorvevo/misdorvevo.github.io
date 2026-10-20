'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { timeAgo } from '@/lib/social';
import {
  MAX_SONG_DESCRIPTION_LENGTH,
  MAX_SONG_TITLE_LENGTH,
  setSongLiked,
  subscribeToSongs,
  uploadSong,
  validateSongFile,
  type Song,
} from '@/lib/songs';

const Waveform = dynamic(() => import('@/components/Waveform'), { ssr: false });

function UploadSongForm({ packId, user }: { packId: string; user: User }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleFile = (selected: File | null) => {
    setFile(selected);
    setError(selected ? validateSongFile(selected) ?? '' : '');
    if (selected && !title) setTitle(selected.name.replace(/\.[^/.]+$/, '').slice(0, MAX_SONG_TITLE_LENGTH));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || progress !== null) return;
    setError('');
    setProgress(0);
    try {
      await uploadSong(packId, user, { title, description, file }, setProgress);
      setTitle('');
      setDescription('');
      setFile(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error('Error uploading song:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress !== null;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-10 space-y-4">
      <h2 className="text-xl font-bold text-white">Share a song you made with this pack</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={MAX_SONG_TITLE_LENGTH}
        placeholder="Song title"
        required
        className="w-full bg-gray-900 border border-gray-700 focus:border-brand-500 outline-none rounded-lg p-3 text-white placeholder-gray-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={MAX_SONG_DESCRIPTION_LENGTH}
        rows={2}
        placeholder="Tell people how you used the samples (optional)"
        className="w-full bg-gray-900 border border-gray-700 focus:border-brand-500 outline-none rounded-lg p-3 text-white placeholder-gray-500 resize-y"
      />
      <input
        type="file"
        accept="audio/*"
        required
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="block w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600"
      />
      {uploading && (
        <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={!file || !title.trim() || uploading || !!(file && validateSongFile(file))}
        className="px-6 py-3 rounded-lg font-semibold bg-brand-500 hover:bg-brand-600 text-black transition-colors disabled:opacity-50"
      >
        {uploading ? `Uploading ${Math.round((progress ?? 0) * 100)}%` : 'Post Song'}
      </button>
    </form>
  );
}

export default function PackSongs() {
  const { id: packId } = useParams<{ id: string }>();
  const [packName, setPackName] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    getDoc(doc(db, 'samplePacks', packId))
      .then((snap) => setPackName(snap.exists() ? snap.data().name : ''))
      .catch((error) => console.error('Error loading pack:', error));
  }, [packId]);

  useEffect(() => {
    return subscribeToSongs(
      packId,
      (items) => {
        setSongs(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading songs:', error);
        setLoadError(true);
        setLoading(false);
      }
    );
  }, [packId]);

  const handleLike = async (song: Song) => {
    if (!user) return;
    try {
      await setSongLiked(packId, song.id, user.uid, !song.likes.includes(user.uid));
    } catch (error) {
      console.error('Error liking song:', error);
    }
  };

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <Link href={`/packs/${packId}`} className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
          ← Back to {packName || 'Pack'}
        </Link>
        <h1 className="text-4xl font-bold text-white mb-2">Songs made with {packName || 'this pack'}</h1>
        <p className="text-gray-400 mb-8">Remixes and tracks built from this pack&apos;s samples.</p>

        {user ? (
          <UploadSongForm packId={packId} user={user} />
        ) : (
          <p className="text-gray-400 mb-10">
            <Link href="/login" className="text-brand-500 hover:text-brand-400 underline">Log in</Link> to share a song you made with this pack.
          </p>
        )}

        {loading ? (
          <div className="text-gray-400">Loading songs...</div>
        ) : loadError ? (
          <div className="text-red-400">Songs could not be loaded.</div>
        ) : songs.length === 0 ? (
          <div className="text-gray-400">No songs yet. Be the first to share one!</div>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => {
              const liked = !!user && song.likes.includes(user.uid);
              const playing = playingId === song.id;
              return (
                <div
                  key={song.id}
                  className="bg-gray-900/50 rounded-xl border border-gray-800 hover:border-brand-500 transition-all flex items-center gap-4 p-4"
                >
                  <button
                    onClick={() => setPlayingId(playing ? null : song.id)}
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      playing ? 'bg-brand-500 text-black' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                    title={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? '⏸' : '▶'}
                  </button>

                  <div className="flex-1 min-w-0">
                    <Link href={`/packs/${packId}/songs/${song.id}`} className="font-semibold text-white hover:text-brand-400 transition-colors truncate block">
                      {song.title}
                    </Link>
                    <p className="text-xs text-gray-400">
                      by <Link href={'/users/' + song.authorUid} className="hover:underline">{song.authorName}</Link> • {timeAgo(song.createdAt)}
                    </p>
                  </div>

                  <div className="w-48 flex-shrink-0 hidden sm:block">
                    <Waveform audioUrl={song.audioUrl} isPlaying={playing} onFinish={() => setPlayingId(null)} />
                  </div>

                  <button
                    onClick={() => handleLike(song)}
                    disabled={!user}
                    aria-pressed={liked}
                    className={`flex-shrink-0 text-sm transition-colors disabled:cursor-default ${
                      liked ? 'text-brand-500' : 'text-gray-400 hover:text-brand-400'
                    }`}
                  >
                    {liked ? '❤' : '♡'} {song.likes.length}
                  </button>
                  <Link
                    href={`/packs/${packId}/songs/${song.id}`}
                    className="flex-shrink-0 text-sm text-gray-400 hover:text-brand-400 transition-colors"
                  >
                    Comments
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
