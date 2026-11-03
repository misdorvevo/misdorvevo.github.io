'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SocialButtons from '@/components/SocialButtons';

export default function Signup() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800">
        <h2 className="text-4xl font-bold text-center mb-3 text-white">Sign Up for Co-Drop</h2>
        <p className="text-center text-gray-400 text-sm mb-8">
          No passwords to remember — sign up with your Google or GitHub account. You&apos;ll be asked to accept the sample license next.
        </p>
        <SocialButtons onSignedIn={() => router.push('/')} />
        <p className="text-center mt-6 text-gray-400">
          Already have an account? <Link href="/login" className="text-brand-500 hover:text-brand-400 font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}
