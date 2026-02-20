import { useState } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
} from '../../hooks/useCustomFields';
import type { CustomFieldType, CustomFieldDefinition, CustomFieldDefinitionCreate } from '@cloudtask/shared';

interface CustomFieldManagerProps {
  projectId: string;
}

const FIELD_TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'select', label: '選択' },
];

const FIELD_TYPE_COLORS: Record<CustomFieldType, string> = {
  text: '#3b82f6',
  number: '#8b5cf6',
  date: '#f59e0b',
  select: '#22c55e',
};

interface FormState {
  name: string;
  fieldType: CustomFieldType;
  options: string[];
  required: boolean;
}

const emptyForm: FormState = {
  name: '',
  fieldType: 'text',
  options: [],
  required: false,
};

export function CustomFieldManager({ projectId }: CustomFieldManagerProps) {
  const { data: fieldsRes, isLoading } = useCustomFields(projectId);
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newOption, setNewOption] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fields: CustomFieldDefinition[] = fieldsRes?.data ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEdit(field: CustomFieldDefinition) {
    setEditingId(field.id);
    setForm({
      name: field.name,
      fieldType: field.fieldType,
      options: field.options ? [...field.options] : [],
      required: field.required,
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setNewOption('');
  }

  function addOption() {
    if (!newOption.trim()) return;
    if (form.options.includes(newOption.trim())) return;
    setForm((prev) => ({ ...prev, options: [...prev.options, newOption.trim()] }));
    setNewOption('');
  }

  function removeOption(index: number) {
    setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    const data: CustomFieldDefinitionCreate = {
      name: form.name,
      fieldType: form.fieldType,
      required: form.required,
    };
    if (form.fieldType === 'select' && form.options.length > 0) {
      data.options = form.options;
    }

    if (editingId) {
      await updateField.mutateAsync({ id: editingId, data });
    } else {
      await createField.mutateAsync({ projectId, data });
    }
    closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteField.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">カスタムフィールド</h2>
        <Button onClick={openCreate}>フィールド追加</Button>
      </div>

      {fields.length === 0 ? (
        <EmptyState
          title="カスタムフィールドがありません"
          description="タスクに追加のデータを記録するカスタムフィールドを追加します。"
          action={<Button onClick={openCreate}>フィールド追加</Button>}
        />
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="border border-outline-variant rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-on-surface">{field.name}</h3>
                  <Badge text={field.fieldType} color={FIELD_TYPE_COLORS[field.fieldType]} />
                  {field.required && (
                    <span className="text-xs text-error font-medium">必須</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(field)}>
                    編集
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(field.id)}>
                    削除
                  </Button>
                </div>
              </div>
              {field.fieldType === 'select' && field.options && field.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {field.options.map((opt, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container text-xs text-on-surface-variant">
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingId ? 'カスタムフィールド編集' : 'カスタムフィールド追加'}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>キャンセル</Button>
            <Button
              onClick={handleSubmit}
              loading={createField.isPending || updateField.isPending}
              disabled={!form.name.trim()}
            >
              {editingId ? '更新' : '作成'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="フィールド名"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例: スプリント番号"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-on-surface-variant">フィールドタイプ</label>
            <select
              value={form.fieldType}
              onChange={(e) => setForm((prev) => ({ ...prev, fieldType: e.target.value as CustomFieldType, options: [] }))}
              className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Select options */}
          {form.fieldType === 'select' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-on-surface-variant">選択肢</label>
              {form.options.length > 0 && (
                <div className="space-y-1">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-container-low rounded px-3 py-2">
                      <span className="text-sm text-on-surface-variant">{opt}</span>
                      <button
                        onClick={() => removeOption(i)}
                        className="text-on-surface-variant hover:text-error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <Input
                  label="選択肢の値"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="例: オプションA"
                  onKeyDown={(e) => e.key === 'Enter' && addOption()}
                />
                <Button variant="secondary" onClick={addOption} disabled={!newOption.trim()}>
                  追加
                </Button>
              </div>
            </div>
          )}

          {/* Required checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))}
              className="rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-sm text-on-surface-variant">必須フィールド</span>
          </label>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="カスタムフィールド削除"
        message="このカスタムフィールドを削除しますか？フィールドの値もすべて削除されます。"
        loading={deleteField.isPending}
      />
    </div>
  );
}
