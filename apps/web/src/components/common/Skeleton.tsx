interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  className?: string;
}

export function Skeleton({ width, height, variant = 'text', className = '' }: SkeletonProps) {
  const baseClasses = 'bg-surface-container-highest animate-skeleton';

  const variantClasses = {
    text: 'rounded-sm',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-2xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  if (variant === 'text' && !height) style.height = '1em';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-container-low rounded-2xl border border-outline-variant p-5 space-y-3 ${className}`}>
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" width="100%" height={14} />
      <Skeleton variant="text" width="80%" height={14} />
      <div className="flex gap-4 pt-2">
        <Skeleton variant="text" width={60} height={12} />
        <Skeleton variant="text" width={60} height={12} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
      <div className="border-b border-outline-variant px-6 py-3 flex gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="text" width={`${15 + i * 3}%`} height={14} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-outline-variant px-6 py-4 flex gap-4 items-center last:border-b-0">
          <Skeleton variant="text" width="25%" height={14} />
          <Skeleton variant="rounded" width={64} height={24} />
          <Skeleton variant="rounded" width={48} height={24} />
          <Skeleton variant="circular" width={28} height={28} />
          <Skeleton variant="text" width={80} height={14} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="min-w-[280px] bg-surface-container-low rounded-2xl p-4 space-y-3">
          <Skeleton variant="text" width="50%" height={18} />
          {[1, 2, 3].map((card) => (
            <div key={card} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 space-y-2">
              <Skeleton variant="text" width="80%" height={14} />
              <Skeleton variant="text" width="40%" height={12} />
              <div className="flex justify-between items-center pt-1">
                <Skeleton variant="rounded" width={48} height={20} />
                <Skeleton variant="circular" width={24} height={24} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGantt({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
      <div className="flex border-b border-outline-variant">
        <div className="w-64 flex-shrink-0 px-4 py-2 bg-surface-container-low border-r border-outline-variant">
          <Skeleton variant="text" width={60} height={14} />
        </div>
        <div className="flex-1 flex gap-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 px-2 py-2 border-r border-outline-variant/50">
              <Skeleton variant="text" width="70%" height={12} />
            </div>
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex border-b border-outline-variant/30">
          <div className="w-64 flex-shrink-0 px-4 py-2.5 border-r border-outline-variant">
            <Skeleton variant="text" width={`${50 + (i % 3) * 15}%`} height={14} />
          </div>
          <div className="flex-1 relative" style={{ height: 36 }}>
            <div
              className="absolute top-1.5 h-6 rounded-lg"
              style={{ left: `${10 + i * 8}%`, width: `${20 + (i % 4) * 5}%` }}
            >
              <Skeleton variant="rounded" width="100%" height={24} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton variant="text" width="60%" height={28} />
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height={14} />
          <Skeleton variant="text" width="90%" height={14} />
          <Skeleton variant="text" width="70%" height={14} />
        </div>
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-5 space-y-3">
          <Skeleton variant="text" width={120} height={18} />
          <Skeleton variant="text" width="100%" height={60} />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="text" width={80} height={12} />
            <Skeleton variant="rounded" width="100%" height={36} />
          </div>
        ))}
      </div>
    </div>
  );
}
