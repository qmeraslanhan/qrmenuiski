'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Settings = {
  portal_label: string;
  portal_title: string;
  portal_title_accent: string;
  portal_subtitle: string;
  footer_text: string;
  accent_color: string;
};

type RowIn = {
  slug: string;
  href: string;
  adminHref: string;
  active: boolean;
  title: string;
  description: string;
  tags: string[];
  status: string;
  sort_order: number;
  def: { title: string; description: string; tags: string[]; status: string };
};

type EditRow = Omit<RowIn, 'tags'> & { tags: string }; // tags düzenlemede virgüllü metin

const TOKEN_KEY = 'iski_portal_admin_token';
const STATUS_OPTS = [
  { v: 'live', l: 'Aktif' },
  { v: 'beta', l: 'Beta' },
  { v: 'soon', l: 'Yakında' },
];

const toEdit = (r: RowIn): EditRow => ({ ...r, tags: (r.tags || []).join(', ') });

export default function YonetimPanel({ settings: settingsIn, rows }: { settings: Settings; rows: RowIn[] }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [settings, setSettings] = useState<Settings>(settingsIn);
  const [list, setList] = useState<EditRow[]>(() => rows.map(toEdit));

  useEffect(() => { setToken(sessionStorage.getItem(TOKEN_KEY)); setReady(true); }, []);
  useEffect(() => { setSettings(settingsIn); }, [settingsIn]);
  useEffect(() => { setList(rows.map(toEdit)); }, [rows]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/dashboard/login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Giriş başarısız'); return; }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token); setPassword('');
    } catch { setError('Bağlantı hatası'); }
    finally { setBusy(false); }
  }

  function logout() { sessionStorage.removeItem(TOKEN_KEY); setToken(null); }

  function setField(slug: string, key: keyof EditRow, value: any) {
    setList((l) => l.map((r) => (r.slug === slug ? { ...r, [key]: value } : r)));
    setOkMsg('');
  }
  function setSetting(key: keyof Settings, value: string) {
    setSettings((s) => ({ ...s, [key]: value })); setOkMsg('');
  }
  function move(i: number, dir: -1 | 1) {
    setList((l) => {
      const n = [...l];
      const j = i + dir;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setOkMsg('');
  }

  // Aktif/pasif anında uygulanır (içerik kaydından bağımsız)
  async function toggleActive(slug: string, next: boolean) {
    setBusy(true); setError('');
    setList((l) => l.map((r) => (r.slug === slug ? { ...r, active: next } : r)));
    try {
      const res = await fetch('/api/dashboard/toggle', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug, active: next }),
      });
      if (res.status === 401) { logout(); setError('Oturum süresi doldu, tekrar giriş yapın'); return; }
      if (!res.ok) {
        setList((l) => l.map((r) => (r.slug === slug ? { ...r, active: !next } : r)));
        setError('İşlem başarısız');
        return;
      }
      router.refresh();
    } catch {
      setList((l) => l.map((r) => (r.slug === slug ? { ...r, active: !next } : r)));
      setError('Bağlantı hatası');
    } finally { setBusy(false); }
  }

  async function saveAll() {
    setBusy(true); setError(''); setOkMsg('');
    try {
      const projects = list.map((r, i) => ({
        slug: r.slug,
        is_active: r.active,
        title: r.title,
        description: r.description,
        tags: r.tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: r.status,
        sort_order: i,
      }));
      const res = await fetch('/api/dashboard/content', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings, projects }),
      });
      if (res.status === 401) { logout(); setError('Oturum süresi doldu, tekrar giriş yapın'); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Kaydetme başarısız'); return; }
      setOkMsg('Kaydedildi ✓');
      router.refresh();
    } catch { setError('Bağlantı hatası'); }
    finally { setBusy(false); }
  }

  if (!ready) return null;

  const inputCls =
    'w-full rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]';
  const labelCls = 'block text-xs font-medium text-[var(--ink-mute)] mb-1';

  return (
    <main className="min-h-screen" style={{ '--accent': settings.accent_color } as unknown as CSSProperties}>
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--ink-mute)]">İSKİ Portal</p>
            <h1 className="serif text-3xl font-medium text-[var(--ink)]">Yönetim Paneli</h1>
          </div>
          <Link href="/" className="shrink-0 text-sm text-[var(--ink-mute)] transition hover:text-[var(--accent)]">← Ana sayfa</Link>
        </div>

        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!token ? (
          <form onSubmit={login} className="max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <h2 className="serif text-lg font-medium text-[var(--ink)]">Yönetici Girişi</h2>
            <p className="mb-4 mt-1 text-sm text-[var(--ink-soft)]">Devam etmek için portal yönetici şifresini girin.</p>
            <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Yönetici şifresi" className={inputCls} />
            <button type="submit" disabled={busy || !password} className="mt-3 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
              {busy ? 'Kontrol ediliyor…' : 'Giriş'}
            </button>
          </form>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--ink-soft)]">Dashboard içeriğini, görünümünü ve sistem sıralamasını düzenle.</p>
              <button onClick={logout} className="shrink-0 text-xs text-[var(--ink-mute)] transition hover:text-[var(--ink)]">Çıkış</button>
            </div>

            {/* Portal görünümü */}
            <section className="mb-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <h2 className="serif mb-4 text-lg font-medium text-[var(--ink)]">Portal Görünümü</h2>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Üst etiket</label>
                  <input className={inputCls} value={settings.portal_label} onChange={(e) => setSetting('portal_label', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Başlık</label>
                    <input className={inputCls} value={settings.portal_title} onChange={(e) => setSetting('portal_title', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Vurgulu kelime</label>
                    <input className={inputCls} value={settings.portal_title_accent} onChange={(e) => setSetting('portal_title_accent', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Açıklama</label>
                  <textarea rows={2} className={inputCls} value={settings.portal_subtitle} onChange={(e) => setSetting('portal_subtitle', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Footer metni (© yıl otomatik eklenir)</label>
                  <input className={inputCls} value={settings.footer_text} onChange={(e) => setSetting('footer_text', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Vurgu rengi</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(settings.accent_color) ? settings.accent_color : '#0F4C81'} onChange={(e) => setSetting('accent_color', e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-transparent" />
                    <input className={`${inputCls} max-w-[140px] font-mono`} value={settings.accent_color} onChange={(e) => setSetting('accent_color', e.target.value)} placeholder="#0F4C81" />
                    <span className="text-xs text-[var(--ink-mute)]">#RRGGBB</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Sistemler */}
            <section className="mb-24">
              <h2 className="serif mb-3 text-lg font-medium text-[var(--ink)]">Sistemler</h2>
              <div className="space-y-3">
                {list.map((r, i) => (
                  <div key={r.slug} className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 ${r.active ? '' : 'opacity-70'}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => move(i, -1)} disabled={i === 0} title="Yukarı taşı" className="rounded border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-mute)] disabled:opacity-30 hover:text-[var(--accent)]">↑</button>
                        <button onClick={() => move(i, 1)} disabled={i === list.length - 1} title="Aşağı taşı" className="rounded border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-mute)] disabled:opacity-30 hover:text-[var(--accent)]">↓</button>
                        <span className="ml-2 text-xs font-mono text-[var(--ink-mute)]">{r.slug}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${r.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-300 bg-stone-100 text-stone-500'}`}>{r.active ? 'Görünür' : 'Gizli'}</span>
                        <button role="switch" aria-checked={r.active} disabled={busy} onClick={() => toggleActive(r.slug, !r.active)} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${r.active ? 'bg-emerald-500' : 'bg-stone-300'}`}>
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.active ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Başlık</label>
                          <input className={inputCls} value={r.title} placeholder={r.def.title} onChange={(e) => setField(r.slug, 'title', e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls}>Durum rozeti</label>
                          <select className={inputCls} value={STATUS_OPTS.some((o) => o.v === r.status) ? r.status : r.def.status} onChange={(e) => setField(r.slug, 'status', e.target.value)}>
                            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Açıklama</label>
                        <textarea rows={2} className={inputCls} value={r.description} placeholder={r.def.description} onChange={(e) => setField(r.slug, 'description', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>Etiketler (virgülle ayır)</label>
                        <input className={inputCls} value={r.tags} placeholder={r.def.tags.join(', ')} onChange={(e) => setField(r.slug, 'tags', e.target.value)} />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
                      <a href={r.adminHref} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90">Yönetim Paneli →</a>
                      <a href={r.href} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">Sistemi Aç</a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Sabit kaydet çubuğu */}
            <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
                <span className="text-xs text-[var(--ink-mute)]">{okMsg || 'Değişiklikler kaydedilince ana sayfaya yansır.'}</span>
                <button onClick={saveAll} disabled={busy} className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                  {busy ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
