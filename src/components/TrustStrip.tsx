const steps = [
  {
    title: "We track every fare, hourly",
    desc: "TripTide polls thousands of sailings around the clock across every major cabin category and line.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  {
    title: "We surface the true total",
    desc: "Base fare, port taxes, and gratuities — bundled into one honest out-the-door number, per passenger.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h12" />
        <path d="M10 12h8" />
        <path d="M10 16h6" />
      </svg>
    ),
  },
  {
    title: "You get notified first",
    desc: "The moment your tracked sailing drops or a solo waiver appears, you're the first to know.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <section className="border-y border-black/[0.06] bg-white px-4 py-20 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title} className="relative pl-0">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
              {step.icon}
            </div>
            <p className="font-mono-tab text-xs font-semibold text-ink-faint">0{i + 1}</p>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-ink-soft">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}