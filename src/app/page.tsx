const pillars = [
  {
    index: "01",
    title: "Interpret",
    description: "Turn human policy into explicit, reviewable constraints.",
  },
  {
    index: "02",
    title: "Enforce",
    description: "Evaluate every proposed action with deterministic rules.",
  },
  {
    index: "03",
    title: "Approve",
    description: "Pause sensitive actions at a clear human checkpoint.",
  },
  {
    index: "04",
    title: "Audit",
    description: "Preserve the decision trail from intent to outcome.",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070907] text-[#f4f3ec]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-6 py-6 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between border-b border-white/15 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full border border-[#d7ff57]/60 text-xs font-semibold text-[#d7ff57]">
              B
            </span>
            <span className="text-sm font-semibold tracking-[0.28em]">
              BOUNDARY
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-white/50 uppercase">
            <span className="size-1.5 rounded-full bg-[#d7ff57] shadow-[0_0_16px_#d7ff57]" />
            Foundation online
          </div>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.45fr_0.55fr] lg:py-24">
          <div>
            <p className="mb-8 text-xs font-medium tracking-[0.32em] text-[#d7ff57] uppercase">
              Agent control infrastructure
            </p>
            <h1 className="max-w-5xl text-[clamp(4rem,10vw,9.5rem)] leading-[0.78] font-medium tracking-[-0.075em]">
              Intent,
              <br />
              enforced.
            </h1>
            <div className="mt-12 flex max-w-2xl items-start gap-5 border-l border-[#d7ff57]/50 pl-5">
              <p className="text-lg leading-relaxed text-white/62 sm:text-xl">
                A control plane for agents that makes policy legible, decisions
                deterministic, and sensitive actions human-approved.
              </p>
            </div>
          </div>

          <aside className="relative mx-auto w-full max-w-md lg:mx-0">
            <div className="absolute -inset-24 bg-[radial-gradient(circle,rgba(215,255,87,0.10),transparent_65%)]" />
            <div className="relative aspect-square rounded-full border border-white/10 p-8">
              <div className="flex h-full flex-col justify-between rounded-full border border-dashed border-[#d7ff57]/35 p-12">
                <span className="self-center text-[10px] tracking-[0.3em] text-white/40 uppercase">
                  Decision boundary
                </span>
                <div className="text-center">
                  <div className="mx-auto mb-5 size-3 rounded-full bg-[#d7ff57] shadow-[0_0_32px_8px_rgba(215,255,87,0.28)]" />
                  <p className="text-2xl font-medium">Human intent</p>
                  <p className="mt-2 text-sm text-white/45">
                    remains authoritative
                  </p>
                </div>
                <span className="self-center rounded-full border border-white/10 px-4 py-2 text-[10px] tracking-[0.22em] text-white/45 uppercase">
                  Default deny
                </span>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid border-t border-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <article
              key={pillar.index}
              className="group border-b border-white/15 py-7 pr-7 sm:border-r sm:pl-7 sm:first:pl-0 lg:border-b-0"
            >
              <span className="text-[10px] tracking-[0.2em] text-[#d7ff57]">
                {pillar.index}
              </span>
              <h2 className="mt-5 text-xl font-medium">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/42">
                {pillar.description}
              </p>
            </article>
          ))}
        </section>

        <footer className="flex flex-col gap-2 pt-6 text-[10px] tracking-[0.2em] text-white/30 uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>OpenAI Build Week</span>
          <span>Stage 01 / System foundation</span>
        </footer>
      </div>
    </main>
  );
}
