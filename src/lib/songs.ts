import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, storage } from '@/lib/firebase';
import { getDisplayName } from '@/lib/social';

export const MAX_SONG_TITLE_LENGTH = 100;
export const MAX_SONG_DESCRIPTION_LENGTH = 1000;
export const MAX_SONG_SIZE_BYTES = 100 * 1024 * 1024;

// Songs live at samplePacks/{packId}/songs/{songId}; the audio is in Storage under songs/{uid}/.
export interface Song {
  id: string;
  packId: string;
  title: string;
  description: string;
  audioUrl: string;
  storagePath: string;
  authorUid: string;
  authorName: string;
  likes: string[];
  createdAt: Date | null;
}

const songsCol = (packId: string) => collection(db, 'samplePacks', packId, 'songs');

function toSong(packId: string, id: string, data: Record<string, unknown>): Song {
  return {
    id,
    packId,
    title: data.title as string,
    description: (data.description as string) ?? '',
    audioUrl: data.audioUrl as string,
    storagePath: data.storagePath as string,
    authorUid: data.authorUid as string,
    authorName: data.authorName as string,
    likes: (data.likes as string[]) ?? [],
    createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? null,
  };
}

export function subscribeToSongs(
  packId: string,
  onChange: (songs: Song[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(songsCol(packId), orderBy('createdAt', 'desc')),
    (snap) =>
      onChange(snap.docs.map((d) => toSong(packId, d.id, d.data({ serverTimestamps: 'estimate' })))),
    onError
  );
}

// Emits null when the song doesn't exist (e.g. it was deleted).
export function subscribeToSong(
  packId: string,
  songId: string,
  onChange: (song: Song | null) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    doc(songsCol(packId), songId),
    (snap) =>
      onChange(snap.exists() ? toSong(packId, snap.id, snap.data({ serverTimestamps: 'estimate' })) : null),
    onError
  );
}

export function validateSongFile(file: File): string | null {
  if (!file.type.startsWith('audio/')) return 'Please choose an audio file (mp3, wav, m4a, ...).';
  if (file.size > MAX_SONG_SIZE_BYTES) return 'Songs must be smaller than 100 MB.';
  return null;
}

export async function uploadSong(
  packId: string,
  user: User,
  input: { title: string; description: string; file: File },
  onProgress?: (fraction: number) => void
): Promise<string> {
  const title = input.title.trim();
  const description = input.description.trim();
  const fileError = validateSongFile(input.file);
  if (fileError) throw new Error(fileError);
  if (!title || title.length > MAX_SONG_TITLE_LENGTH) {
    throw new Error(`Titles must be between 1 and ${MAX_SONG_TITLE_LENGTH} characters.`);
  }
  if (description.length > MAX_SONG_DESCRIPTION_LENGTH) {
    throw new Error(`Descriptions can be at most ${MAX_SONG_DESCRIPTION_LENGTH} characters.`);
  }

  const storagePath = `songs/${user.uid}/${Date.now()}_${input.file.name.replace(/[^\w.-]+/g, '_')}`;
  const fileRef = ref(storage, storagePath);
  const task = uploadBytesResumable(fileRef, input.file, { contentType: input.file.type });
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => onProgress?.(s.bytesTransferred / s.totalBytes),
      reject,
      () => resolve()
    );
  });
  const audioUrl = await getDownloadURL(fileRef);

  try {
    const docRef = await addDoc(songsCol(packId), {
      title,
      description,
      audioUrl,
      storagePath,
      authorUid: user.uid,
      authorName: getDisplayName(user),
      likes: [],
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    // Don't leave an orphaned file behind if the post itself was rejected.
    await deleteObject(fileRef).catch(() => {});
    throw error;
  }
}

export async function setSongLiked(packId: string, songId: string, uid: string, liked: boolean) {
  await updateDoc(doc(songsCol(packId), songId), {
    likes: liked ? arrayUnion(uid) : arrayRemove(uid),
  });
}

// Removes the song's comments, its audio file and the song itself.
export async function deleteSong(song: Song) {
  const comments = await getDocs(collection(db, 'samplePacks', song.packId, 'songs', song.id, 'comments'));
  for (let i = 0; i < comments.docs.length; i += 400) {
    const batch = writeBatch(db);
    comments.docs.slice(i, i + 400).forEach((c) => batch.delete(c.ref));
    await batch.commit();
  }
  await deleteDoc(doc(songsCol(song.packId), song.id));
  await deleteObject(ref(storage, song.storagePath)).catch((error) => {
    console.error('Could not delete song audio file:', error);
  });
}
