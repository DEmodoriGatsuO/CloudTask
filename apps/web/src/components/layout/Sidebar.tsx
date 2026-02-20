import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';

// プロジェクトのインジケーターカラー（ダーク背景映え版）
const PROJECT_INDICATOR_COLORS = [
  '#818cf8', // indigo-400
  '#2dd4bf', // teal-400
  '#fbbf24', // amber-400
  '#fb7185', // rose-400
  '#a78bfa', // violet-400
  '#38bdf8', // sky-400
  '#34d399', // emerald-400
  '#fb923c', // orange-400
];

function getProjectColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return PROJECT_INDICATOR_COLORS[Math.abs(hash) % PROJECT_INDICATOR_COLORS.length];
}

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { data: projectsData } = useProjects();
  const projects = projectsData?.data || [];
  const [expanded, setExpanded] = useState(true);

  const navItems = [
    { path: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { path: '/projects', label: 'プロジェクト', icon: FolderKanban },
  ];

  return (
    <aside
      className={`${expanded ? 'w-60' : 'w-[60px]'} h-screen flex flex-col transition-all duration-300 ease-out`}
      style={{ backgroundColor: '#1e1b4b', borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* ─── ロゴ + トグルボタン（常時表示） ─── */}
      <div
        className="h-14 px-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 min-w-0 overflow-hidden"
        >
          <img src="/logo.png" alt="CloudTask" className="w-7 h-7 rounded-lg shrink-0" />
          {expanded && (
            <span className="text-sm font-bold text-white tracking-tight truncate">CloudTask</span>
          )}
        </Link>

        {/* 折りたたみ/展開ボタン — 常時表示 */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 p-1 rounded-md transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          title={expanded ? '折りたたむ' : '展開する'}
        >
          {expanded
            ? <ChevronLeft className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />
          }
        </button>
      </div>

      {/* ─── メインナビ ─── */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}
                ${!expanded ? 'justify-center' : ''}
              `}
              title={!expanded ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {expanded && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* ─── プロジェクトリスト ─── */}
        {projects.length > 0 && (
          <div className="pt-4">
            {expanded ? (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                プロジェクト
              </p>
            ) : (
              <div className="mx-3 mb-2 h-px bg-white/10" />
            )}
            {projects.map((project) => {
              const isActive = location.pathname.startsWith(`/projects/${project.id}`);
              const color = getProjectColor(project.id);
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}/board`}
                  onClick={onNavigate}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                    transition-colors duration-150
                    ${isActive ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'}
                    ${!expanded ? 'justify-center' : ''}
                  `}
                  title={!expanded ? project.name : undefined}
                >
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  {expanded && <span className="truncate">{project.name}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
