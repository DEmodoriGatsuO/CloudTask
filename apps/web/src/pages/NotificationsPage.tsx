import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, CheckCheck, AtSign, UserCheck, MessageSquare, RefreshCw } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';
import { formatDate } from '@cloudtask/shared';
import type { NotificationWithTask } from '@cloudtask/shared';
import type { NotificationType } from '@cloudtask/shared';

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; label: string; color: string }> = {
  mention: {
    icon: <AtSign className="w-4 h-4" />,
    label: 'メンション',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
  },
  assignment: {
    icon: <UserCheck className="w-4 h-4" />,
    label: 'アサイン',
    color: 'text-green-600 bg-green-50 dark:bg-green-950/40',
  },
  comment: {
    icon: <MessageSquare className="w-4 h-4" />,
    label: 'コメント',
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
  },
  status_change: {
    icon: <RefreshCw className="w-4 h-4" />,
    label: 'ステータス変更',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
  },
};

function NotificationRow({ notification, onRead }: { notification: NotificationWithTask; onRead: (id: string) => void }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.comment;

  function handleClick() {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    if (notification.task) {
      navigate(`/tasks/${notification.task.id}`);
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-5 py-4 border-b border-outline-variant transition-colors
        ${notification.task ? 'cursor-pointer hover:bg-surface-container-highest' : ''}
        ${!notification.isRead ? 'bg-primary-50/60 dark:bg-primary-950/20' : ''}`}
    >
      {/* Type icon */}
      <div className={`p-2 rounded-xl flex-shrink-0 ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${!notification.isRead ? 'text-on-surface' : 'text-on-surface-variant'}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-on-surface-variant mt-0.5 truncate">{notification.message}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${cfg.color}`}>
            {cfg.label}
          </span>
          {notification.task && (
            <span className="text-[11px] text-on-surface-variant truncate max-w-[200px]">
              {notification.task.title}
            </span>
          )}
          <span className="text-[11px] text-on-surface-variant ml-auto flex-shrink-0">
            {formatDate(notification.createdAt * 1000)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-on-surface" />
          <h1 className="text-2xl font-bold text-on-surface">通知</h1>
          {unreadCount > 0 && (
            <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            すべて既読にする
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant text-sm">読み込み中...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-on-surface-variant">
            <BellOff className="w-10 h-10 opacity-40" />
            <p className="text-sm">通知はありません</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={(id) => markAsRead.mutate(id)}
              />
            ))}
            {data && data.totalPages > 1 && (
              <p className="text-xs text-center text-on-surface-variant py-3">
                {data.total} 件中 {notifications.length} 件表示
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hint: unread indicator */}
      {notifications.some((n) => !n.isRead) && (
        <p className="mt-3 text-xs text-on-surface-variant text-center flex items-center justify-center gap-1">
          <Check className="w-3 h-3" />
          通知をクリックすると既読になり、タスクへ移動します
        </p>
      )}
    </div>
  );
}
