// Tüm portal sayfalarında kullanılabilen standart footer:
// © İSKİ Sosyal İşler Şube Müdürlüğü + opsiyonel butonlar.
import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  year?: number;
  children?: ReactNode; // ek butonlar / linkler
};

export function PortalFooter({ year, children }: Props) {
  const y = year ?? new Date().getFullYear();
  return (
    <footer className="mt-20 pt-8 border-t border-[var(--line)]">
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-5">
          {children}
        </div>
      )}
      <div className="text-center text-xs text-[var(--ink-mute)]">
        © {y} İSKİ Sosyal İşler Şube Müdürlüğü
      </div>
    </footer>
  );
}

// Kullanışlı bir buton component — footer'a koymak için
export function PortalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--line-strong)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition"
    >
      {children}
    </Link>
  );
}
