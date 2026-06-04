// Sayfanın sol üst köşesinde duran "Anasayfa" geri butonu.
// Hem light hem dark temada çalışır.
import Link from 'next/link';

type Props = {
  href?: string;
  label?: string;
  variant?: 'light' | 'dark';
};

export function TopBackButton({
  href = '/',
  label = 'Anasayfa',
  variant = 'light',
}: Props) {
  const darkStyle: React.CSSProperties = {
    background: 'rgba(11, 30, 63, 0.6)',
    border: '1px solid rgba(201, 169, 97, 0.5)',
    color: 'var(--cream, #F5E6CC)',
    backdropFilter: 'blur(8px)',
  };
  const lightStyle: React.CSSProperties = {
    background: 'var(--surface, #FFFFFF)',
    border: '1px solid var(--line, #E5DDD0)',
    color: 'var(--ink, #2D2A26)',
  };

  return (
    <Link
      href={href}
      className="absolute top-6 left-6 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium tracking-wider transition hover:opacity-90 z-10"
      style={variant === 'dark' ? darkStyle : lightStyle}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
