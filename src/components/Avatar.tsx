/* eslint-disable @next/next/no-img-element */
interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, photoURL, size = 40, className = '' }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
  if (photoURL) {
    return <img src={photoURL} alt={name} style={style} className={`rounded-full object-cover shrink-0 ${className}`} />;
  }
  return (
    <div
      style={style}
      className={`rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
    >
      {initials(name)}
    </div>
  );
}
