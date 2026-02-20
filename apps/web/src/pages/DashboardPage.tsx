import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, FolderKanban, ListTodo, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { useProjects } from '../hooks/useProjects';
import { useDashboardStats } from '../hooks/useDashboard';
import { SkeletonCard, Skeleton } from '../components/common/Skeleton';
import { Badge } from '../components/common/Badge';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, formatDate, daysUntil } from '@cloudtask/shared';
import type { TaskStatusType, TaskPriorityType } from '@cloudtask/shared';
import type { DashboardTask } from '../api/dashboard';

function DueDateChip({ dueDate }: { dueDate: number }) {
  const days = daysUntil(dueDate);
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-error bg-error-container px-1.5 py-0.5 rounded-md whitespace-nowrap">
        <AlertTriangle className="w-3 h-3" />
        {Math.abs(days)}日超過
      </span>
    );
  }
  if (days === 0) {
    return (
      <span
        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
        style={{ color: '#d97706', backgroundColor: 'rgba(217,119,6,0.10)' }}
      >
        今日
      </span>
    );
  }
  if (days === 1) {
    return (
      <span
        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
        style={{ color: '#d97706', backgroundColor: 'rgba(217,119,6,0.08)' }}
      >
        明日
      </span>
    );
  }
  return (
    <span className="text-[11px] text-on-surface-variant whitespace-nowrap">{formatDate(dueDate)}</span>
  );
}

function DashboardTaskRow({ task }: { task: DashboardTask }) {
  const isOverdue = task.dueDate !== null && task.dueDate < Date.now();
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-container rounded-xl transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOverdue ? 'text-error' : 'text-on-surface'}`}>{task.title}</p>
        <p className="text-xs text-on-surface-variant truncate">{task.projectName}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge text={TASK_PRIORITY_LABELS[task.priority as TaskPriorityType]} color={TASK_PRIORITY_COLORS[task.priority as TaskPriorityType]} />
        {task.dueDate !== null && <DueDateChip dueDate={task.dueDate} />}
      </div>
    </Link>
  );
}

const STATUS_ORDER: TaskStatusType[] = ['todo', 'in_progress', 'done', 'completed'];

export function DashboardPage() {
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const projects = projectsData?.data || [];
  const stats = statsData?.data;

  const isLoading = projectsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton variant="text" width="180px" height={28} />
          <Skeleton variant="text" width="240px" height={16} className="mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 space-y-2">
              <Skeleton variant="text" width="60%" height={14} />
              <Skeleton variant="text" width="40%" height={32} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 space-y-3">
            <Skeleton variant="text" width="160px" height={20} />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" width="100%" height={48} />
            ))}
          </div>
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 space-y-3">
            <Skeleton variant="text" width="160px" height={20} />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" width="100%" height={48} />
            ))}
          </div>
        </div>
        <div>
          <Skeleton variant="text" width="160px" height={20} className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overdueCount = stats?.overdueTaskCount || 0;
  const now = Date.now();
  const myOverdueCount = stats
    ? [...stats.myTasks.todo, ...stats.myTasks.inProgress].filter(t => t.dueDate !== null && t.dueDate < now).length
    : 0;
  const myTaskTotal = (stats?.myTasks.todo.length || 0) + (stats?.myTasks.inProgress.length || 0) + (stats?.myTasks.done.length || 0);

  const totalCompleted = stats?.completedTaskCount || 0;
  const totalTasks = stats?.totalTaskCount || 0;
  const inProgressCount = stats?.myTasks.inProgress.length || 0;
  const todoCount = stats?.myTasks.todo.length || 0;

  const statusChartData = STATUS_ORDER
    .map((s) => {
      let count = 0;
      if (s === 'done' || s === 'completed') count = totalCompleted;
      else if (s === 'in_progress') count = inProgressCount;
      else if (s === 'todo') count = todoCount;
      return { name: TASK_STATUS_LABELS[s], count, color: TASK_STATUS_COLORS[s] };
    })
    .filter((d) => d.count > 0);

  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Dashboard</h1>
        <p className="text-on-surface-variant mt-1">CloudTaskへようこそ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(79,70,229,0.10)' }}>
              <FolderKanban className="w-5 h-5" style={{ color: '#4f46e5' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">プロジェクト</p>
              <p className="text-2xl font-bold text-on-surface">{stats?.projectCount || projects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}>
              <ListTodo className="w-5 h-5" style={{ color: '#0d9488' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">総タスク数</p>
              <p className="text-2xl font-bold text-on-surface">{totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(5,150,105,0.10)' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">完了タスク</p>
              <p className="text-2xl font-bold text-on-surface">{totalCompleted}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${overdueCount > 0 ? 'bg-error-container border-error/30' : 'bg-surface-container-lowest border-outline-variant'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: overdueCount > 0 ? 'rgba(220,38,38,0.15)' : 'rgba(148,163,184,0.12)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: overdueCount > 0 ? '#dc2626' : '#94a3b8' }} />
            </div>
            <div>
              <p className={`text-sm font-medium ${overdueCount > 0 ? 'text-on-error-container' : 'text-on-surface-variant'}`}>期限切れ</p>
              <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-error' : 'text-on-surface'}`}>{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress overview + Status chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion progress (円グラフ) */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5">
          <h2 className="text-base font-semibold text-on-surface mb-2">Overall Completion Rate</h2>
          {totalTasks === 0 ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">タスクがありません</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: '完了', value: totalCompleted },
                        { name: '未完了', value: totalTasks - totalCompleted },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill="#4f46e5" fillOpacity={0.9} />
                      <Cell fill="var(--color-surface-container-high)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold" style={{ color: '#4f46e5' }}>{completionRate}%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#4f46e5' }} />
                  <span className="text-on-surface-variant">完了</span>
                  <span className="font-semibold text-on-surface ml-auto pl-4">{totalCompleted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-surface-container-high border border-outline-variant flex-shrink-0" />
                  <span className="text-on-surface-variant">未完了</span>
                  <span className="font-semibold text-on-surface ml-auto pl-4">{totalTasks - totalCompleted}</span>
                </div>
                <div className="border-t border-outline-variant pt-2 flex items-center gap-2">
                  <span className="text-on-surface-variant">合計</span>
                  <span className="font-semibold text-on-surface ml-auto pl-4">{totalTasks}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status distribution bar chart */}
        {statusChartData.length > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5">
            <h2 className="text-base font-semibold text-on-surface mb-4">ステータス別タスク数</h2>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statusChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-container-lowest)',
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(val: number) => [val, 'タスク数']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {statusChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Overdue Warning */}
      {stats && stats.overdueTasks.length > 0 && (
        <div className="bg-error-container/50 border border-error/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-error/15">
              <AlertTriangle className="w-4 h-4 text-error" />
            </div>
            <h2 className="text-base font-semibold text-error">期限切れのタスク ({stats.overdueTasks.length})</h2>
          </div>
          <div className="space-y-1">
            {stats.overdueTasks.slice(0, 5).map((task) => (
              <DashboardTaskRow key={task.id} task={task} />
            ))}
            {stats.overdueTasks.length > 5 && (
              <p className="text-xs text-on-surface-variant text-center pt-2">他 {stats.overdueTasks.length - 5} 件</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(79,70,229,0.10)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: '#4f46e5' }} />
            </div>
            <h2 className="text-base font-semibold text-on-surface">担当タスク ({myTaskTotal})</h2>
            {myOverdueCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-error bg-error-container px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {myOverdueCount}件期限超過
              </span>
            )}
          </div>
          {myTaskTotal === 0 ? (
            <p className="text-sm text-on-surface-variant py-4 text-center">担当タスクはありません</p>
          ) : (
            <div className="space-y-3">
              {stats!.myTasks.inProgress.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-4 pb-1">
                    <Badge text={TASK_STATUS_LABELS.in_progress} color={TASK_STATUS_COLORS.in_progress} /> ({stats!.myTasks.inProgress.length})
                  </p>
                  <div className="space-y-0.5">
                    {stats!.myTasks.inProgress.map((task) => (
                      <DashboardTaskRow key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
              {stats!.myTasks.todo.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-4 pb-1">
                    <Badge text={TASK_STATUS_LABELS.todo} color={TASK_STATUS_COLORS.todo} /> ({stats!.myTasks.todo.length})
                  </p>
                  <div className="space-y-0.5">
                    {stats!.myTasks.todo.map((task) => (
                      <DashboardTaskRow key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
              {stats!.myTasks.done.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-4 pb-1">
                    <Badge text={TASK_STATUS_LABELS.done} color={TASK_STATUS_COLORS.done} /> ({stats!.myTasks.done.length})
                  </p>
                  <div className="space-y-0.5">
                    {stats!.myTasks.done.map((task) => (
                      <DashboardTaskRow key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(217,119,6,0.10)' }}>
              <Clock className="w-4 h-4" style={{ color: '#d97706' }} />
            </div>
            <h2 className="text-base font-semibold text-on-surface">直近の期限 (7日以内)</h2>
          </div>
          {!stats?.upcomingTasks.length ? (
            <p className="text-sm text-on-surface-variant py-4 text-center">直近の期限タスクはありません</p>
          ) : (
            <div className="space-y-0.5">
              {stats.upcomingTasks.map((task) => (
                <DashboardTaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <h2 className="text-lg font-semibold text-on-surface mb-4">最近のプロジェクト</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.slice(0, 6).map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}/board`}
              className="group bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 hover:border-outline hover:shadow-sm hover:shadow-black/5 transition-all duration-150"
            >
              <h3 className="font-semibold text-on-surface group-hover:text-primary-600 transition-colors">{project.name}</h3>
              <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{project.description || '説明なし'}</p>
              <div className="flex gap-4 mt-3 text-xs text-on-surface-variant">
                <span>{project.memberCount} メンバー</span>
                <span>{project.taskCount} タスク</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
