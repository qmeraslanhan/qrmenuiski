import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4f46e5 100%)' }}>
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500 rounded-3xl shadow-2xl mb-6">
          <svg className="w-10 h-10 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-white mb-3">404</h1>
        <h2 className="text-xl font-semibold text-white mb-2">Sayfa Bulunamadı</h2>
        <p className="text-indigo-200 text-sm mb-8 leading-relaxed">
          Aradığınız sayfa silinmiş, taşınmış veya hiç var olmamış olabilir.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-xl transition-colors text-sm"
          >
            Anasayfa
          </Link>
          <Link
            href="/qr-menu"
            className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold rounded-xl transition-colors text-sm"
          >
            Tesisler
          </Link>
        </div>
      </div>
    </main>
  );
}
