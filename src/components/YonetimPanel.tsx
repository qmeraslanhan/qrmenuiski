'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Row = {
  slug: string;
  title: string;
  active: boolean;
  href: string;
  adminHref: string;
  status: string;
};

const TOKEN_KEY = 'iski_portal_admin_token';

export default function YonetimPanel({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState<Row[]>(rows);

  useEffect(() => {
    setToken(sessionStorage.getItem(TOKEN_KEY));
    setReady(true);
  }, []);
  useEffect(() => {
    setList(rows);
  }, [rows]);

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
    setList((l) => l.map((r) => (r.slug === slug ? { ...r, active: next } : r)));
    try {
      const res = await fetch('/api/dashboard/toggle', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug, active: next }),
      });
      if (res.status === 401) {
        logout();
        setError('Oturum süresi doldu, tekrar giriş yapın');
        setList(rows);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'İşlem başarısız');
        setList((l) => l.map((r) => (r.slug === slug ? { ...r, active: !next } : r)));
        return;
      }
      router.refresh();
    } catch {
      setError('Bağlantı hatası');
      setList((l) => l.map((r) => (r.slug === slug ? { ...r, active: !next } : r)));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-[var(--ink-mute)] mb-1">
              İSKİ Portal
            </p>
            <h1 className="serif text-3xl font-medium text-[var(--ink)]">Yönetim Paneli</h1>
          </div>
          <Link href="/" className="shrink-0 text-sm text-[var(--ink-mute)] transition hover:text-[var(--accent)]">
            ← Ana sayfa
          </Link>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {!token ? (
          <form onSubmit={login} className="max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <h2 className="serif text-lg font-medium text-[var(--ink)]">Yönetici Girişi</h2>
            <p className="mb-4 mt-1 text-sm text-[var(--ink-soft)]">
              Devam etmek için portal yönetici şifresini girin.
            </p>
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
              className="mt-3 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Kontrol ediliyor…' : 'Giriş'}
            </button>
          </form>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--ink-soft)]">
                Sistemleri göster/gizle ve her birinin kendi yönetim paneline geç.
              </p>
              <button onClick={logout} className="shrink-0 text-xs text-[var(--ink-mute)] transition hover:text-[var(--ink)]">
                Çıkış
              </button>
            </div>

            <div className="space-y-3">
              {list.map((r) => (
                <div key={r.slug} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[var(--ink)]">{r.title}</h3>
                      <span
                        className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider ${
                          r.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-stone-300 bg-stone-100 text-stone-500'
                        }`}
                      >
                        {r.active ? 'Aktif (görünür)' : 'Pasif (gizli)'}
                      </span>
                    </div>
                    <button
                      role="switch"
                      aria-checked={r.active}
                      disabled={busy}
                      onClick={() => toggle(r.slug, !r.active)}
                      title={r.active ? 'Pasife al (dashboard’dan gizle)' : 'Aktifleştir (dashboard’da göster)'}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                        r.active ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          r.active ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
                    <a
                      href={r.adminHref}
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                    >
                      Yönetim Paneli →
                    </a>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Sistemi Aç
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
