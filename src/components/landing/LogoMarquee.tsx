const LOGOS = ["Northwind", "Cascade Labs", "Verity", "Loop & Co", "Anchor Point", "Fieldstone", "Harbor Metrics", "Greywing"];

export default function LogoMarquee() {
  return (
    <section className="py-14 md:py-[72px] lg:py-24 bg-[var(--surface-card)] border-b border-[var(--border-default)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="bg-caption text-center text-[var(--text-muted)] mb-6">Teams collecting with Beginso</p>
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track [animation-duration:20s] md:[animation-duration:30s]">
            {[LOGOS, LOGOS].map((set, setIndex) => (
              <div key={setIndex} className="flex items-center shrink-0">
                {set.map((name, i) => (
                  <span
                    key={`${setIndex}-${i}`}
                    className="mx-6 text-[18px] font-bold text-[var(--text-muted)] whitespace-nowrap"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
