import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { ProjectNav } from '../components/layout/ProjectNav';
import { Skeleton } from '../components/common/Skeleton';
import { useProjectReportStats } from '../hooks/useReports';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@cloudtask/shared';

// Date range presets (in seconds)
const PRESETS = [
  { label: '過去 7 日', days: 7 },
  { label: '過去 30 日', days: 30 },
  { label: '過去 90 日', days: 90 },
] as const;

function nowSec() { return Math.floor(Date.now() / 1000); }
function daysAgoSec(d: number) { return nowSec() - d * 24 * 60 * 60; }

// Stat card
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 text-center">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className={`text-4xl font-bold mt-2 ${accent || 'text-on-surface'}`}>{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}

export function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [preset, setPreset] = useState<7 | 30 | 90>(30);

  const rangeEnd = nowSec();
  const rangeStart = daysAgoSec(preset);

  const { data, isLoading } = useProjectReportStats(projectId!, rangeStart, rangeEnd);
  const stats = data?.data;

  if (isLoading) {
    return (
      <>
        <ProjectNav />
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 text-center space-y-3">
                <Skeleton variant="text" width="50%" height={14} className="mx-auto" />
                <Skeleton variant="text" width="40%" height={36} className="mx-auto" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 space-y-3">
                <Skeleton variant="text" width="50%" height={20} />
                <Skeleton variant="rounded" width="100%" height={200} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Status pie data
  const statusPieData = (stats?.statusCounts || []).map((s) => ({
    name: TASK_STATUS_LABELS[s.status as keyof typeof TASK_STATUS_LABELS] || s.status,
    value: s.count,
    color: TASK_STATUS_COLORS[s.status as keyof typeof TASK_STATUS_COLORS] || '#94a3b8',
  }));

  // Priority bar data
  const priorityBarData = (stats?.priorityCounts || []).map((p) => ({
    name: TASK_PRIORITY_LABELS[p.priority as keyof typeof TASK_PRIORITY_LABELS] || p.priority,
    count: p.count,
    color: TASK_PRIORITY_COLORS[p.priority as keyof typeof TASK_PRIORITY_COLORS] || '#94a3b8',
  }));

  // Daily completion area chart — show last N days
  const dailyData = (stats?.dailyCompletion || []).slice(-preset).map((d) => ({
    date: d.date.slice(5), // MM-DD
    完了: d.completed,
    作成: d.created,
  }));

  return (
    <div>
      <ProjectNav />

      {/* Header + range selector */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-on-surface">レポート</h1>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPreset(p.days as 7 | 30 | 90)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                preset === p.days
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="完了率" value={`${stats?.completionRate ?? 0}%`} accent="text-primary-600" />
        <StatCard label="タスク合計" value={stats?.totalTasks ?? 0} />
        <StatCard label="完了" value={stats?.completedTasks ?? 0} accent="text-green-600" />
        <StatCard label="期限切れ" value={stats?.overdueTasks ?? 0} accent={stats?.overdueTasks ? 'text-red-500' : undefined} />
        <StatCard label="平均進捗" value={`${stats?.avgProgress ?? 0}%`} sub="全タスク平均" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Pie */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
          <h2 className="text-base font-semibold text-on-surface mb-4">ステータス分布</h2>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface-container, #fff)', border: 'none', borderRadius: 8, fontSize: 12 }}
                  formatter={(val: number) => [val, 'タスク数']}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-on-surface-variant text-center py-16">データなし</p>
          )}
        </div>

        {/* Priority Bar */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
          <h2 className="text-base font-semibold text-on-surface mb-4">優先度別タスク数</h2>
          {priorityBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface-container, #fff)', border: 'none', borderRadius: 8, fontSize: 12 }}
                  formatter={(val: number) => [val, 'タスク数']}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  {priorityBarData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-on-surface-variant text-center py-16">データなし</p>
          )}
        </div>
      </div>

      {/* Daily trend area chart */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 mb-6">
        <h2 className="text-base font-semibold text-on-surface mb-4">日別タスク推移（過去 {preset} 日）</h2>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-container, #fff)', border: 'none', borderRadius: 8, fontSize: 12 }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="作成" stroke="#6366f1" strokeWidth={1.5} fill="url(#gradCreated)" dot={false} />
              <Area type="monotone" dataKey="完了" stroke="#22c55e" strokeWidth={1.5} fill="url(#gradCompleted)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-on-surface-variant text-center py-16">データなし</p>
        )}
      </div>

      {/* Member workload table */}
      {(stats?.memberWorkloads.length ?? 0) > 0 && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
          <h2 className="text-base font-semibold text-on-surface mb-4">メンバー別負荷</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/50">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-on-surface-variant">メンバー</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-on-surface-variant">未着手</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-on-surface-variant">進行中</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-on-surface-variant">完了</th>
                  <th className="text-right py-2 pl-3 text-xs font-semibold text-on-surface-variant">合計</th>
                </tr>
              </thead>
              <tbody>
                {stats!.memberWorkloads.map((m) => (
                  <tr key={m.userId} className="border-b border-outline-variant/30 hover:bg-surface-container-high/50 transition-colors">
                    <td className="py-3 pr-4 text-on-surface font-medium">{m.displayName}</td>
                    <td className="py-3 px-3 text-right text-on-surface-variant">{m.todo}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={m.inProgress > 0 ? 'text-blue-500 font-medium' : 'text-on-surface-variant'}>{m.inProgress}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={m.done > 0 ? 'text-green-600 font-medium' : 'text-on-surface-variant'}>{m.done}</span>
                    </td>
                    <td className="py-3 pl-3 text-right font-bold text-on-surface">{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
