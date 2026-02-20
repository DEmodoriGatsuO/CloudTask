import { useState } from 'react';
import { nanoid } from 'nanoid';
import { ArrowRight, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SkeletonCard } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import { useWorkflows, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow } from '../../hooks/useWorkflows';
import type { WorkflowStatus, WorkflowTransition, WorkflowCreate, WorkflowUpdate, Workflow } from '@cloudtask/shared';

interface WorkflowEditorProps {
  projectId: string;
}

interface WorkflowFormState {
  name: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
}

const emptyForm: WorkflowFormState = {
  name: '',
  statuses: [],
  transitions: [],
};

export function WorkflowEditor({ projectId }: WorkflowEditorProps) {
  const { data: workflowsRes, isLoading } = useWorkflows(projectId);
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkflowFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  const [transFrom, setTransFrom] = useState('');
  const [transTo, setTransTo] = useState('');

  const workflows = workflowsRes?.data ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEdit(wf: Workflow) {
    setEditingId(wf.id);
    setForm({
      name: wf.name,
      statuses: [...wf.statuses],
      transitions: [...wf.transitions],
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setNewStatusName('');
    setNewStatusColor('#3b82f6');
    setTransFrom('');
    setTransTo('');
  }

  function addStatus() {
    if (!newStatusName.trim()) return;
    setForm((prev) => ({
      ...prev,
      statuses: [...prev.statuses, { id: nanoid(10), name: newStatusName.trim(), color: newStatusColor }],
    }));
    setNewStatusName('');
    setNewStatusColor('#3b82f6');
  }

  function removeStatus(statusId: string) {
    setForm((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s.id !== statusId),
      transitions: prev.transitions.filter((t) => t.from !== statusId && t.to !== statusId),
    }));
  }

  function addTransition() {
    if (!transFrom || !transTo || transFrom === transTo) return;
    const exists = form.transitions.some((t) => t.from === transFrom && t.to === transTo);
    if (exists) return;
    setForm((prev) => ({
      ...prev,
      transitions: [...prev.transitions, { from: transFrom, to: transTo }],
    }));
    setTransFrom('');
    setTransTo('');
  }

  function removeTransition(index: number) {
    setForm((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    if (editingId) {
      const data: WorkflowUpdate = {
        name: form.name,
        statuses: form.statuses,
        transitions: form.transitions,
      };
      await updateWorkflow.mutateAsync({ id: editingId, data });
    } else {
      const data: WorkflowCreate = {
        name: form.name,
        statuses: form.statuses,
        transitions: form.transitions,
      };
      await createWorkflow.mutateAsync({ projectId, data });
    }
    closeForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteWorkflow.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  }

  function getStatusById(id: string): WorkflowStatus | undefined {
    return form.statuses.find((s) => s.id === id);
  }

  function getStatusByIdFromWorkflow(wf: Workflow, id: string): WorkflowStatus | undefined {
    return wf.statuses.find((s) => s.id === id);
  }

  if (isLoading) return <div className="space-y-4">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">ワークフロー</h2>
        <Button onClick={openCreate}>新規作成</Button>
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          title="ワークフローがありません"
          description="プロジェクトのカスタムステータスと遷移を定義するワークフローを作成します。"
          action={<Button onClick={openCreate}>ワークフロー作成</Button>}
        />
      ) : (
        <div className="space-y-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="border border-outline-variant rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-on-surface">{wf.name}</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(wf)}>
                    編集
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(wf.id)}>
                    削除
                  </Button>
                </div>
              </div>

              {/* Visual workflow diagram */}
              <div className="bg-surface-container-low rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {wf.statuses.map((status) => (
                    <div key={status.id} className="flex items-center gap-2">
                      <Badge text={status.name} color={status.color} />
                      {wf.transitions
                        .filter((t) => t.from === status.id)
                        .map((t, i) => {
                          const toStatus = getStatusByIdFromWorkflow(wf, t.to);
                          return toStatus ? (
                            <div key={i} className="flex items-center gap-1">
                              <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                              <Badge text={toStatus.name} color={toStatus.color} variant="outline" />
                            </div>
                          ) : null;
                        })}
                    </div>
                  ))}
                </div>
                {wf.transitions.length === 0 && (
                  <p className="text-xs text-on-surface-variant mt-2">遷移が未定義です</p>
                )}
              </div>

              <div className="text-xs text-on-surface-variant">
                {wf.statuses.length} ステータス, {wf.transitions.length} 遷移
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingId ? 'ワークフロー編集' : '新規ワークフロー'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>キャンセル</Button>
            <Button
              onClick={handleSubmit}
              loading={createWorkflow.isPending || updateWorkflow.isPending}
              disabled={!form.name.trim()}
            >
              {editingId ? '更新' : '作成'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Workflow name */}
          <Input
            label="ワークフロー名"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例: バグトラッキング"
          />

          {/* Statuses section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-on-surface-variant">ステータス</label>
            <div className="flex flex-wrap gap-2">
              {form.statuses.map((s) => (
                <div key={s.id} className="flex items-center gap-1 bg-surface-container rounded-full pl-1 pr-2 py-1">
                  <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-on-surface-variant">{s.name}</span>
                  <button
                    onClick={() => removeStatus(s.id)}
                    className="ml-1 text-on-surface-variant hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Input
                label="ステータス名"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="例: レビュー中"
                onKeyDown={(e) => e.key === 'Enter' && addStatus()}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-on-surface-variant">カラー</label>
                <input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="h-[38px] w-12 rounded-xl border border-outline-variant cursor-pointer"
                />
              </div>
              <Button variant="secondary" onClick={addStatus} disabled={!newStatusName.trim()}>
                追加
              </Button>
            </div>
          </div>

          {/* Transitions section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-on-surface-variant">遷移</label>
            {form.transitions.length > 0 && (
              <div className="space-y-1">
                {form.transitions.map((t, i) => {
                  const fromStatus = getStatusById(t.from);
                  const toStatus = getStatusById(t.to);
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm bg-surface-container-low rounded-xl px-3 py-2">
                      {fromStatus && <Badge text={fromStatus.name} color={fromStatus.color} />}
                      <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                      {toStatus && <Badge text={toStatus.name} color={toStatus.color} />}
                      <button
                        onClick={() => removeTransition(i)}
                        className="ml-auto text-on-surface-variant hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {form.statuses.length >= 2 ? (
              <div className="flex items-end gap-2">
                <div className="space-y-1 flex-1">
                  <label className="block text-sm font-medium text-on-surface-variant">遷移元</label>
                  <select
                    value={transFrom}
                    onChange={(e) => setTransFrom(e.target.value)}
                    className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">ステータスを選択</option>
                    {form.statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 flex-1">
                  <label className="block text-sm font-medium text-on-surface-variant">遷移先</label>
                  <select
                    value={transTo}
                    onChange={(e) => setTransTo(e.target.value)}
                    className="block w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">ステータスを選択</option>
                    {form.statuses.filter((s) => s.id !== transFrom).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Button variant="secondary" onClick={addTransition} disabled={!transFrom || !transTo}>
                  追加
                </Button>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">遷移を定義するには2つ以上のステータスが必要です。</p>
            )}
          </div>

          {/* Visual preview */}
          {form.statuses.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface-variant">プレビュー</label>
              <div className="bg-surface-container-low rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {form.statuses.map((status) => (
                    <div key={status.id} className="flex items-center gap-2">
                      <Badge text={status.name} color={status.color} />
                      {form.transitions
                        .filter((t) => t.from === status.id)
                        .map((t, i) => {
                          const toStatus = getStatusById(t.to);
                          return toStatus ? (
                            <div key={i} className="flex items-center gap-1">
                              <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                              <Badge text={toStatus.name} color={toStatus.color} variant="outline" />
                            </div>
                          ) : null;
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="ワークフロー削除"
        message="このワークフローを削除しますか？この操作は取り消せません。"
        loading={deleteWorkflow.isPending}
      />
    </div>
  );
}
