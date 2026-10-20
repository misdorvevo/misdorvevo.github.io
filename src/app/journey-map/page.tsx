const stages = [
  {
    title: "1) Trigger",
    today: "Producer is in a session and needs a usable sound fast.",
    behavior: "Time pressure drives speed over deep browsing.",
    pain: "Creative momentum drops if search takes too long.",
  },
  {
    title: "2) Source Choice",
    today: "Opens Splice first for speed/legal clarity, or YouTube/record store depending on taste.",
    behavior: "Chooses source by speed, legal confidence, and vibe.",
    pain: "Quality and rights confidence vary by source.",
  },
  {
    title: "3) Search",
    today: "Uses keyword search, then filters by genre and instrument.",
    behavior: "Skims quickly and previews many sounds in short bursts.",
    pain: "Tagging can be noisy, causing extra clicks.",
  },
  {
    title: "4) Download",
    today: "Mostly cherry-picks individual samples across multiple packs.",
    behavior: "Grabs only what is needed for the current beat.",
    pain: "Downloads can become fragmented and messy.",
  },
  {
    title: "5) Transform in DAW",
    today: "Drags sample into DAW, then chops and pitches until it feels original.",
    behavior: "Fast manipulation to match artist/session direction.",
    pain: "Legal confidence often comes from guesswork, not verification.",
  },
  {
    title: "6) Social Loop",
    today: "Interaction lives on Discord/Instagram/in-person circles.",
    behavior: "Usually does not share back immediately; may share after full release.",
    pain: "Weak feedback loop for community contribution in the moment.",
  },
];

const assumptions = [
  "Many producers skip license verification under pressure.",
  "Discord is dominant for underground producer sharing (segment-dependent).",
  "Most users prefer downloading individual sounds over full packs.",
  "Transformation in DAW is perceived as making a sample safe/new (not guaranteed legally).",
];

export default function JourneyMapPage() {
  return (
    <main className="flex-1 bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="border border-zinc-700 bg-zinc-900/60 rounded-xl p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Low-Fidelity Wireframe</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">User Journey Map (Today, Before Co-Drop)</h1>
          <p className="text-zinc-300 mt-3 max-w-3xl">
            Persona: Producer who needs samples. This draft captures the current workflow from our conversation and keeps assumptions explicit.
          </p>
        </header>

        <section className="border border-dashed border-zinc-600 rounded-xl p-5 bg-zinc-900/30">
          <h2 className="text-lg font-semibold mb-3">Wireframe Legend</h2>
          <div className="grid gap-2 text-sm text-zinc-300 md:grid-cols-4">
            <p>[Today Step]</p>
            <p>[Observed Behavior]</p>
            <p>[Pain/Risk]</p>
            <p>[Opportunity Placeholder]</p>
          </div>
        </section>

        <section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stages.map((stage) => (
              <article key={stage.title} className="border border-zinc-700 bg-zinc-900/40 rounded-xl p-5">
                <h3 className="text-base font-bold text-zinc-100">{stage.title}</h3>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="border border-zinc-700 rounded-md p-3">
                    <p className="text-zinc-400 mb-1">[Today Step]</p>
                    <p className="text-zinc-200">{stage.today}</p>
                  </div>
                  <div className="border border-zinc-700 rounded-md p-3">
                    <p className="text-zinc-400 mb-1">[Observed Behavior]</p>
                    <p className="text-zinc-200">{stage.behavior}</p>
                  </div>
                  <div className="border border-zinc-700 rounded-md p-3">
                    <p className="text-zinc-400 mb-1">[Pain/Risk]</p>
                    <p className="text-zinc-200">{stage.pain}</p>
                  </div>
                  <div className="border border-dashed border-zinc-600 rounded-md p-3 text-zinc-500">
                    [Opportunity Placeholder]
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="border border-zinc-700 rounded-xl p-5 bg-zinc-900/40">
            <h2 className="font-semibold text-lg">Current Search Stack</h2>
            <ul className="mt-3 text-sm text-zinc-200 space-y-2 list-disc pl-5">
              <li>Primary speed route: Splice keyword search by genre/instrument.</li>
              <li>Alternate route: YouTube for discovery and vibe hunting.</li>
              <li>Niche route: In-person record store digging for uniqueness.</li>
              <li>Social context: Discord + Instagram + in-person producer circles.</li>
            </ul>
          </article>

          <article className="border border-zinc-700 rounded-xl p-5 bg-zinc-900/40">
            <h2 className="font-semibold text-lg">Assumptions to Validate</h2>
            <ul className="mt-3 text-sm text-zinc-200 space-y-2 list-disc pl-5">
              {assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
