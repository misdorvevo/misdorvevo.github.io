import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';

export const MAX_COMMENT_LENGTH = 1000;

// Comments live at samplePacks/{packId}/comments/{commentId}, or under a song at
// samplePacks/{packId}/songs/{songId}/comments/{commentId}.
// Threads are one level deep: a reply points at a top-level comment via parentId.
export interface CommentTarget {
  packId: string;
  songId?: string;
}

export function timeAgo(date: Date | null): string {
  if (!date) return 'just now';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const units: [number, string][] = [[86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return 'just now';
}

export interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  parentId: string | null;
  likes: string[];
  createdAt: Date | null;
}

const commentsCol = ({ packId, songId }: CommentTarget) =>
  songId
    ? collection(db, 'samplePacks', packId, 'songs', songId, 'comments')
    : collection(db, 'samplePacks', packId, 'comments');

export function getDisplayName(user: User): string {
  return user.displayName || user.email?.split('@')[0] || 'User';
}

export function subscribeToComments(
  target: CommentTarget,
  onChange: (comments: Comment[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(commentsCol(target), orderBy('createdAt', 'asc')),
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            authorUid: data.authorUid,
            authorName: data.authorName,
            text: data.text,
            parentId: data.parentId ?? null,
            likes: data.likes ?? [],
            createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? null,
          };
        })
      );
    },
    onError
  );
}

export async function addComment(
  target: CommentTarget,
  user: User,
  text: string,
  parentId: string | null = null
) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comments must be between 1 and ${MAX_COMMENT_LENGTH} characters.`);
  }
  await addDoc(commentsCol(target), {
    authorUid: user.uid,
    authorName: getDisplayName(user),
    text: trimmed,
    parentId,
    likes: [],
    createdAt: serverTimestamp(),
  });
}

// arrayUnion/arrayRemove are atomic, so concurrent likes don't overwrite each other.
export async function setCommentLiked(target: CommentTarget, commentId: string, uid: string, liked: boolean) {
  await updateDoc(doc(commentsCol(target), commentId), {
    likes: liked ? arrayUnion(uid) : arrayRemove(uid),
  });
}

// Deleting a top-level comment also removes its replies.
export async function deleteComment(target: CommentTarget, commentId: string) {
  const replies = await getDocs(query(commentsCol(target), where('parentId', '==', commentId)));
  const batch = writeBatch(db);
  replies.forEach((r) => batch.delete(r.ref));
  batch.delete(doc(commentsCol(target), commentId));
  await batch.commit();
}
