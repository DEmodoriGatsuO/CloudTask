export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'completed'] as const;
export type TaskStatusType = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatusType, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
  completed: '完了済',
};

// MD3準拠: 各ステータスに意味と視認性を持たせたカラー
// todo: slate (中立), in_progress: indigo (主軸色と統一), done: emerald (達成), completed: violet (アーカイブ)
export const TASK_STATUS_COLORS: Record<TaskStatusType, string> = {
  todo:        '#64748b',  // slate-500  — 未着手: 中立・待機
  in_progress: '#4f46e5',  // indigo-600 — 進行中: Primary色と統一
  done:        '#059669',  // emerald-600 — 完了: 達成・成功
  completed:   '#7c3aed',  // violet-600 — 完了済: アーカイブ・終了
};

export const PROJECT_STATUSES = ['active', 'archived'] as const;
export type ProjectStatusType = (typeof PROJECT_STATUSES)[number];
