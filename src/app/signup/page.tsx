'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SocialButtons from '@/components/SocialButtons';
import { needsLicenseAcceptance, recordLicenseAcceptance } from '@/lib/profile';

export default function Signup() {
  const [acceptedLicense, setAcceptedLicense] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800">
        <h2 className="text-4xl font-bold text-center mb-3 text-white">Sign Up for Co-Drop</h2>
        <p className="text-center text-gray-400 text-sm mb-8">No passwords to remember — sign up with your Google or GitHub account.</p>
        <label className="flex items-start gap-3 mb-6 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedLicense}
            onChange={(e) => setAcceptedLicense(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            I agree that any samples I upload are licensed to all Co-Drop users under a{' '}
            <strong className="text-white">royalty-free, non-exclusive, perpetual, worldwide license</strong>, allowing them to use, modify and
            include the samples in their own commercial and non-commercial music without payment or attribution. I keep ownership of my
            work, and I confirm I own or control the rights to everything I upload.
          </span>
        </label>
        <SocialButtons
          disabled={!acceptedLicense}
          onSignedIn={async (user) => {
            if (await needsLicenseAcceptance(user.uid)) {
              await recordLicenseAcceptance(user, user.displayName ?? '');
            }
            router.push('/');
          }}
        />
        {!acceptedLicense && <p className="mt-3 text-center text-xs text-gray-500">Accept the license above to continue.</p>}
        <p className="text-center mt-6 text-gray-400">
          Already have an account? <Link href="/login" className="text-brand-500 hover:text-brand-400 font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}
