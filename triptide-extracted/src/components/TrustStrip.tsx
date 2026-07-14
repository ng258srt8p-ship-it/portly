const steps = [
  {
    title: "We track every fare, hourly",
    desc: "TripTide polls thousands of sailings around the clock across every major cabin category and line.",
    icon: <RadarIcon />,
  },
  {
    title: "We surface the true total",
    desc: "Base fare, port taxes, and gratuities — bundled into one honest out-the-door number, per passenger.",
    icon: <CalcIcon />,
  },
  {
    title: "You get notified first",
    desc: "The moment your tracked sailing drops or a solo waiver appears, you're the first to know.",
    icon: <BellIcon />,
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
            <h3 className="mt-2 font-display text-xl font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RadarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
function CalcIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
