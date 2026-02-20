import { TemplateManager } from '../components/templates/TemplateManager';

export function TemplatesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">プロジェクトテンプレート</h1>
        <p className="text-sm text-on-surface-variant mt-1">再利用可能なプロジェクトテンプレートの作成と管理</p>
      </div>
      <TemplateManager />
    </div>
  );
}
