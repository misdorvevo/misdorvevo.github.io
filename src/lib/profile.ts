import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { updateProfile, User } from 'firebase/auth';
import { db, storage } from '@/lib/firebase';

export interface ProfileLink {
  label: string;
  url: string;
}

export interface Profile {
  displayName: string;
  bio: string;
  photoURL: string | null;
  photoPath: string | null;
  links: ProfileLink[];
  privacy: Privacy;
}

export interface Privacy {
  allowDMs: boolean;
  showBio: boolean;
  showLinks: boolean;
}

export const DEFAULT_PRIVACY: Privacy = { allowDMs: true, showBio: true, showLinks: true };

export function normalizePrivacy(p: Partial<Privacy> | undefined): Privacy {
  return {
    allowDMs: p?.allowDMs !== false,
    showBio: p?.showBio !== false,
    showLinks: p?.showLinks !== false,
  };
}

export const BIO_MAX = 300;
export const NAME_MAX = 50;
export const LINKS_MAX = 6;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const LINK_PLATFORMS = [
  'Instagram', 'YouTube', 'SoundCloud', 'Spotify', 'Bandcamp', 'TikTok', 'Twitter / X', 'Website',
] as const;

export function emptyProfile(user?: User | null): Profile {
  return {
    displayName: user?.displayName || user?.email?.split('@')[0] || '',
    bio: '',
    photoURL: user?.photoURL ?? null,
    photoPath: null,
    links: [],
    privacy: { ...DEFAULT_PRIVACY },
  };
}

function normalize(data: Partial<Profile> | undefined, fallbackName = ''): Profile {
  return {
    displayName: data?.displayName || fallbackName,
    bio: data?.bio ?? '',
    photoURL: data?.photoURL ?? null,
    photoPath: data?.photoPath ?? null,
    links: Array.isArray(data?.links) ? data!.links : [],
    privacy: normalizePrivacy(data?.privacy),
  };
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? normalize(snap.data() as Partial<Profile>) : null;
}

export function subscribeToProfile(uid: string, onChange: (p: Profile | null) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onChange(snap.exists() ? normalize(snap.data() as Partial<Profile>) : null),
    onError
  );
}

// Only http(s) links are allowed, so a "javascript:" URL can never be rendered as a link.
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeHref(url: string): string | null {
  return normalizeUrl(url);
}

export function validateAvatar(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file.';
  if (file.size > AVATAR_MAX_BYTES) return 'Image must be under 5 MB.';
  return null;
}

export async function uploadAvatar(user: User, file: File, previousPath: string | null): Promise<{ photoURL: string; photoPath: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const photoPath = `avatars/${user.uid}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, photoPath);
  await uploadBytes(fileRef, file, { contentType: file.type });
  const photoURL = await getDownloadURL(fileRef);
  if (previousPath && previousPath !== photoPath) {
    deleteObject(ref(storage, previousPath)).catch(() => {});
  }
  return { photoURL, photoPath };
}

export async function removeAvatarFile(path: string | null) {
  if (path) await deleteObject(ref(storage, path)).catch(() => {});
}

export async function saveProfile(user: User, profile: Profile) {
  const displayName = profile.displayName.trim().slice(0, NAME_MAX);
  if (!displayName) throw new Error('Display name is required.');

  const links = profile.links
    .map((l) => ({ label: l.label.trim().slice(0, 30), url: normalizeUrl(l.url) }))
    .filter((l): l is ProfileLink => !!l.url)
    .slice(0, LINKS_MAX);

  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    bio: profile.bio.trim().slice(0, BIO_MAX),
    photoURL: profile.photoURL,
    photoPath: profile.photoPath,
    links,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // Keep the auth profile in sync so the header and new comments pick up the changes.
  await updateProfile(user, { displayName, photoURL: profile.photoURL });
}

export async function savePrivacy(uid: string, privacy: Privacy) {
  await setDoc(doc(db, 'users', uid), {
    privacy: normalizePrivacy(privacy),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// Bump when the wording of the sample license shown at signup changes.
export const LICENSE_VERSION = '2026-10-27';

export async function recordLicenseAcceptance(user: User, displayName: string) {
  await setDoc(doc(db, 'users', user.uid), {
    displayName: displayName.trim().slice(0, NAME_MAX) || user.email?.split('@')[0] || 'User',
    bio: '',
    photoURL: null,
    photoPath: null,
    links: [],
    updatedAt: serverTimestamp(),
    licenseAcceptedAt: serverTimestamp(),
    licenseVersion: LICENSE_VERSION,
  });
}
