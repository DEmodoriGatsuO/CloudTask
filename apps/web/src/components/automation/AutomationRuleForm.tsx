import { useState } from 'react';
import { ArrowRight, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import {
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  useToggleAutomation,
} from '../../hooks/useAutomations';
import type { AutomationRule } from '../../api/automations';

interface AutomationRuleFormProps {
  projectId: string;
}

const TRIGGER_TYPES = [
  { value: 'status_change', label: 'ステータス変更' },
  { value: 'due_date_passed', label: '期限超過' },
  { value: 'task_created', label: 'タスク作成' },
  { value: 'assignment_change', label: '担当者変更' },
];

const ACTION_TYPES = [
  { value: 'assign_user', label: 'ユーザー割当' },
  { value: 'change_status', label: 'ステータス変更' },
  { value: 'add_label', label: 'ラベル追加' },
  { value: 'send_notification', label: '通知送信' },
];

const TRIGGER_BADGE_COLORS: Record<string, string> = {
  status_change: '#3b82f6',
  due_date_passed: '#ef4444',
  task_created: '#22c55e',
  assignment_change: '#f59e0b',
};

const ACTION_BADGE_COLORS: Record<string, string> = {
  assign_user: '#8b5cf6',
  change_status: '#06b6d4',
  add_label: '#ec4899',
  send_notification: '#f97316',
};

interface FormState {
  name: string;
  triggerType: string;
  triggerConfig: Record<string, string>;
  actionType: string;
  actionConfig: Record<string, string>;
}

const emptyForm: FormState = {
  name: '',
  triggerType: 'status_change',
  triggerConfig: {},
  actionType: 'assign_user',
  actionConfig: {},
};

function getTriggerConfigFields(triggerType: string): { key: string; label: string; placeholder: string }[] {
  switch (triggerType) {
    case 'status_change':
      return [
        { key: 'fromStatus', label: '変更前ステータス', placeholder: '例: todo' },
        { key: 'toStatus', label: '変更後ステータス', placeholder: '例: in_progress' },
      ];
    case 'due_date_passed':
      return [
        { key: 'daysBefore', label: '期限の何日前', placeholder: '例: 1' },
      ];
    case 'task_created':
      return [
        { key: 'priority', label: '優先度フィルター', placeholder: '例: high（任意）' },
      ];
    case 'assignment_change':
      return [
        { key: 'userId', label: 'ユーザーIDフィルター', placeholder: 'ユーザーID（任意）' },
      ];
    default:
      return [];
  }
}

function getActionConfigFields(actionType: string): { key: string; label: string; placeholder: string }[] {
  switch (actionType) {
    case 'assign_user':
      return [
        { key: 'userId', label: '割当先ユーザーID', placeholder: 'ユーザーID' },
      ];
    case 'change_status':
      return [
        { key: 'status', label: '新しいステータス', placeholder: '例: in_progress' },
      ];
    case 'add_label':
      return [
        { key: 'labelId', label: 'ラベルID', placeholder: 'ラベルID' },
      ];
    case 'send_notification':
      return [
        { key: 'message', label: '通知メッセージ', placeholder: '通知テキスト' },
      ];
    default:
      return [];
  }
}

function getTriggerLabel(type: string): string {
  return TRIGGER_TYPES.find((t) => t.value === type)?.label ?? type;
}

function getActionLabel(type: string): string {
  return ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
}

export function AutomationRuleForm({ projectId }: AutomationRuleFormProps) {
  const { data: automationsRes, isLoading } = useAutomations(projectId);
  const createAutomation = useCreateAutomation();
  const deleteAutomation = useDeleteAutomation();
  const toggleAutomation = useToggleAutomation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const automations: AutomationRule[] = automationsRes?.data ?? [];

  function openCreate() {
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setForm(emptyForm);
  }

  function updateTriggerConfig(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      triggerConfig: { ...prev.triggerConfig, [key]: value },
    }));
  }

  function updateActionConfig(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      actionConfig: { ...prev.actionConfig, [key]: value },
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    await createAutomation.mutateAsync({
      projectId,
      data: {
        name: form.name,
        triggerType: form.triggerType,
        triggerConfig: form.triggerConfig,
        actionType: form.actionType,
        actionConfig: form.actionConfig,
      },
    });
    closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteAutomation.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  }

  async function handleToggle(rule: AutomationRule) {
    await toggleAutomation.mutateAsync({ id: rule.id, isActive: !rule.isActive });
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">自動化ルール</h2>
        <Button onClick={openCreate}>新規ルール</Button>
      </div>

      {automations.length === 0 ? (
        <EmptyState
          title="自動化ルールがありません"
          description="ワークフローを効率化する自動化ルールを作成します。"
          action={<Button onClick={openCreate}>ルール作成</Button>}
        />
      ) : (
        <div className="space-y-3">
          {automations.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-xl p-4 transition-colors ${
                rule.isActive ? 'border-outline-variant bg-surface' : 'border-outline-variant bg-surface-container-low'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className={`font-medium ${rule.isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {rule.name}
                  </h3>
                  <Badge
                    text={getTriggerLabel(rule.triggerType)}
                    color={TRIGGER_BADGE_COLORS[rule.triggerType] ?? '#6b7280'}
                  />
                  <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                  <Badge
                    text={getActionLabel(rule.actionType)}
                    color={ACTION_BADGE_COLORS[rule.actionType] ?? '#6b7280'}
                  />
                </div>
                <div className="flex items-center gap-3">
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rule.isActive ? 'bg-primary-600' : 'bg-surface-container-highest'
                    }`}
                    disabled={toggleAutomation.isPending}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${
                        rule.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(rule.id)}>
                    削除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title="新規自動化ルール"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>キャンセル</Button>
            <Button
              onClick={handleSubmit}
              loading={createAutomation.isPending}
              disabled={!form.name.trim()}
            >
              ルール作成
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="ルール名"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例: 作成時に自動割当"
          />

          {/* Trigger type */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-on-surface-variant">トリガータイプ</label>
            <select
              value={form.triggerType}
              onChange={(e) => setForm((prev) => ({ ...prev, triggerType: e.target.value, triggerConfig: {} }))}
              className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Trigger config fields */}
          {getTriggerConfigFields(form.triggerType).length > 0 && (
            <div className="space-y-3 pl-4 border-l-2 border-outline-variant">
              <p className="text-xs font-medium text-on-surface-variant uppercase">トリガー設定</p>
              {getTriggerConfigFields(form.triggerType).map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  value={form.triggerConfig[field.key] ?? ''}
                  onChange={(e) => updateTriggerConfig(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              ))}
            </div>
          )}

          {/* Action type */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-on-surface-variant">アクションタイプ</label>
            <select
              value={form.actionType}
              onChange={(e) => setForm((prev) => ({ ...prev, actionType: e.target.value, actionConfig: {} }))}
              className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Action config fields */}
          {getActionConfigFields(form.actionType).length > 0 && (
            <div className="space-y-3 pl-4 border-l-2 border-outline-variant">
              <p className="text-xs font-medium text-on-surface-variant uppercase">アクション設定</p>
              {getActionConfigFields(form.actionType).map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  value={form.actionConfig[field.key] ?? ''}
                  onChange={(e) => updateActionConfig(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="自動化ルール削除"
        message="この自動化ルールを削除しますか？この操作は取り消せません。"
        loading={deleteAutomation.isPending}
      />
    </div>
  );
}
