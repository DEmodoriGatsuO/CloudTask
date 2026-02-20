import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label?: string;
  variant?: 'primary' | 'surface' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary: 'bg-primary-container text-on-primary-container hover:shadow-lg',
  surface: 'bg-surface-container-high text-on-surface hover:shadow-lg',
  secondary: 'bg-surface-container-highest text-on-surface hover:shadow-lg',
  tertiary: 'bg-primary-100 text-primary-800 hover:shadow-lg',
};

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'h-14',
};

const iconSizeClasses = {
  sm: '[&>svg]:w-4 [&>svg]:h-4',
  md: '[&>svg]:w-6 [&>svg]:h-6',
  lg: '[&>svg]:w-6 [&>svg]:h-6',
};

export function Fab({ icon, label, variant = 'primary', size = 'md', className = '', ...props }: FabProps) {
  const isExtended = !!label || size === 'lg';

  return (
    <button
      className={`fixed bottom-6 right-6 z-40 inline-flex items-center justify-center gap-2 rounded-lg shadow-md transition-all duration-200 font-medium
        ${variantClasses[variant]}
        ${isExtended ? `${sizeClasses.lg} px-4` : sizeClasses[size]}
        ${iconSizeClasses[size]}
        ${className}`}
      {...props}
    >
      {icon}
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}
