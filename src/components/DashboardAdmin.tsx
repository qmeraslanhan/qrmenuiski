'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SystemRow = { slug: string; title: string; active: boolean };

const TOKEN_KEY = 'iski_portal_admin_token';

export default function DashboardAdmin({ systems }: { systems: SystemRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Anlık UI geri bildirimi için yerel durum kopyası
  const [rows, setRows] = useState<SystemRow[]>(systems);

  useEffect(() => {
    setToken(sessionStorage.getItem(TOKEN_KEY));
  }, []);
  useEffect(() => {
    setRows(systems);
  }, [systems]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Giriş başarısız');
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword('');
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  async function toggle(slug: string, next: boolean) {
    setBusy(true);
    setError('');
    // İyimser güncelleme
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, active: next } : r)));
    try {
      const res = await fetch('/api/dashboard/toggle', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, active: next }),
      });
      if (res.status === 401) {
        logout();
        setError('Oturum süresi doldu, tekrar giriş yapın');
        setRows(systems);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'İşlem başarısız');
        setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, active: !next } : r)));
        return;
      }
      router.refresh(); // sunucu kartlarını yeni duruma göre yeniden render et
    } catch {
      setError('Bağlantı hatası');
      setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, active: !next } : r)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Gizli yönetici tetikleyici */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Yönetici"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-mute)] shadow-sm transition hover:text-[var(--accent)] hover:border-[var(--accent)]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a2.25 2.25 0 012.25 2.25v6A2.25 2.25 0 0116.5 21h-9A2.25 2.25 0 015.25 18.75v-6a2.25 2.25 0 012.25-2.25z" />
        </svg>
        Yönetici
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="serif text-xl font-medium text-[var(--ink)]">
                {token ? 'Sistem Yönetimi' : 'Yönetici Girişi'}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="text-[var(--ink-mute)] hover:text-[var(--ink)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {!token ? (
              <form onSubmit={login} className="space-y-3">
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yönetici şifresi"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={busy || !password}
                  className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Kontrol ediliyor…' : 'Giriş'}
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                {rows.map((s) => (
                  <div
                    key={s.slug}
                    className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2.5"
                  >
                    <span className="text-sm font-medium text-[var(--ink)]">{s.title}</span>
                    <button
                      role="switch"
                      aria-checked={s.active}
                      disabled={busy}
                      onClick={() => toggle(s.slug, !s.active)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                        s.active ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          s.active ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
                <button
                  onClick={logout}
                  className="mt-3 w-full rounded-lg border border-[var(--line)] px-4 py-2 text-xs text-[var(--ink-mute)] transition hover:text-[var(--ink)]"
                >
                  Çıkış yap
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
