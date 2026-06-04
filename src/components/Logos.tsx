// İSKİ + İBB kurumsal logo bloğu.
// Light theme (cream bg) için default; dark theme için variant="dark" — beyaz invert filter uygular.
type Props = {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_CLS: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-10 md:h-12',
  md: 'h-12 md:h-14',
  lg: 'h-14 md:h-16',
};

export function Logos({ variant = 'light', size = 'lg' }: Props) {
  const imgCls = `${SIZE_CLS[size]} w-auto object-contain logo-img${variant === 'dark' ? ' logo-white' : ''}`;
  const dividerCls =
    variant === 'dark'
      ? 'h-10 w-px bg-amber-200/40'
      : 'h-10 w-px bg-[var(--line-strong)]';

  return (
    <div className="flex items-center justify-center gap-10 md:gap-14">
      <img src="/img/iski-logo.png" alt="İSKİ" className={imgCls} />
      <div className={dividerCls} />
      <img src="/img/ibb-mavi.png" alt="İBB" className={imgCls} />
    </div>
  );
}
