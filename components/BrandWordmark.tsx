/**
 * Protly ブランドのワードマーク
 */

type BrandWordmarkProps = {
  /** ホーム用の大きく目立つ表示 */
  size?: "hero" | "sm";
  className?: string;
};

export default function BrandWordmark({
  size = "hero",
  className = "",
}: BrandWordmarkProps) {
  const sizeClass =
    size === "hero"
      ? "text-3xl tracking-[-0.03em] sm:text-4xl"
      : "text-xs tracking-[0.14em]";

  return (
    <span
      className={`brand-wordmark inline-flex items-baseline font-extrabold ${sizeClass} ${className}`}
      aria-label="Protly"
    >
      <span className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 bg-clip-text text-transparent">
        Pro
      </span>
      <span className={size === "hero" ? "text-slate-800" : "text-emerald-700"}>
        tly
      </span>
    </span>
  );
}
