'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react';
import Logo from '@/components/Logo';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { Profile, subscribeToProfile } from '@/lib/profile';
import { isUnread, subscribeToConversations } from '@/lib/messages';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 12));
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setDropdownOpen(false);
  }

  const navLinks = [
    { href: '/browse', label: 'Browse' },
    { href: '/packs', label: 'Packs' },
    { href: '/journey-map', label: 'Journey Map' },
    { href: '/challenge', label: 'Challenge' },
    ...(user ? [{ href: '/liked-packs', label: 'Liked Packs' }, { href: '/messages', label: 'Messages' }] : []),
    { href: '/upload', label: 'Upload' },
  ];
  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const menuItems = user
    ? [
        { href: '/users/' + user.uid, label: 'My Profile' },
        { href: '/account/appearance', label: 'Edit Profile' },
        { href: '/my-packs', label: 'My Packs' },
        { href: '/account/settings', label: 'Account Settings' },
      ]
    : [];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProfile(user.uid, setProfile, () => {});
    return () => {
      unsubscribe();
      setProfile(null);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(
      user.uid,
      (list) => setHasUnread(list.some((c) => isUnread(c, user.uid))),
      () => {}
    );
    return () => {
      unsubscribe();
      setHasUnread(false);
    };
  }, [user]);

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

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled ? 'glass border-gray-700/60 py-2.5 shadow-lg shadow-black/30' : 'border-transparent bg-transparent py-4'
      }`}
    >
      <motion.div style={{ scaleX: progress }} className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r from-brand-600 via-brand-400 to-brand-200" />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <Link href="/" aria-label="Co-Drop home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" onMouseLeave={() => setHovered(null)}>
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            const highlighted = hovered ? hovered === link.href : active;
            return (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => setHovered(link.href)}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  highlighted ? 'text-white' : active ? 'text-white' : 'text-gray-400'
                }`}
              >
                {highlighted && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-brand-500/15 ring-1 ring-brand-400/30"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">
                  {link.label}
                  {link.href === '/messages' && hasUnread && <span className="absolute -right-2.5 -top-0.5 h-2 w-2 rounded-full bg-brand-400" aria-label="Unread messages" />}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-gray-800/80"
                aria-expanded={dropdownOpen}
              >
                <Avatar name={displayName} photoURL={profile?.photoURL ?? user.photoURL} size={36} />
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-white sm:block">{displayName}</span>
                <motion.svg
                  animate={{ rotate: dropdownOpen ? 180 : 0 }}
                  className="h-4 w-4 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="glass absolute right-0 mt-3 w-56 origin-top-right overflow-hidden rounded-2xl border border-gray-700 p-1.5 shadow-2xl shadow-black/50"
                  >
                    {menuItems.map((item, i) => (
                      <motion.div key={item.href} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                        <Link href={item.href} className="block rounded-xl px-3 py-2.5 text-sm text-gray-200 transition-colors hover:bg-brand-500/15 hover:text-brand-300">
                          {item.label}
                        </Link>
                      </motion.div>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="mt-1 w-full rounded-xl border-t border-gray-700 px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white sm:block">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand-400 px-5 py-2 text-sm font-semibold text-black shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 hover:bg-brand-300 hover:shadow-brand-400/40"
              >
                Sign Up
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full hover:bg-gray-800/80 md:hidden"
          >
            <motion.span animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 4 : 0 }} className="block h-0.5 w-5 rounded bg-white" />
            <motion.span animate={{ opacity: mobileOpen ? 0 : 1 }} className="block h-0.5 w-5 rounded bg-white" />
            <motion.span animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -4 : 0 }} className="block h-0.5 w-5 rounded bg-white" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 pb-4 pt-3">
              {navLinks.map((link, i) => (
                <motion.div key={link.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                  <Link
                    href={link.href}
                    className={`block rounded-xl px-4 py-3 text-base font-medium ${
                      pathname.startsWith(link.href) ? 'bg-brand-500/15 text-brand-300' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {link.label}
                    {link.href === '/messages' && hasUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-brand-400" aria-label="Unread messages" />}
                  </Link>
                </motion.div>
              ))}
              {!user && (
                <Link href="/login" className="block rounded-xl px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-800">
                  Login
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
