'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setDropdownOpen(false);
    router.push('/');
  };

  const getInitials = (displayName: string | null, email: string | null): string => {
    if (displayName) {
      return displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (email?.[0] || '?').toUpperCase();
  };

  return (
    <header className="bg-black border-b border-orange-500 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-orange-500 hover:text-orange-400 transition-colors">
          AudioCave
        </Link>
        <nav className="hidden md:flex space-x-8">
          <Link href="/browse" className="text-white hover:text-orange-500 transition-colors">
            Browse
          </Link>
          <Link href="/packs" className="text-white hover:text-orange-500 transition-colors">
            Packs
          </Link>
          {user && (
            <Link href="/liked-packs" className="text-white hover:text-orange-500 transition-colors">
              Liked Packs
            </Link>
          )}
          <Link href="/upload" className="text-white hover:text-orange-500 transition-colors">
            Upload
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                {/* Profile Picture Circle */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(user.displayName, user.email)}
                </div>
                {/* Username */}
                <span className="text-white font-semibold text-sm max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <Link href="/account/appearance">
                    <button className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors text-sm">
                      Account Appearance
                    </button>
                  </Link>
                  <Link href="/my-packs">
                    <button className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors text-sm border-t border-gray-700">
                      My Packs
                    </button>
                  </Link>
                  <Link href="/account/settings">
                    <button className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors text-sm border-t border-gray-700">
                      Account Settings
                    </button>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-700 transition-colors text-sm border-t border-gray-700"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-white hover:text-orange-500 transition-colors">
                Login
              </Link>
              <Link href="/signup" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}