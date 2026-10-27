'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { recordLicenseAcceptance } from '@/lib/profile';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [acceptedLicense, setAcceptedLicense] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedLicense) {
      setError('You must agree to the sample license to create an account.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await recordLicenseAcceptance(userCredential.user, displayName);
      await sendEmailVerification(userCredential.user).catch(() => {});
      router.push('/verify-email');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800">
        <h2 className="text-4xl font-bold text-center mb-8 text-white">Sign Up for Co-Drop</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="displayName" className="block text-white mb-2 font-medium">Display Name</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-white mb-2 font-medium">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-white mb-2 font-medium">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700"
              required
            />
          </div>
          <label className="flex items-start gap-3 mb-6 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedLicense}
              onChange={(e) => setAcceptedLicense(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
              required
            />
            <span>
              I agree that any samples I upload are licensed to all Co-Drop users under a{' '}
              <strong className="text-white">royalty-free, non-exclusive, perpetual, worldwide license</strong>, allowing them to use, modify and
              include the samples in their own commercial and non-commercial music without payment or attribution. I keep ownership of my
              work, and I confirm I own or control the rights to everything I upload.
            </span>
          </label>
          <button
            type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Sign Up
          </button>
        </form>
        <p className="text-center mt-6 text-gray-400">
          Already have an account? <Link href="/login" className="text-brand-500 hover:text-brand-400 font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}