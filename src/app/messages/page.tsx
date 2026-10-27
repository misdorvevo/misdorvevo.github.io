'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Avatar from '@/components/Avatar';
import { getProfile, type Profile } from '@/lib/profile';
import { timeAgo } from '@/lib/social';
import {
  MAX_MESSAGE_LENGTH,
  conversationId,
  isUnread,
  markConversationRead,
  otherParticipant,
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
  type Conversation,
  type DirectMessage,
} from '@/lib/messages';

const profileCache = new Map<string, Promise<Profile | null>>();

function useProfiles(uids: string[]) {
  const [profiles, setProfiles] = useState<Record<string, Profile | null>>({});
  const key = uids.join(',');
  useEffect(() => {
    let active = true;
    for (const uid of key ? key.split(',') : []) {
      let request = profileCache.get(uid);
      if (!request) {
        request = getProfile(uid).catch(() => null);
        profileCache.set(uid, request);
      }
      request.then((p) => active && setProfiles((prev) => (uid in prev ? prev : { ...prev, [uid]: p })));
    }
    return () => { active = false; };
  }, [key]);
  return profiles;
}

function MessagesView() {
  const router = useRouter();
  const params = useSearchParams();
  const toUid = params.get('to');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); }), []);

  useEffect(() => {
    if (authReady && !user) router.replace('/login');
  }, [authReady, user, router]);

  useEffect(() => {
    if (!user) return;
    return subscribeToConversations(
      user.uid,
      (list) => { setConversations(list); setConvLoading(false); },
      () => setConvLoading(false)
    );
  }, [user]);

  const myUid = user?.uid ?? '';
  const activeUid = toUid && toUid !== myUid ? toUid : null;
  const listUids = conversations.map((c) => otherParticipant(c, myUid));
  const profiles = useProfiles(activeUid && !listUids.includes(activeUid) ? [...listUids, activeUid] : listUids);

  if (!user) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-5xl mx-auto text-gray-400">Loading...</p></main>;
  }

  const nameOf = (uid: string) => profiles[uid]?.displayName || 'User';

  return (
    <main className="flex-1 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Messages</h1>
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 md:h-[70vh]">
          <aside className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-y-auto max-h-[50vh] md:max-h-none ${activeUid ? 'hidden md:block' : ''}`}>
            {convLoading ? (
              <p className="p-4 text-gray-500 text-sm">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">No conversations yet. Visit someone&apos;s profile and press Message to start one.</p>
            ) : (
              conversations.map((c) => {
                const other = otherParticipant(c, myUid);
                const unread = isUnread(c, myUid);
                return (
                  <Link
                    key={c.id}
                    href={`/messages?to=${other}`}
                    className={`flex items-center gap-3 p-3 border-b border-gray-800 hover:bg-gray-800/60 ${other === activeUid ? 'bg-gray-800' : ''}`}
                  >
                    <Avatar name={nameOf(other)} photoURL={profiles[other]?.photoURL} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${unread ? 'font-bold text-white' : 'font-medium text-gray-200'}`}>{nameOf(other)}</p>
                      <p className={`truncate text-xs ${unread ? 'text-gray-200' : 'text-gray-500'}`}>
                        {c.lastSenderUid === myUid ? 'You: ' : ''}{c.lastMessage}
                      </p>
                    </div>
                    {unread && <span className="h-2.5 w-2.5 rounded-full bg-brand-400 shrink-0" aria-label="Unread" />}
                  </Link>
                );
              })
            )}
          </aside>

          <section className={`bg-gray-900 border border-gray-800 rounded-2xl flex flex-col min-h-[60vh] md:min-h-0 overflow-hidden ${activeUid ? '' : 'hidden md:flex'}`}>
            {activeUid ? (
              <Thread
                key={activeUid}
                myUid={myUid}
                otherUid={activeUid}
                name={nameOf(activeUid)}
                photoURL={profiles[activeUid]?.photoURL}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-6 text-center">
                Select a conversation to start chatting.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Thread({ myUid, otherUid, name, photoURL }: { myUid: string; otherUid: string; name: string; photoURL?: string | null }) {
  const convId = conversationId(myUid, otherUid);
  const [messages, setMessages] = useState<DirectMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A brand-new conversation doesn't exist yet, so reads are denied until the first message.
    return subscribeToMessages(convId, setMessages, () => setMessages([]));
  }, [convId]);

  const lastId = messages?.[messages.length - 1]?.id;
  const lastFromOther = messages?.[messages.length - 1]?.senderUid === otherUid;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  useEffect(() => {
    if (lastId && lastFromOther) markConversationRead(convId, myUid).catch(() => {});
  }, [lastId, lastFromOther, convId, myUid]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !text.trim()) return;
    setSending(true);
    setError('');
    try {
      await sendMessage(myUid, otherUid, text);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <Link href="/messages" className="md:hidden text-gray-400 hover:text-white" aria-label="Back to conversations">←</Link>
        <Avatar name={name} photoURL={photoURL} size={36} />
        <Link href={`/users/${otherUid}`} className="font-semibold text-white hover:text-brand-400 truncate">{name}</Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages === null ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-8">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderUid === myUid;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? 'bg-brand-500 text-black' : 'bg-gray-800 text-gray-100'}`}>
                  <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-black/60' : 'text-gray-500'}`}>{timeAgo(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-800 p-3">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            placeholder={`Message ${name}`}
            className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-xl text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<main className="flex-1 py-12 px-6"><p className="max-w-5xl mx-auto text-gray-400">Loading...</p></main>}>
      <MessagesView />
    </Suspense>
  );
}
