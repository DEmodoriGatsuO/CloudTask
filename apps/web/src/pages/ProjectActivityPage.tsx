import { useParams } from 'react-router-dom';
import { useActivity } from '../hooks/useActivity';
import { ProjectNav } from '../components/layout/ProjectNav';
import { Skeleton } from '../components/common/Skeleton';
import { Avatar } from '../components/common/Avatar';
import { formatDateTime } from '@cloudtask/shared';

const actionLabels: Record<string, string> = {
  created: '作成しました', updated: '更新しました', deleted: '削除しました',
  commented: 'コメントしました', status_changed: 'ステータスを変更しました',
  assigned: '担当者を割り当てました', member_added: 'メンバーを追加しました', member_removed: 'メンバーを削除しました',
};

export function ProjectActivityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading } = useActivity(projectId!);
  const activities = data?.data || [];

  if (isLoading) return (
    <>
      <ProjectNav />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 flex items-start gap-3">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" height={14} />
              <Skeleton variant="text" width={80} height={12} />
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div>
      <ProjectNav />
      <h1 className="text-xl font-bold text-on-surface mb-4">Activity</h1>
      <div className="space-y-3">
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3 bg-surface-container-low rounded-2xl border border-outline-variant p-4">
            <Avatar name={a.user.displayName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium text-on-surface">{a.user.displayName}</span>{' '}
                <span className="text-on-surface-variant">{actionLabels[a.action] || a.action}</span>{' '}
                {a.task && <span className="font-medium text-on-surface">{a.task.title}</span>}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">{formatDateTime(a.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
