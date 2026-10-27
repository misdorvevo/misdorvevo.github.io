'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import Avatar from '@/components/Avatar';
import { Profile, safeHref, subscribeToProfile } from '@/lib/profile';

interface UserPack {
  id: string;
  name: string;
  description?: string;
  files?: { name: string; url: string }[];
  coverImage?: string;
  uploaderName: string;
}

export default function PublicProfile() {
  const { uid } = useParams<{ uid: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [packs, setPacks] = useState<UserPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setCurrentUid(u?.uid ?? null)), []);

  useEffect(() => subscribeToProfile(uid, setProfile, () => {}), [uid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'samplePacks'), where('uploaderUid', '==', uid)));
        if (!cancelled) setPacks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserPack, 'id'>) })));
      } catch {
        // Packs are optional on this page.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  if (loading) {
    return <main className="flex-1 py-12 px-6"><p className="max-w-4xl mx-auto text-gray-400">Loading...</p></main>;
  }

  if (!profile && packs.length === 0) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto text-gray-400">
          <p>This profile doesn&apos;t exist yet.</p>
          {currentUid === uid && <Link href="/account/appearance" className="text-brand-500 underline">Set up your profile</Link>}
        </div>
      </main>
    );
  }

  const name = profile?.displayName || packs[0]?.uploaderName || 'User';

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col sm:flex-row gap-6">
          <Avatar name={name} photoURL={profile?.photoURL} size={120} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold text-white break-words">{name}</h1>
              {currentUid === uid ? (
                <Link href="/account/appearance" className="shrink-0 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm">
                  Edit profile
                </Link>
              ) : profile?.privacy.allowDMs === false ? (
                <span className="shrink-0 text-gray-500 text-sm py-2">Messages off</span>
              ) : (
                <Link href={currentUid ? `/messages?to=${uid}` : '/login'} className="shrink-0 bg-brand-500 hover:bg-brand-600 text-black font-semibold px-4 py-2 rounded-lg text-sm">
                  Message
                </Link>
              )}
            </div>
            {profile?.bio && (profile.privacy.showBio || currentUid === uid) ? (
              <p className="text-gray-300 mt-3 whitespace-pre-wrap break-words">{profile.bio}</p>
            ) : (
              <p className="text-gray-500 mt-3">No bio yet.</p>
            )}
            {profile && profile.links.length > 0 && (profile.privacy.showLinks || currentUid === uid) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.links.map((l, i) => {
                  const href = safeHref(l.url);
                  if (!href) return null;
                  return (
                    <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-brand-400 px-3 py-1.5 rounded-full text-sm">
                      {l.label} ↗
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">Packs ({packs.length})</h2>
        {packs.length === 0 ? (
          <p className="text-gray-500">No packs uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packs.map((pack) => (
              <Link key={pack.id} href={`/packs/${pack.id}`}>
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 card-lift hover:border-brand-500 transition-all overflow-hidden group cursor-pointer h-full flex flex-col">
                  <div className="w-full h-48 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl mb-4 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-brand-500/30 transition-shadow overflow-hidden">
                    {pack.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pack.coverImage} alt={pack.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-lg font-semibold text-center px-4">{pack.name}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-brand-400 transition-colors">{pack.name}</h3>
                  <p className="text-gray-500 mb-4 text-sm line-clamp-2 flex-1">{pack.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-500 font-semibold text-sm">{pack.files?.length ?? 0} files</span>
                    <span className="bg-brand-500 group-hover:bg-brand-600 text-black px-4 py-2 rounded-lg transition-colors font-semibold text-sm">
                      View Pack
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
