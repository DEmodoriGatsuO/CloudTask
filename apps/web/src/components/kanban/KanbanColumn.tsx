import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { TASK_STATUS_COLORS } from '@cloudtask/shared';
import type { TaskStatusType } from '@cloudtask/shared';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: any[];
  count: number;
}

// ステータス毎の背景トーン (Figma-style column tinting)
const COLUMN_TINTS: Record<string, string> = {
  todo:        'rgba(100,116,139,0.06)',  // slate
  in_progress: 'rgba(79,70,229,0.06)',   // indigo
  done:        'rgba(5,150,105,0.06)',   // emerald
  completed:   'rgba(124,58,237,0.06)', // violet
};

export function KanbanColumn({ id, title, tasks, count }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const color = TASK_STATUS_COLORS[id as TaskStatusType] || '#94a3b8';
  const tint = COLUMN_TINTS[id] || 'rgba(148,163,184,0.06)';

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-xl p-3 transition-all duration-200 ${
        isOver ? 'scale-[1.01]' : ''
      }`}
      style={{
        backgroundColor: isOver ? `${color}14` : tint,
        boxShadow: isOver ? `inset 0 0 0 2px ${color}60` : undefined,
      }}
    >
      {/* ─── カラムヘッダー ─── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {/* ステータスカラードット */}
          <div
            className="w-2 h-2 rounded-full transition-all duration-200"
            style={{
              backgroundColor: color,
              transform: isOver ? 'scale(1.5)' : 'scale(1)',
              boxShadow: isOver ? `0 0 6px ${color}80` : 'none',
            }}
          />
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
        </div>
        {/* タスク数バッジ */}
        <span
          className="text-xs font-semibold rounded-full px-2 py-0.5 transition-all duration-200"
          style={{
            backgroundColor: isOver ? `${color}20` : 'var(--color-surface-container-high)',
            color: isOver ? color : 'var(--color-on-surface-variant)',
          }}
        >
          {count}
        </span>
      </div>

      {/* ─── カードリスト ─── */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[320px]">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} statusColor={color} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
