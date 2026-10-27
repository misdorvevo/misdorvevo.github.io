import { assumptions, journeys } from "./journeys";

const personas = [
  {
    name: "Persona 1: The Inspiration Seeker",
    role: "Berklee producer looking for fresh sounds",
    primaryActivity: "Downloading samples",
    goal: "Find unique, usable sounds quickly to spark new beats.",
    behaviors: [
      "Browses and filters by genre, key, BPM, and emotion, auditioning many sounds in short bursts.",
      "Cherry-picks individual samples instead of whole packs.",
      "Reshapes sounds with pitch, speed, compression, and reverse before downloading.",
    ],
    needs: [
      "Fast, accurate filtering and instant previews.",
      "Clear usage terms so sounds can be used without guesswork.",
      "Steady supply of new, uncommon material.",
    ],
    painPoints: [
      "Noisy tags waste time.",
      "Unclear rights on sounds found elsewhere.",
      "Popular libraries feel overused and generic.",
    ],
    coDrop: ["Browse", "Sample FX", "Random pack", "Weekly Challenge prompts"],
  },
  {
    name: "Persona 2: The Community Builder",
    role: "Berklee producer who wants to connect and share",
    primaryActivity: "Uploading packs and sharing samples",
    goal: "Get his music and sounds heard and build a following among other producers.",
    behaviors: [
      "Uploads sample packs and posts finished songs made with them.",
      "Shares tracks to Instagram, TikTok, and X to grow reach.",
      "Comments on, likes, and messages other producers.",
    ],
    needs: [
      "Easy pack uploads with a profile that showcases his work.",
      "Real feedback and recognition from peers.",
      "Simple ways to share outside the platform.",
    ],
    painPoints: [
      "Sharing lives scattered across Discord, Instagram, and in-person circles.",
      "Weak feedback loop in the moment.",
      "Hard to stand out without an audience.",
    ],
    coDrop: ["Upload", "Profile", "Songs + comments", "Direct messages", "Share to socials", "Weekly Challenge"],
  },
];

export default function JourneyMapPage() {
  return (
    <main className="flex-1 bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="border border-zinc-700 bg-zinc-900/60 rounded-xl p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Low-Fidelity Wireframe</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">Co-Drop User Journey Maps</h1>
          <p className="text-zinc-300 mt-3 max-w-3xl">
            Two personas and three journeys through the platform&apos;s key features: downloading samples, uploading and sharing music, and the weekly beat challenge.
          </p>
        </header>

        <section>
          <h2 className="text-lg font-semibold mb-3">User Personas</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {personas.map((persona) => (
              <article key={persona.name} className="border border-zinc-700 bg-zinc-900/40 rounded-xl p-5">
                <h3 className="text-base font-bold text-zinc-100">{persona.name}</h3>
                <p className="text-sm text-zinc-300 mt-1">{persona.role}</p>
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-400 mt-2">
                  Primary activity: <span className="text-zinc-200">{persona.primaryActivity}</span>
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="border border-zinc-700 rounded-md p-3">
                    <p className="text-zinc-400 mb-1">[Goal]</p>
                    <p className="text-zinc-200">{persona.goal}</p>
                  </div>
                  {([
                    ["[Behaviors]", persona.behaviors],
                    ["[Needs]", persona.needs],
                    ["[Pain/Risk]", persona.painPoints],
                  ] as const).map(([label, items]) => (
                    <div key={label} className="border border-zinc-700 rounded-md p-3">
                      <p className="text-zinc-400 mb-1">{label}</p>
                      <ul className="text-zinc-200 space-y-1 list-disc pl-5">
                        {items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="border border-dashed border-zinc-600 rounded-md p-3">
                    <p className="text-zinc-400 mb-2">[Co-Drop Features They Use]</p>
                    <div className="flex flex-wrap gap-2">
                      {persona.coDrop.map((feature) => (
                        <span key={feature} className="rounded-full border border-zinc-600 px-3 py-1 text-xs text-zinc-300">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-dashed border-zinc-600 rounded-xl p-5 bg-zinc-900/30">
          <h2 className="text-lg font-semibold mb-3">Wireframe Legend</h2>
          <div className="grid gap-2 text-sm text-zinc-300 md:grid-cols-4">
            <p>[Action]</p>
            <p>[Touchpoint]</p>
            <p>[Pain/Risk]</p>
            <p>[Opportunity]</p>
          </div>
        </section>

        {journeys.map((journey) => (
          <section key={journey.id} id={journey.id} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{journey.title}</h2>
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-400 mt-1">
                Persona: <span className="text-zinc-200">{journey.persona}</span>
              </p>
              <p className="text-zinc-300 text-sm mt-2 max-w-3xl">Goal: {journey.goal}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {journey.stages.map((stage) => (
                <article key={stage.title} className="border border-zinc-700 bg-zinc-900/40 rounded-xl p-5">
                  <h3 className="text-base font-bold text-zinc-100">{stage.title}</h3>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="border border-zinc-700 rounded-md p-3">
                      <p className="text-zinc-400 mb-1">[Action]</p>
                      <p className="text-zinc-200">{stage.action}</p>
                    </div>
                    <div className="border border-zinc-700 rounded-md p-3">
                      <p className="text-zinc-400 mb-1">[Touchpoint]</p>
                      <p className="text-zinc-200">{stage.touchpoint}</p>
                    </div>
                    <div className="border border-zinc-700 rounded-md p-3">
                      <p className="text-zinc-400 mb-1">[Pain/Risk]</p>
                      <p className="text-zinc-200">{stage.pain}</p>
                    </div>
                    <div className="border border-dashed border-zinc-600 rounded-md p-3">
                      <p className="text-zinc-400 mb-1">[Opportunity]</p>
                      <p className="text-zinc-200">{stage.opportunity}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section>
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
