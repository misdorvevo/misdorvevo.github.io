import {
  collection,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const MAX_MESSAGE_LENGTH = 1000;
const MESSAGE_WINDOW = 200;

// Conversations live at conversations/{uidA_uidB} (uids sorted) with messages in a `messages` subcollection.
export function conversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastSenderUid: string;
  updatedAt: Date | null;
  readAt: Record<string, Date | null>;
}

export interface DirectMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: Date | null;
}

export function otherParticipant(c: Conversation, myUid: string): string {
  return c.participants.find((p) => p !== myUid) ?? myUid;
}

export function isUnread(c: Conversation, myUid: string): boolean {
  if (!c.updatedAt || c.lastSenderUid === myUid) return false;
  const read = c.readAt[myUid];
  return !read || read.getTime() < c.updatedAt.getTime();
}

function toDate(value: unknown): Date | null {
  return value && typeof (value as Timestamp).toDate === 'function' ? (value as Timestamp).toDate() : null;
}

export function subscribeToConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'conversations'), where('participants', 'array-contains', uid)),
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const readAt: Record<string, Date | null> = {};
        for (const [k, v] of Object.entries((data.readAt ?? {}) as Record<string, unknown>)) readAt[k] = toDate(v);
        return {
          id: d.id,
          participants: data.participants as string[],
          lastMessage: (data.lastMessage as string) ?? '',
          lastSenderUid: (data.lastSenderUid as string) ?? '',
          updatedAt: toDate(data.updatedAt),
          readAt,
        };
      });
      // A just-sent message has a null server timestamp locally; treat it as newest.
      list.sort((a, b) => (b.updatedAt?.getTime() ?? Infinity) - (a.updatedAt?.getTime() ?? Infinity));
      onChange(list);
    },
    onError
  );
}

export function subscribeToMessages(
  convId: string,
  onChange: (messages: DirectMessage[]) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'conversations', convId, 'messages'), orderBy('createdAt'), limitToLast(MESSAGE_WINDOW)),
    (snap) =>
      onChange(
        snap.docs.map((d) => ({
          id: d.id,
          senderUid: d.data().senderUid as string,
          text: d.data().text as string,
          createdAt: toDate(d.data().createdAt),
        }))
      ),
    onError
  );
}

export async function sendMessage(myUid: string, otherUid: string, rawText: string) {
  const text = rawText.trim();
  if (!text) throw new Error('Message is empty.');
  if (text.length > MAX_MESSAGE_LENGTH) throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
  if (myUid === otherUid) throw new Error("You can't message yourself.");

  const convId = conversationId(myUid, otherUid);
  const convRef = doc(db, 'conversations', convId);
  const batch = writeBatch(db);
  // set-merge keeps the conversation creatable by either side and leaves the other user's readAt intact.
  batch.set(
    convRef,
    {
      participants: [myUid, otherUid].sort(),
      lastMessage: text.slice(0, 100),
      lastSenderUid: myUid,
      updatedAt: serverTimestamp(),
      readAt: { [myUid]: serverTimestamp() },
    },
    { merge: true }
  );
  batch.set(doc(collection(convRef, 'messages')), { senderUid: myUid, text, createdAt: serverTimestamp() });
  await batch.commit();
}

export async function markConversationRead(convId: string, myUid: string) {
  await updateDoc(doc(db, 'conversations', convId), { [`readAt.${myUid}`]: serverTimestamp() });
}
