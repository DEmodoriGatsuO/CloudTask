import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'tonal';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

/**
 * Button コンポーネント
 *
 * デザイン方針 (Material Design 3 / Google準拠):
 *   primary  : Filled Button  — 最重要アクション。shadow で浮遊感
 *   secondary: Outlined Button — 代替アクション。枠線で存在感を保つ
 *   tonal    : Filled Tonal   — 重要度中。Primary container で柔らかく
 *   ghost    : Text Button    — サブアクション。背景なしで軽量
 *   danger   : Error Filled   — 破壊的アクション
 */
const variantClasses = {
  primary:
    'bg-primary-600 text-white shadow-sm shadow-primary-600/25 ' +
    'hover:bg-primary-700 hover:shadow-md hover:shadow-primary-600/30 ' +
    'active:bg-primary-800 active:shadow-sm ' +
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  secondary:
    'bg-surface-container-lowest text-on-surface border border-outline-variant ' +
    'hover:bg-surface-container hover:border-outline ' +
    'active:bg-surface-container-high ' +
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  danger:
    'bg-error text-on-error shadow-sm shadow-error/20 ' +
    'hover:opacity-90 hover:shadow-md hover:shadow-error/25 ' +
    'active:opacity-95 ' +
    'focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2',
  ghost:
    'text-on-surface-variant ' +
    'hover:bg-surface-container-high hover:text-on-surface ' +
    'active:bg-surface-container-highest ' +
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  tonal:
    'bg-primary-container text-on-primary-container ' +
    'hover:brightness-95 ' +
    'active:brightness-90 ' +
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin h-3.5 w-3.5 shrink-0" />}
      {children}
    </button>
  );
}
