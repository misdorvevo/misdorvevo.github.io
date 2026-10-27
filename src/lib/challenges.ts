import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, storage } from '@/lib/firebase';
import { getDisplayName } from '@/lib/social';
import { MAX_SONG_DESCRIPTION_LENGTH, MAX_SONG_TITLE_LENGTH, validateSongFile } from '@/lib/songs';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// 1970-01-01 was a Thursday, so shifting by 3 days makes weeks start on Monday 00:00 UTC.
// firestore.rules uses the same formula to only accept submissions during the current week.
const MONDAY_OFFSET_MS = 3 * 24 * 60 * 60 * 1000;

// Keep in sync with isModerator() in firestore.rules. "WIL"'s account.
export const MODERATOR_UIDS = ['IrMD02tuYubDSXSrdFXJg7TWxwX2'];
export const isModerator = (uid?: string | null) => !!uid && MODERATOR_UIDS.includes(uid);

export const MAX_CHALLENGE_TITLE_LENGTH = 80;
export const MAX_CHALLENGE_PROMPT_LENGTH = 300;
export const ARCHIVE_WEEKS = 12;

export function weekIndexAt(date: Date): number {
  return Math.floor((date.getTime() + MONDAY_OFFSET_MS) / WEEK_MS);
}

export function weekStart(index: number): Date {
  return new Date(index * WEEK_MS - MONDAY_OFFSET_MS);
}

export function weekEnd(index: number): Date {
  return weekStart(index + 1);
}

export const PROMPTS = [
  'Make a track using only one drum kit and no melodic samples.',
  'Build a beat around a sound you would never normally use.',
  'Flip a loop: chop it, pitch it, reverse it, and make it unrecognizable.',
  'Create a late-night, lo-fi track under 90 BPM.',
  'Write a high-energy track that builds for 30 seconds before the drop.',
  'Make a beat that tells a story with no vocals.',
  'Use a maximum of five sounds. Make every one count.',
  'Create a track that would fit a retro video game boss fight.',
  'Make a groove with swing: nothing on the grid.',
  'Layer three different samples into one new instrument.',
  'Make a summer anthem, whatever the season.',
  'Write a track that starts quiet and ends in chaos.',
  'Make a beat using only percussion and bass.',
  'Create an ambient soundscape built from short one-shots.',
  'Make a track at exactly 140 BPM with a half-time feel.',
  'Remix the mood: make something sad sound uplifting.',
];

export function promptFor(index: number): string {
  return PROMPTS[((index % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Random but stable for a given week and pack pool, so every visitor sees the same pack.
export function pickRandomPack<T extends { id: string }>(packs: T[], index: number): T | null {
  let best: T | null = null;
  for (const p of packs) {
    if (!best || hash(`${index}:${p.id}`) < hash(`${index}:${best.id}`)) best = p;
  }
  return best;
}

// Moderator overrides live at challenges/{weekIndex}; anything unset falls back to the defaults.
export interface ChallengeConfig {
  title: string;
  prompt: string;
  packId: string;
  winnerId: string;
}

export const EMPTY_CONFIG: ChallengeConfig = { title: '', prompt: '', packId: '', winnerId: '' };

const challengeDoc = (weekIndex: number) => doc(db, 'challenges', String(weekIndex));

// One-shot read: a live listener on a document the rules reject trips a Firestore SDK assertion.
export async function getChallenge(weekIndex: number): Promise<ChallengeConfig> {
  try {
    const d = (await getDoc(challengeDoc(weekIndex))).data() ?? {};
    return { title: d.title ?? '', prompt: d.prompt ?? '', packId: d.packId ?? '', winnerId: d.winnerId ?? '' };
  } catch {
    return EMPTY_CONFIG;
  }
}

export async function saveChallenge(weekIndex: number, config: ChallengeConfig) {
  await setDoc(challengeDoc(weekIndex), {
    title: config.title.trim().slice(0, MAX_CHALLENGE_TITLE_LENGTH),
    prompt: config.prompt.trim().slice(0, MAX_CHALLENGE_PROMPT_LENGTH),
    packId: config.packId,
    winnerId: config.winnerId,
    updatedAt: serverTimestamp(),
  });
}

export interface Submission {
  id: string;
  weekIndex: number;
  title: string;
  description: string;
  audioUrl: string;
  storagePath: string;
  packId: string;
  packName: string;
  authorUid: string;
  authorName: string;
  createdAt: Date | null;
}

// Submissions live at challenges/{weekIndex}/submissions/{id}; audio is under songs/{uid}/ in Storage.
const submissionsCol = (weekIndex: number) => collection(db, 'challenges', String(weekIndex), 'submissions');

export function subscribeToSubmissions(
  weekIndex: number,
  onChange: (submissions: Submission[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(submissionsCol(weekIndex), orderBy('createdAt', 'desc')),
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            weekIndex,
            title: data.title,
            description: data.description ?? '',
            audioUrl: data.audioUrl,
            storagePath: data.storagePath,
            packId: data.packId,
            packName: data.packName ?? '',
            authorUid: data.authorUid,
            authorName: data.authorName,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : null,
          };
        })
      ),
    onError
  );
}

export async function submitEntry(
  weekIndex: number,
  user: User,
  input: { title: string; description: string; file: File; packId: string; packName: string },
  onProgress?: (fraction: number) => void
): Promise<void> {
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
  if (!input.packId) throw new Error('Choose which featured pack you used.');

  const storagePath = `songs/${user.uid}/${Date.now()}_${input.file.name.replace(/[^\w.-]+/g, '_')}`;
  const fileRef = ref(storage, storagePath);
  const task = uploadBytesResumable(fileRef, input.file, { contentType: input.file.type });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', (s) => onProgress?.(s.bytesTransferred / s.totalBytes), reject, () => resolve());
  });
  const audioUrl = await getDownloadURL(fileRef);

  try {
    await addDoc(submissionsCol(weekIndex), {
      title,
      description,
      audioUrl,
      storagePath,
      packId: input.packId,
      packName: input.packName.slice(0, 100),
      authorUid: user.uid,
      authorName: getDisplayName(user),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteObject(fileRef).catch(() => {});
    throw error;
  }
}

export async function deleteSubmission(submission: Submission) {
  await deleteDoc(doc(submissionsCol(submission.weekIndex), submission.id));
  await deleteObject(ref(storage, submission.storagePath)).catch(() => {});
}

export async function getSubmissionCount(weekIndex: number): Promise<number> {
  return (await getDocs(submissionsCol(weekIndex))).size;
}
