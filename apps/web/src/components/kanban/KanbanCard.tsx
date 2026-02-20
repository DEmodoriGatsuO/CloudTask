import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { MessageSquare, Calendar } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '@cloudtask/shared';
import type { TaskPriorityType } from '@cloudtask/shared';
import { formatDate } from '@cloudtask/shared';

interface KanbanCardProps {
  task: any;
  isDragging?: boolean;
  statusColor?: string;
}

export function KanbanCard({ task, isDragging, statusColor: _statusColor }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    transition: {
      duration: 220,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate && task.dueDate < Date.now();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-surface-container-lowest rounded-lg border border-outline-variant
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${isSortableDragging
          ? 'opacity-30 scale-95'
          : 'hover:border-outline hover:shadow-sm hover:shadow-black/5'
        }
        ${isDragging
          ? 'shadow-lg shadow-black/10 rotate-1 scale-[1.02] border-outline z-50'
          : ''
        }
      `}
    >
      <Link
        to={`/tasks/${task.id}`}
        className="block p-3"
        onClick={(e) => { if (isDragging) e.preventDefault(); }}
      >
        {/* タイトル行 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium text-on-surface line-clamp-2 leading-snug">
            {task.title}
          </h4>
          {task.isMilestone && (
            <span
              className="shrink-0 w-4 h-4 flex items-center justify-center text-[10px] rounded-sm"
              style={{ backgroundColor: '#fef3c7', color: '#d97706' }}
              title="Milestone"
            >
              ◆
            </span>
          )}
        </div>

        {/* バッジ行 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            text={TASK_PRIORITY_LABELS[task.priority as TaskPriorityType]}
            color={TASK_PRIORITY_COLORS[task.priority as TaskPriorityType]}
          />
          {task.labels?.map((l: any) => (
            <Badge key={l.id} text={l.name} color={l.color} variant="outline" />
          ))}
        </div>

        {/* フッター: 期限 / コメント / アバター */}
        {(task.dueDate || task.commentCount > 0 || task.assignee) && (
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              {task.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 ${
                    isOverdue ? 'text-error font-medium' : ''
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {task.commentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {task.commentCount}
                </span>
              )}
            </div>
            {task.assignee && (
              <Avatar
                name={task.assignee.displayName}
                src={task.assignee.avatarUrl}
                size="sm"
              />
            )}
          </div>
        )}
      </Link>
    </div>
  );
}
