import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTask, useTasks, useUpdateTask, useDeleteTask, useTaskDependencies, useAddTaskDependency, useRemoveTaskDependency } from '../hooks/useTasks';
import { useProjectMembers } from '../hooks/useProjects';
import { useTaskEdit } from '../hooks/useTaskEdit';
import { useTaskDates } from '../hooks/useTaskDates';
import { useTaskComments } from '../hooks/useTaskComments';
import { SkeletonDetail } from '../components/common/Skeleton';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { DateInput } from '../components/common/DateInput';
import { FileUpload } from '../components/files/FileUpload';
import { CustomFieldRenderer } from '../components/custom-fields/CustomFieldRenderer';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { MentionTextArea } from '../components/common/MentionTextArea';
import { useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, GitMerge, Pencil, Plus, Check, X, Save, Trash2, Diamond } from 'lucide-react';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, formatDateTime } from '@cloudtask/shared';
import type { TaskStatusType, TaskPriorityType } from '@cloudtask/shared';

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data: taskData, isLoading } = useTask(taskId!);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const task = taskData?.data;

  // Custom hooks for state management
  const edit = useTaskEdit(task, taskId!);
  const dates = useTaskDates(task, taskId!);
  const commentState = useTaskComments(taskId!);

  // Dependency state
  const { data: depsData } = useTaskDependencies(taskId!);
  const addDep = useAddTaskDependency();
  const removeDep = useRemoveTaskDependency();
  const [depSelectValue, setDepSelectValue] = useState('');

  // All tasks in project (for "add predecessor" dropdown)
  const { data: projectTasksData } = useTasks(task?.projectId ?? '');

  // Load project members for @mention candidates and assignee select
  const { data: membersData } = useProjectMembers(task?.projectId ?? '');
  const mentionCandidates = useMemo(() => {
    return (membersData?.data || []).map(m => ({
      id: m.userId,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
    }));
  }, [membersData]);

  if (isLoading) return <SkeletonDetail />;
  if (!task) return <div className="text-center py-12 text-on-surface-variant">タスクが見つかりません</div>;

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    updateTask.mutate({ id: taskId!, data: { assigneeId: value || null } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-2 sm:px-4">
      {/* Back to board */}
      <Link
        to={`/projects/${task.projectId}/board`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        ボードに戻る
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Inline title editing */}
          {edit.editingTitle ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  ref={edit.titleInputRef}
                  type="text"
                  value={edit.titleDraft}
                  onChange={(e) => { edit.setTitleDraft(e.target.value); if (edit.titleError) edit.setTitleError(''); }}
                  onKeyDown={edit.handleTitleKeyDown}
                  onBlur={edit.handleTitleSave}
                  className={`text-2xl font-bold text-on-surface bg-transparent border-b-2 outline-none w-full py-0.5 ${edit.titleError ? 'border-red-500' : 'border-primary-500'}`}
                  maxLength={200}
                />
                <button onClick={edit.handleTitleSave} className="shrink-0 p-1 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors" title="保存">
                  <Check className="w-5 h-5" />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); edit.handleTitleCancel(); }} className="shrink-0 p-1 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="キャンセル">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {edit.titleError && <p className="text-xs text-red-600 mt-1">{edit.titleError}</p>}
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h1
                className="text-2xl font-bold text-on-surface cursor-pointer hover:text-primary-600 transition-colors truncate"
                onClick={edit.startEditingTitle}
                title="クリックして編集"
              >
                {task.title}
              </h1>
              <button
                onClick={edit.startEditingTitle}
                className="shrink-0 p-1 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary-600 transition-all"
                title="タイトルを編集"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge text={TASK_STATUS_LABELS[task.status as TaskStatusType]} color={TASK_STATUS_COLORS[task.status as TaskStatusType]} />
            <Badge text={TASK_PRIORITY_LABELS[task.priority as TaskPriorityType]} color={TASK_PRIORITY_COLORS[task.priority as TaskPriorityType]} />
            {task.isMilestone && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                <Diamond className="w-3 h-3" />
                マイルストーン
              </span>
            )}
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => deleteTask.mutate(taskId!, { onSuccess: () => navigate(-1) })}>削除</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description with edit mode */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-on-surface-variant">説明</h2>
              {!edit.editingDescription ? (
                <button
                  onClick={edit.startEditingDescription}
                  className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  編集
                </button>
              ) : (
                <button type="button" onClick={() => edit.setDescPreview(!edit.descPreview)} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors">
                  {edit.descPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {edit.descPreview ? '編集' : 'プレビュー'}
                </button>
              )}
            </div>
            {edit.editingDescription ? (
              <div className="space-y-3">
                {edit.descPreview ? (
                  <div className="border border-outline-variant rounded-xl px-3 py-2 min-h-[120px]">
                    {edit.descriptionDraft.trim() ? <MarkdownRenderer content={edit.descriptionDraft} /> : <span className="text-sm text-on-surface-variant">プレビューするテキストがありません</span>}
                  </div>
                ) : (
                  <MentionTextArea
                    value={edit.descriptionDraft}
                    onChange={edit.setDescriptionDraft}
                    candidates={mentionCandidates}
                    placeholder="Add a description... (**bold**, *italic*, `code`, @mention)"
                    className="min-h-[120px]"
                  />
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={edit.handleDescriptionCancel}>キャンセル</Button>
                  <Button size="sm" onClick={edit.handleDescriptionSave}>保存</Button>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer group/desc rounded-lg p-2 -m-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={edit.startEditingDescription}
                title="クリックして編集"
              >
                {task.description ? (
                  <MarkdownRenderer content={task.description} />
                ) : (
                  <p className="text-sm text-on-surface-variant italic">クリックして説明を追加...</p>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
            <h2 className="text-sm font-semibold text-on-surface-variant mb-4">添付ファイル</h2>
            <FileUpload taskId={taskId!} />
          </div>

          {/* Comments */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
            <h2 className="text-sm font-semibold text-on-surface-variant mb-4">コメント ({commentState.comments.length})</h2>
            <div className="space-y-4">
              {commentState.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  <Avatar name={c.user.displayName} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-on-surface">{c.user.displayName}</span>
                      <span className="text-xs text-on-surface-variant">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <MarkdownRenderer content={c.content} className="mt-1" />
                  </div>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); commentState.handleSubmitComment(); }} className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Markdownに対応しています</span>
                  <button type="button" onClick={() => commentState.setShowPreview(!commentState.showPreview)} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors">
                    {commentState.showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {commentState.showPreview ? '編集' : 'プレビュー'}
                  </button>
                </div>
                {commentState.showPreview ? (
                  <div className="border border-outline-variant rounded-xl px-3 py-2 min-h-[40px]">
                    {commentState.newComment.trim() ? <MarkdownRenderer content={commentState.newComment} /> : <span className="text-sm text-on-surface-variant">プレビューするテキストがありません</span>}
                  </div>
                ) : (
                  <MentionTextArea
                    value={commentState.newComment}
                    onChange={commentState.setNewComment}
                    candidates={mentionCandidates}
                    placeholder="Add comment... (**bold**, *italic*, `code`, @mention)"
                    className="min-h-[80px]"
                  />
                )}
                <div className="flex justify-end">
                  <Button type="submit" size="sm" loading={commentState.isSubmitting} disabled={!commentState.newComment.trim()}>投稿</Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 space-y-3">
            <Select label="ステータス" value={task.status} onChange={(e) => updateTask.mutate({ id: taskId!, data: { status: e.target.value } })}
              options={Object.entries(TASK_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <Select label="優先度" value={task.priority} onChange={(e) => updateTask.mutate({ id: taskId!, data: { priority: e.target.value } })}
              options={Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            {/* Assignee select dropdown */}
            <Select
              label="担当者"
              value={task.assignee?.id || ''}
              onChange={handleAssigneeChange}
              placeholder="Unassigned"
              options={mentionCandidates.map(m => ({ value: m.id, label: m.displayName }))}
            />
            {/* Milestone toggle */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1.5">
                <Diamond className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-on-surface-variant">マイルストーン</span>
              </div>
              <button
                onClick={() => updateTask.mutate({ id: taskId!, data: { isMilestone: !task.isMilestone } })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
                  task.isMilestone ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                title={task.isMilestone ? 'マイルストーンを解除' : 'マイルストーンに設定'}
                aria-label="マイルストーン切り替え"
                aria-pressed={task.isMilestone}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    task.isMilestone ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">報告者</p>
              <div className="flex items-center gap-2"><Avatar name={task.reporter.displayName} size="sm" /><span className="text-sm">{task.reporter.displayName}</span></div>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">作成日</p>
              <p className="text-sm text-on-surface-variant">{formatDateTime(task.createdAt)}</p>
            </div>
            <div className="border-t border-outline-variant/50 pt-3 mt-1 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-on-surface-variant">スケジュール</p>
                {dates.isDatesDirty && (
                  <Button size="sm" onClick={dates.handleDatesSave} loading={dates.isSaving}>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    保存
                  </Button>
                )}
              </div>
              <DateInput
                label="開始日"
                value={dates.draftStartDate}
                onChange={(v) => { dates.setDraftStartDate(v); if (dates.dateError) dates.clearDateError(); }}
              />
              <DateInput
                label="期限日"
                value={dates.draftDueDate}
                onChange={(v) => { dates.setDraftDueDate(v); if (dates.dateError) dates.clearDateError(); }}
              />
              <DateInput
                label="実績終了日"
                value={dates.draftActualEndDate}
                onChange={(v) => { dates.setDraftActualEndDate(v); if (dates.dateError) dates.clearDateError(); }}
              />
              {dates.dateError && <p className="text-xs text-red-600">{dates.dateError}</p>}
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-4">
            <h3 className="text-sm font-semibold text-on-surface-variant mb-3">カスタムフィールド</h3>
            <CustomFieldRenderer taskId={taskId!} projectId={task.projectId} />
          </div>

          {/* Dependencies */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitMerge className="w-4 h-4 text-on-surface-variant" />
              <h3 className="text-sm font-semibold text-on-surface-variant">依存関係</h3>
            </div>

            {(() => {
              const deps = depsData?.data || [];
              const predecessors = deps.filter(d => d.taskId === taskId);
              const successors = deps.filter(d => d.dependsOnTaskId === taskId);
              const allProjectTasks = projectTasksData?.data || [];
              const linkedIds = new Set([
                taskId!,
                ...predecessors.map(d => d.dependsOnTaskId),
              ]);
              const selectOptions = allProjectTasks.filter(t => !linkedIds.has(t.id));

              return (
                <div className="space-y-3">
                  {/* Predecessors */}
                  <div>
                    <p className="text-xs font-medium text-on-surface-variant mb-1.5">先行タスク（完了後に本タスクを開始）</p>
                    {predecessors.length === 0 ? (
                      <p className="text-xs text-on-surface-variant/60 italic">なし</p>
                    ) : (
                      <ul className="space-y-1">
                        {predecessors.map(d => (
                          <li key={d.dependsOnTaskId} className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 bg-surface-container-highest group">
                            <Link
                              to={`/tasks/${d.dependsOnTaskId}`}
                              className="truncate text-on-surface hover:text-primary transition-colors"
                            >
                              {d.dependsOnTaskTitle}
                            </Link>
                            <button
                              onClick={() => removeDep.mutate({ taskId: taskId!, dependsOnTaskId: d.dependsOnTaskId })}
                              className="shrink-0 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all"
                              title="依存を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Add predecessor */}
                  {selectOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={depSelectValue}
                        onChange={e => setDepSelectValue(e.target.value)}
                        className="flex-1 text-xs bg-surface border border-outline-variant rounded-lg px-2 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">先行タスクを選択...</option>
                        {selectOptions.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                      <button
                        disabled={!depSelectValue || addDep.isPending}
                        onClick={() => {
                          if (!depSelectValue) return;
                          addDep.mutate({ taskId: taskId!, dependsOnTaskId: depSelectValue }, {
                            onSuccess: () => setDepSelectValue(''),
                          });
                        }}
                        className="shrink-0 p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="追加"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Successors */}
                  {successors.length > 0 && (
                    <div className="border-t border-outline-variant/40 pt-3">
                      <p className="text-xs font-medium text-on-surface-variant mb-1.5">後続タスク（本タスク完了後に開始）</p>
                      <ul className="space-y-1">
                        {successors.map(d => (
                          <li key={d.taskId} className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 bg-surface-container-highest group">
                            <Link
                              to={`/tasks/${d.taskId}`}
                              className="truncate text-on-surface hover:text-primary transition-colors"
                            >
                              {d.taskTitle}
                            </Link>
                            <button
                              onClick={() => removeDep.mutate({ taskId: d.taskId, dependsOnTaskId: taskId! })}
                              className="shrink-0 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all"
                              title="依存を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
