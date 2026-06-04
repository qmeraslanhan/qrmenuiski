import Link from 'next/link';
import { PROJECTS } from '@/lib/projects';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  live: { text: 'Aktif',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  beta: { text: 'Beta',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  soon: { text: 'Yakında', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
};

function ProjectIcon({ id }: { id: string }) {
  // Inline SVG ikonlar — kurumsal görünüm için emoji yerine
  const common = 'w-6 h-6 text-[var(--accent)]';
  switch (id) {
    case 'qr':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
        </svg>
      );
    default:
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
  }
}

// Deterministic drop positions (SSR-safe — no Math.random at render time)
const DROPS = [
  { x:  4, size: 1.0, delay:  0.0, duration: 13 },
  { x: 12, size: 0.7, delay:  4.2, duration: 15 },
  { x: 19, size: 1.3, delay:  1.5, duration: 11 },
  { x: 27, size: 0.9, delay:  6.8, duration: 14 },
  { x: 34, size: 1.1, delay:  2.7, duration: 12 },
  { x: 42, size: 0.8, delay:  8.0, duration: 16 },
  { x: 49, size: 1.4, delay:  3.5, duration: 10 },
  { x: 57, size: 0.9, delay:  5.5, duration: 13 },
  { x: 64, size: 1.0, delay:  9.5, duration: 12 },
  { x: 71, size: 1.2, delay:  1.2, duration: 14 },
  { x: 79, size: 0.7, delay:  7.4, duration: 15 },
  { x: 86, size: 1.1, delay:  3.0, duration: 11 },
  { x: 93, size: 0.9, delay:  6.0, duration: 13 },
  { x: 16, size: 0.6, delay: 10.0, duration: 17 },
  { x: 38, size: 1.5, delay:  4.8, duration:  9 },
  { x: 60, size: 0.8, delay:  8.6, duration: 14 },
  { x: 82, size: 1.0, delay:  2.2, duration: 12 },
  { x:  8, size: 1.2, delay:  5.0, duration: 11 },
];

// Sparse ripple landing points
const RIPPLES = [
  { x: 18, delay: 0.5 },
  { x: 47, delay: 2.0 },
  { x: 73, delay: 3.5 },
];

export default function Dashboard() {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Subtle background ornament */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none anim-fade-in"
        style={{
          background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 60%)',
        }}
      />

      {/* Water drops — İSKİ teması, atmospheric */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {DROPS.map((d, i) => (
          <span
            key={`d-${i}`}
            className="drop"
            style={{
              left: `${d.x}%`,
              width: `${d.size * 7}px`,
              height: `${d.size * 11}px`,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.duration}s`,
            }}
          />
        ))}
        {RIPPLES.map((r, i) => (
          <span
            key={`r-${i}`}
            className="ripple"
            style={{
              left: `${r.x}%`,
              animationDelay: `${r.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-5xl mx-auto px-6 pt-8 md:pt-10 pb-14 md:pb-20">

        {/* Logos */}
        <div className="flex items-center justify-center gap-10 md:gap-14 mb-8 md:mb-10 anim-fade-up d-0">
          <img
            src="/img/iski-logo.png"
            alt="İSKİ"
            className="logo-img h-14 md:h-16 w-auto object-contain"
          />
          <div className="h-10 w-px bg-[var(--line-strong)]" />
          <img
            src="/img/ibb-mavi.png"
            alt="İBB"
            className="logo-img h-14 md:h-16 w-auto object-contain"
          />
        </div>

        {/* Header */}
        <header className="text-center mb-10 md:mb-14">
          <p className="anim-fade-up d-1 text-[11px] md:text-xs font-semibold tracking-[0.35em] uppercase text-[var(--ink-mute)] mb-4">
            İSKİ Sosyal İşler Şube Müdürlüğü
          </p>
          <h1 className="anim-fade-up d-2 serif text-3xl md:text-5xl font-medium text-[var(--ink)] mb-4 leading-[1.1]">
            Dijital Hizmetler{' '}
            <span className="italic font-normal text-[var(--accent)]">Portalı</span>
          </h1>
          <p className="anim-fade-up d-3 text-sm md:text-base text-[var(--ink-soft)] max-w-xl mx-auto leading-relaxed">
            Şube müdürlüğümüz bünyesindeki tesisler ve operasyonel sistemler için merkezi erişim noktası.
          </p>
        </header>

        {/* Divider */}
        <div className="divider mb-10 md:mb-12 anim-fade-up d-3" />

        {/* Projects */}
        <section>
          <div className="flex items-baseline justify-between mb-7 anim-fade-up d-4">
            <h2 className="text-xs font-semibold tracking-[0.25em] uppercase text-[var(--ink-mute)]">
              Sistemler
            </h2>
            <span className="text-xs text-[var(--ink-mute)]">
              {PROJECTS.length} aktif sistem
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROJECTS.map((p, idx) => {
              const status = STATUS_LABEL[p.status];
              return (
                <Link
                  key={p.slug}
                  href={p.href}
                  className={`group lift relative rounded-2xl bg-[var(--surface)] border border-[var(--line)] p-7 anim-fade-up d-${5 + idx}`}
                  style={{ animationDelay: `${400 + idx * 80}ms` }}
                >
                  {/* Status badge */}
                  <span className={`absolute top-5 right-5 text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full border ${status.cls}`}>
                    {status.text}
                  </span>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center mb-6 border border-[var(--line)]">
                    <ProjectIcon id={p.icon} />
                  </div>

                  {/* Title + desc */}
                  <h3 className="serif text-2xl font-medium text-[var(--ink)] mb-3 leading-tight">
                    {p.title}
                  </h3>
                  <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-6">
                    {p.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium text-[var(--ink-mute)] bg-[var(--bg-soft)] border border-[var(--line)] rounded-md px-2 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* CTA arrow */}
                  <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[var(--line)] text-sm font-medium text-[var(--accent)]">
                    <span>Sisteme Git</span>
                    <svg
                      className="magnet-arrow w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              );
            })}

            {/* Coming soon placeholder */}
            <div
              className="anim-fade-up rounded-2xl border-2 border-dashed border-[var(--line-strong)] p-7 flex flex-col items-center justify-center text-center min-h-[260px]"
              style={{ animationDelay: `${400 + PROJECTS.length * 80}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-soft)] flex items-center justify-center text-[var(--ink-mute)] mb-3 border border-[var(--line)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-[var(--ink-mute)] mb-1">Yeni sistem yakında</p>
              <p className="text-xs text-[var(--ink-mute)]/70">Geliştirilmekte olan modüller</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-[var(--line)] anim-fade-up" style={{ animationDelay: '700ms' }}>
          <div className="text-center text-xs text-[var(--ink-mute)]">
            © {year} İSKİ Sosyal İşler Şube Müdürlüğü
          </div>
        </footer>
      </div>
    </main>
  );
}
