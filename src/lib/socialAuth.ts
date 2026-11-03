import { GithubAuthProvider, GoogleAuthProvider, signInWithPopup, type AuthProvider, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type SocialProvider = 'google' | 'github';

const providers: Record<SocialProvider, () => AuthProvider> = {
  google: () => new GoogleAuthProvider(),
  github: () => {
    const p = new GithubAuthProvider();
    p.addScope('user:email');
    return p;
  },
};

export async function signInWithSocial(provider: SocialProvider): Promise<User> {
  return (await signInWithPopup(auth, providers[provider]())).user;
}

export function socialErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists using a different sign-in method. Sign in with that provider instead.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled yet.';
    default:
      return err instanceof Error ? err.message : 'Sign-in failed.';
  }
}
