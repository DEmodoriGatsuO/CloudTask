import { Link, useLocation, useParams } from 'react-router-dom';
import { Columns3, List, GanttChart, Activity, BookOpen, Settings } from 'lucide-react';

const tabs = [
  { path: 'board', label: 'Board', icon: Columns3 },
  { path: 'list', label: 'List', icon: List },
  { path: 'gantt', label: 'Gantt', icon: GanttChart },
  { path: 'activity', label: 'Activity', icon: Activity },
  { path: 'wiki', label: 'Wiki', icon: BookOpen },
  { path: 'settings', label: 'Settings', icon: Settings },
];

export function ProjectNav() {
  const { projectId } = useParams();
  const location = useLocation();

  return (
    <div className="border-b border-outline-variant bg-surface-container -mx-6 -mt-6 mb-6 px-6">
      <nav className="flex gap-1">
        {tabs.map((tab) => {
          const fullPath = `/projects/${projectId}/${tab.path}`;
          const isActive = location.pathname === fullPath;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={fullPath}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
