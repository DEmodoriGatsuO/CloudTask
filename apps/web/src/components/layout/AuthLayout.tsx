import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">CloudTask</h1>
          <p className="text-on-surface-variant mt-2">プロジェクト管理ツール</p>
        </div>
        <div className="bg-surface-container-high rounded-[28px] border border-outline-variant p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
