const BARS = [0.45, 0.9, 0.65, 1, 0.55];

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="group inline-flex items-center gap-2.5">
      <span
        className="flex items-center gap-[3px] rounded-lg bg-brand-500/15 ring-1 ring-brand-400/30 px-1.5"
        style={{ height: size, width: size * 1.25 }}
        aria-hidden
      >
        {BARS.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-brand-400 origin-center transition-transform duration-300 group-hover:animate-eq"
            style={{ height: `${h * 70}%`, animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-white">
        Co<span className="text-brand-400">-</span>Drop
      </span>
    </span>
  );
}
