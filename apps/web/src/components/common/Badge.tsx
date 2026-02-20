/**
 * Badge / Chip コンポーネント
 *
 * デザイン方針 (Material Design 3 / Figma Chip 準拠):
 *   solid  : 薄いトーン背景（color の 15% opacity）+ 濃い文字色（color 自身）
 *            → コントラスト比を確保しつつ、白文字ベタ塗りより柔らかい印象
 *   outline: 透明背景 + color でボーダー & 文字
 */
interface BadgeProps {
  text: string;
  color?: string;
  variant?: 'solid' | 'outline';
}

/** hex カラーを rgba に変換するユーティリティ */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(99,102,241,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function Badge({ text, color = '#4f46e5', variant = 'solid' }: BadgeProps) {
  if (variant === 'outline') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border"
        style={{ borderColor: color, color }}
      >
        {text}
      </span>
    );
  }

  // solid: 薄い背景 (15% opacity) + 文字色はカラー自身
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{
        backgroundColor: hexToRgba(color, 0.12),
        color,
      }}
    >
      {text}
    </span>
  );
}
