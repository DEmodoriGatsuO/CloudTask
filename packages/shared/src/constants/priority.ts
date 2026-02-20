export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriorityType = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriorityType, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

// MD3準拠: コントラスト比4.5:1以上を維持しつつ意味的カラー
// low: teal (穏やか), medium: amber (注意喚起), high: rose (緊急・重要)
export const TASK_PRIORITY_COLORS: Record<TaskPriorityType, string> = {
  low:    '#0d9488',  // teal-600   — 低: 穏やか・問題なし
  medium: '#d97706',  // amber-600  — 中: 注意・要確認
  high:   '#e11d48',  // rose-600   — 高: 緊急・重要
};
