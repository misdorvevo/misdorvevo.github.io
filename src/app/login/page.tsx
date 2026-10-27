'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      router.push(user.emailVerified ? '/' : '/verify-email');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800">
        <h2 className="text-4xl font-bold text-center mb-8 text-white">Login to Co-Drop</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
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
          <div className="mb-6">
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
          <button
            type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
        <p className="text-center mt-6 text-gray-400">
          Don't have an account? <Link href="/signup" className="text-brand-500 hover:text-brand-400 font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  );
}