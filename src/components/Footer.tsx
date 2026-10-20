import Link from 'next/link';
import Logo from '@/components/Logo';

const COLUMNS = [
  { title: 'Explore', links: [['Browse samples', '/browse'], ['Sample packs', '/packs'], ['Journey map', '/journey-map']] },
  { title: 'Create', links: [['Upload a pack', '/upload'], ['My packs', '/my-packs'], ['Liked packs', '/liked-packs']] },
  { title: 'Account', links: [['Log in', '/login'], ['Sign up', '/signup'], ['Edit profile', '/account/appearance']] },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-800 bg-black/60 backdrop-blur-md px-6 py-14">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-gray-400">
            Drop your sounds, find new ones, and build songs together with producers everywhere.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-gray-500">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-gray-300 transition-colors hover:text-brand-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-gray-800 pt-6 text-xs text-gray-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Co-Drop. All rights reserved.</p>
        <p>Made for music makers.</p>
      </div>
    </footer>
  );
}
