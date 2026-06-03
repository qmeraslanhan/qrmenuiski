import Link from 'next/link';
import { PROJECTS } from '@/lib/projects';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  live: { text: 'Canlı',     cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  beta: { text: 'Beta',      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  soon: { text: 'Yakında',   cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

export default function Dashboard() {
  return (
    <main className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0a0a14 50%, #000 100%)' }}>
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">

        {/* Header */}
        <header className="mb-16 md:mb-24">
          <p className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase mb-4">Portföy</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Ömer Aslanhan
          </h1>
          <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
            Geliştirdiğim projelerin tek noktadan erişim sayfası. Üzerinde çalıştığım her şeyi buradan görebilirsin.
          </p>
        </header>

        {/* Projects Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-slate-400">Projeler</h2>
            <span className="text-xs text-slate-500">{PROJECTS.length} proje</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROJECTS.map((p) => {
              const status = STATUS_LABEL[p.status];
              return (
                <Link
                  key={p.slug}
                  href={p.href}
                  className="group relative rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 p-6 transition-all duration-200 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Accent glow */}
                  <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br ${p.accent} opacity-10 group-hover:opacity-20 blur-3xl transition-opacity`} />

                  {/* Status badge */}
                  <span className={`absolute top-4 right-4 text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full border ${status.cls}`}>
                    {status.text}
                  </span>

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center text-2xl shadow-lg mb-5`}>
                    {p.icon}
                  </div>

                  {/* Title + desc */}
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 line-clamp-3">
                    {p.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span key={t} className="text-[10px] font-medium text-slate-500 bg-white/5 border border-white/5 rounded-md px-2 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Arrow */}
                  <div className="absolute bottom-5 right-5 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-gray-900 group-hover:border-amber-500 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              );
            })}

            {/* Coming soon placeholder */}
            <div className="rounded-2xl border-2 border-dashed border-white/10 p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Yeni proje eklenecek</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Ömer Aslanhan</span>
          <span>omeraslanhan.com</span>
        </footer>
      </div>
    </main>
  );
}
