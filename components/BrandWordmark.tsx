/**
 * Protly ブランドのワードマーク
 * 全ページで同じサイズにする
 */

type BrandWordmarkProps = {
  className?: string;
};

export default function BrandWordmark({ className = "" }: BrandWordmarkProps) {
  return (
    <span
      className={`brand-wordmark inline-flex items-baseline text-3xl font-extrabold tracking-[-0.03em] ${className}`}
      aria-label="Protly"
    >
      <span className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 bg-clip-text text-transparent">
        Pro
      </span>
      <span className="text-slate-800">tly</span>
    </span>
  );
}
