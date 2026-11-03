import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, storage } from '@/lib/firebase';
import { getDisplayName } from '@/lib/social';
import { MAX_SONG_DESCRIPTION_LENGTH, MAX_SONG_TITLE_LENGTH, validateSongFile } from '@/lib/songs';

// Keep these limits in sync with the /battles rules in firestore.rules.
export const MAX_BATTLE_TITLE_LENGTH = 80;
export const MAX_BATTLE_PROMPT_LENGTH = 300;
export const MAX_BATTLE_SAMPLES = 40;
export const MIN_BATTLE_MINUTES = 1;
export const MAX_BATTLE_MINUTES = 180;

export interface BattleSample {
  name: string;
  url: string;
  packId: string;
  packName: string;
}

export type BattleStatus = 'lobby' | 'live' | 'ended';

export interface Battle {
  id: string;
  title: string;
  prompt: string;
  creatorUid: string;
  creatorName: string;
  samples: BattleSample[];
  durationMin: number;
  // Stored as 'lobby' | 'live'; 'ended' is derived once startedAt + durationMin has passed.
  status: BattleStatus;
  startedAt: Date | null;
  endsAt: Date | null;
  createdAt: Date | null;
}

export interface Participant {
  uid: string;
  name: string;
  joinedAt: Date | null;
}

export interface BattleSubmission {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  storagePath: string;
  authorUid: string;
  authorName: string;
  createdAt: Date | null;
}

const battleDoc = (id: string) => doc(db, 'battles', id);
const participantsCol = (id: string) => collection(db, 'battles', id, 'participants');
const submissionsCol = (id: string) => collection(db, 'battles', id, 'submissions');

const toDate = (t: unknown) => (t ? (t as Timestamp).toDate() : null);

export function battleStatus(stored: 'lobby' | 'live', endsAt: Date | null, now = Date.now()): BattleStatus {
  if (stored === 'live' && endsAt && now >= endsAt.getTime()) return 'ended';
  return stored;
}

function parseBattle(id: string, data: Record<string, unknown>): Battle {
  const startedAt = toDate(data.startedAt);
  const durationMin = Number(data.durationMin) || 0;
  const endsAt = startedAt ? new Date(startedAt.getTime() + durationMin * 60_000) : null;
  return {
    id,
    title: String(data.title ?? ''),
    prompt: String(data.prompt ?? ''),
    creatorUid: String(data.creatorUid ?? ''),
    creatorName: String(data.creatorName ?? ''),
    samples: (data.samples as BattleSample[]) ?? [],
    durationMin,
    status: battleStatus(data.status === 'live' ? 'live' : 'lobby', endsAt),
    startedAt,
    endsAt,
    createdAt: toDate(data.createdAt),
  };
}

export function subscribeToBattles(onChange: (battles: Battle[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(collection(db, 'battles'), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((d) => parseBattle(d.id, d.data({ serverTimestamps: 'estimate' })))),
    onError
  );
}

// onChange receives null when the battle doesn't exist.
export function subscribeToBattle(id: string, onChange: (battle: Battle | null) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    battleDoc(id),
    (snap) => onChange(snap.exists() ? parseBattle(snap.id, snap.data({ serverTimestamps: 'estimate' })) : null),
    onError
  );
}

export async function createBattle(
  user: User,
  input: { title: string; prompt: string; durationMin: number; samples: BattleSample[] }
): Promise<string> {
  const title = input.title.trim();
  const prompt = input.prompt.trim();
  if (!title || title.length > MAX_BATTLE_TITLE_LENGTH) {
    throw new Error(`Titles must be between 1 and ${MAX_BATTLE_TITLE_LENGTH} characters.`);
  }
  if (prompt.length > MAX_BATTLE_PROMPT_LENGTH) {
    throw new Error(`Prompts can be at most ${MAX_BATTLE_PROMPT_LENGTH} characters.`);
  }
  if (!Number.isInteger(input.durationMin) || input.durationMin < MIN_BATTLE_MINUTES || input.durationMin > MAX_BATTLE_MINUTES) {
    throw new Error(`Duration must be a whole number from ${MIN_BATTLE_MINUTES} to ${MAX_BATTLE_MINUTES} minutes.`);
  }
  if (input.samples.length === 0) throw new Error('Choose at least one sample.');
  if (input.samples.length > MAX_BATTLE_SAMPLES) throw new Error(`Choose at most ${MAX_BATTLE_SAMPLES} samples.`);

  const created = await addDoc(collection(db, 'battles'), {
    title,
    prompt,
    creatorUid: user.uid,
    creatorName: getDisplayName(user),
    samples: input.samples.map((s) => ({
      name: s.name,
      url: s.url,
      packId: s.packId,
      packName: s.packName.slice(0, 100),
    })),
    durationMin: input.durationMin,
    status: 'lobby',
    startedAt: null,
    createdAt: serverTimestamp(),
  });
  await joinBattle(created.id, user);
  return created.id;
}

// Only the creator can do this; the server stamps startedAt, so every client's timer is derived from one moment.
export async function startBattle(id: string) {
  await updateDoc(battleDoc(id), { status: 'live', startedAt: serverTimestamp() });
}

export async function deleteBattle(id: string) {
  await deleteDoc(battleDoc(id));
}

export function subscribeToParticipants(id: string, onChange: (p: Participant[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(participantsCol(id), orderBy('joinedAt', 'asc')),
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return { uid: d.id, name: data.name, joinedAt: toDate(data.joinedAt) };
        })
      ),
    onError
  );
}

export async function joinBattle(id: string, user: User) {
  await setDoc(doc(participantsCol(id), user.uid), { name: getDisplayName(user), joinedAt: serverTimestamp() });
}

export async function leaveBattle(id: string, uid: string) {
  await deleteDoc(doc(participantsCol(id), uid));
}

export function subscribeToBattleSubmissions(
  id: string,
  onChange: (s: BattleSubmission[]) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    query(submissionsCol(id), orderBy('createdAt', 'desc')),
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            title: data.title,
            description: data.description ?? '',
            audioUrl: data.audioUrl,
            storagePath: data.storagePath,
            authorUid: data.authorUid,
            authorName: data.authorName,
            createdAt: toDate(data.createdAt),
          };
        })
      ),
    onError
  );
}

// One submission per user per battle (the doc id is the uid).
export async function submitBattleEntry(
  id: string,
  user: User,
  input: { title: string; description: string; file: File },
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

  const storagePath = `songs/${user.uid}/${Date.now()}_${input.file.name.replace(/[^\w.-]+/g, '_')}`;
  const fileRef = ref(storage, storagePath);
  const task = uploadBytesResumable(fileRef, input.file, { contentType: input.file.type });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', (s) => onProgress?.(s.bytesTransferred / s.totalBytes), reject, () => resolve());
  });
  const audioUrl = await getDownloadURL(fileRef);

  try {
    await setDoc(doc(submissionsCol(id), user.uid), {
      title,
      description,
      audioUrl,
      storagePath,
      authorUid: user.uid,
      authorName: getDisplayName(user),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteObject(fileRef).catch(() => {});
    throw error;
  }
}

export async function deleteBattleSubmission(id: string, submission: BattleSubmission) {
  await deleteDoc(doc(submissionsCol(id), submission.id));
  await deleteObject(ref(storage, submission.storagePath)).catch(() => {});
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
