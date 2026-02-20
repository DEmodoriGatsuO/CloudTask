import { useState } from 'react';
import { X, Trash2, Copy } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import {
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useCreateProjectFromTemplate,
} from '../../hooks/useTemplates';
import type { ProjectTemplateCreate, ProjectTemplate } from '@cloudtask/shared';

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

const STATUS_OPTIONS = [
  { value: 'todo', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'done', label: '完了' },
  { value: 'completed', label: '完了済' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

interface TemplateTask {
  title: string;
  description?: string;
  status: string;
  priority: string;
}

interface TemplateLabel {
  name: string;
  color: string;
}

interface FormState {
  name: string;
  description: string;
  projectName: string;
  tasks: TemplateTask[];
  labels: TemplateLabel[];
}

const emptyForm: FormState = {
  name: '',
  description: '',
  projectName: '',
  tasks: [],
  labels: [],
};

export function TemplateManager() {
  const { data: templatesRes, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const createFromTemplate = useCreateProjectFromTemplate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Task form fields
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  // Label form fields
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

  const templates: ProjectTemplate[] = templatesRes?.data ?? [];

  function openCreate() {
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setForm(emptyForm);
    resetTaskFields();
    resetLabelFields();
  }

  function resetTaskFields() {
    setNewTaskTitle('');
    setNewTaskStatus('todo');
    setNewTaskPriority('medium');
  }

  function resetLabelFields() {
    setNewLabelName('');
    setNewLabelColor('#3b82f6');
  }

  function addTask() {
    if (!newTaskTitle.trim()) return;
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { title: newTaskTitle.trim(), status: newTaskStatus, priority: newTaskPriority }],
    }));
    resetTaskFields();
  }

  function removeTask(index: number) {
    setForm((prev) => ({ ...prev, tasks: prev.tasks.filter((_, i) => i !== index) }));
  }

  function addLabel() {
    if (!newLabelName.trim()) return;
    if (form.labels.some((l) => l.name === newLabelName.trim())) return;
    setForm((prev) => ({
      ...prev,
      labels: [...prev.labels, { name: newLabelName.trim(), color: newLabelColor }],
    }));
    resetLabelFields();
  }

  function removeLabel(index: number) {
    setForm((prev) => ({ ...prev, labels: prev.labels.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    const data: ProjectTemplateCreate = {
      name: form.name,
      description: form.description || undefined,
      templateData: {
        projectName: form.projectName || form.name,
        tasks: form.tasks,
        labels: form.labels,
      },
    };
    await createTemplate.mutateAsync(data);
    closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteTemplate.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  }

  async function handleUseTemplate(templateId: string) {
    await createFromTemplate.mutateAsync(templateId);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">プロジェクトテンプレート</h2>
        <Button onClick={openCreate}>テンプレート作成</Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="テンプレートがありません"
          description="タスクやラベルを事前定義したテンプレートでプロジェクトを素早く作成できます。"
          action={<Button onClick={openCreate}>テンプレート作成</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="border border-outline-variant rounded-xl p-4 space-y-3">
              <div>
                <h3 className="font-medium text-on-surface">{template.name}</h3>
                {template.description && (
                  <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">{template.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span>{template.templateData.tasks.length} タスク</span>
                <span>{template.templateData.labels.length} ラベル</span>
              </div>

              {template.templateData.labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.templateData.labels.slice(0, 5).map((label, i) => (
                    <Badge key={i} text={label.name} color={label.color} />
                  ))}
                  {template.templateData.labels.length > 5 && (
                    <span className="text-xs text-on-surface-variant">+{template.templateData.labels.length - 5} 件</span>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template.id)}
                  loading={createFromTemplate.isPending}
                >
                  テンプレートを使用
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTarget(template.id)}
                >
                  削除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title="テンプレート作成"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>キャンセル</Button>
            <Button
              onClick={handleSubmit}
              loading={createTemplate.isPending}
              disabled={!form.name.trim()}
            >
              テンプレート作成
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Basic info */}
          <Input
            label="テンプレート名"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例: マーケティングキャンペーン"
          />
          <Input
            label="説明"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="テンプレートの簡単な説明"
          />

          {/* Template data section */}
          <div className="border-t border-outline-variant pt-4 space-y-4">
            <h4 className="text-sm font-medium text-on-surface">テンプレートデータ</h4>

            <Input
              label="プロジェクト名"
              value={form.projectName}
              onChange={(e) => setForm((prev) => ({ ...prev, projectName: e.target.value }))}
              placeholder="テンプレート使用時のデフォルトプロジェクト名"
            />
          </div>

          {/* Tasks section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-on-surface-variant">タスク</label>
            {form.tasks.length > 0 && (
              <div className="space-y-1">
                {form.tasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface-container-low rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-on-surface-variant">{task.title}</span>
                      <Badge
                        text={STATUS_OPTIONS.find((s) => s.value === task.status)?.label ?? task.status}
                        color="#6b7280"
                      />
                      <Badge
                        text={task.priority}
                        color={PRIORITY_COLORS[task.priority] ?? '#6b7280'}
                      />
                    </div>
                    <button
                      onClick={() => removeTask(i)}
                      className="text-on-surface-variant hover:text-error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="タスク名"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="例: プロジェクト概要の作成"
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-on-surface-variant">ステータス</label>
                <select
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value)}
                  className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-on-surface-variant">優先度</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <Button variant="secondary" onClick={addTask} disabled={!newTaskTitle.trim()}>
                追加
              </Button>
            </div>
          </div>

          {/* Labels section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-on-surface-variant">ラベル</label>
            {form.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.labels.map((label, i) => (
                  <div key={i} className="flex items-center gap-1 bg-surface-container rounded-full pl-1 pr-2 py-1">
                    <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: label.color }} />
                    <span className="text-sm text-on-surface-variant">{label.name}</span>
                    <button
                      onClick={() => removeLabel(i)}
                      className="ml-1 text-on-surface-variant hover:text-error"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <Input
                label="ラベル名"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="例: デザイン"
                onKeyDown={(e) => e.key === 'Enter' && addLabel()}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-on-surface-variant">カラー</label>
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-[38px] w-12 rounded-xl border border-outline-variant cursor-pointer"
                />
              </div>
              <Button variant="secondary" onClick={addLabel} disabled={!newLabelName.trim()}>
                追加
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="テンプレート削除"
        message="このテンプレートを削除しますか？この操作は取り消せません。"
        loading={deleteTemplate.isPending}
      />
    </div>
  );
}
