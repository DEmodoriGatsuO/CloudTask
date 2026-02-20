import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Calendar, ArrowUpDown } from 'lucide-react';
import { useTasks, useUpdateTask, useProjectDependencies, useAddTaskDependency } from '../../hooks/useTasks';
import { SkeletonGantt } from '../common/Skeleton';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TASK_STATUSES } from '@cloudtask/shared';
import type { TaskStatusType, TaskPriorityType } from '@cloudtask/shared';

interface GanttChartProps {
  projectId: string;
  members?: Array<{ userId: string; user: { displayName: string } }>;
}

type DragMode = 'move' | 'resize-left' | 'resize-right';

interface DragState {
  taskId: string;
  mode: DragMode;
  startX: number;
  origStart: number;
  origEnd: number;
}

interface ConnectState {
  fromTaskId: string;
  fromX: number;
  fromY: number;
  currentX: number;
  currentY: number;
  toTaskId: string | null;
}

// ズームレベルの定義
type ZoomLevel = 'day' | 'week' | 'month';
const ZOOM_CONFIG: Record<ZoomLevel, { dayWidth: number; label: string; showDayNumbers: boolean }> = {
  day:   { dayWidth: 40, label: '日', showDayNumbers: true },
  week:  { dayWidth: 20, label: '週', showDayNumbers: false },
  month: { dayWidth: 8,  label: '月', showDayNumbers: false },
};

const DAY = 86400000;
const ROW_HEIGHT = 40;
const TASK_LABEL_WIDTH = 260;
const CONNECT_HANDLE_W = 10;

// ガントフィルター型
interface GanttFilters {
  search: string;
  status: string[];
  priority: string[];
  assigneeId: string;
  dueFilter: '' | 'overdue' | 'today' | 'week';
  showMilestonesOnly: boolean;
}

const DEFAULT_FILTERS: GanttFilters = {
  search: '',
  status: [],
  priority: [],
  assigneeId: '',
  dueFilter: '',
  showMilestonesOnly: false,
};

export function GanttChart({ projectId, members = [] }: GanttChartProps) {
  const navigate = useNavigate();
  const { data: tasksData, isLoading } = useTasks(projectId);
  const { data: depsData } = useProjectDependencies(projectId);
  const updateTask = useUpdateTask();
  const addDep = useAddTaskDependency();
  const allTasks = tasksData?.data || [];
  const dependencies = depsData?.data || [];

  // Zoom & filter state
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [filters, setFilters] = useState<GanttFilters>(DEFAULT_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Bar drag state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const dragMoved = useRef(false);

  // Connection draw state
  const [connectState, setConnectState] = useState<ConnectState | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const prevProjectIdRef = useRef(projectId);

  if (prevProjectIdRef.current !== projectId) {
    prevProjectIdRef.current = projectId;
    scrolledRef.current = false;
  }

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filtered tasks (client-side filtering on already-fetched data)
  const tasks = useMemo(() => {
    const now = Date.now();
    return allTasks.filter(task => {
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status.length && !filters.status.includes(task.status)) return false;
      if (filters.priority.length && !filters.priority.includes(task.priority)) return false;
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
      if (filters.showMilestonesOnly && !task.isMilestone) return false;
      if (filters.dueFilter === 'overdue') {
        if (!task.dueDate || task.dueDate >= now) return false;
      } else if (filters.dueFilter === 'today') {
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        if (!task.dueDate || task.dueDate < now - DAY || task.dueDate > todayEnd.getTime()) return false;
      } else if (filters.dueFilter === 'week') {
        if (!task.dueDate || task.dueDate < now || task.dueDate > now + 7 * DAY) return false;
      }
      return true;
    });
  }, [allTasks, filters]);

  const hasActiveFilters = filters.status.length > 0 || filters.priority.length > 0 || filters.assigneeId || filters.dueFilter || filters.showMilestonesOnly || filters.search;

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
  }, []);

  const { dayWidth } = ZOOM_CONFIG[zoom];

  const { startDate, endDate, totalDays } = useMemo(() => {
    const now = Date.now();
    const dates = allTasks
      .filter(t => t.startDate || t.dueDate)
      .map(t => {
        const s = t.startDate || t.createdAt;
        const e = t.dueDate || s + 7 * DAY;
        return [s, e];
      })
      .flat();

    const minDate = dates.length > 0 ? Math.min(...dates, now) : now - 30 * DAY;
    const maxDate = dates.length > 0 ? Math.max(...dates, now) : now + 30 * DAY;

    const start = minDate - 7 * DAY;
    const end = maxDate + 14 * DAY;
    const days = Math.ceil((end - start) / DAY);

    return { startDate: start, endDate: end, totalDays: days };
  }, [allTasks]);

  const msPerPx = DAY / dayWidth;

  const getTaskDates = useCallback((task: typeof tasks[number]) => {
    const taskStart = task.startDate || task.createdAt;
    const taskEnd = task.dueDate || taskStart + 7 * DAY;
    return { taskStart, taskEnd };
  }, []);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (!containerRef.current) return;
    const todayPx = ((Date.now() - startDate) / DAY) * dayWidth;
    const containerW = containerRef.current.clientWidth;
    containerRef.current.scrollLeft = Math.max(0, todayPx - containerW / 2);
  }, [startDate, dayWidth]);

  // Auto-scroll on load
  useEffect(() => {
    if (isLoading || scrolledRef.current || !containerRef.current) return;
    scrollToToday();
    scrolledRef.current = true;
  }, [isLoading, scrollToToday]);

  // Reset auto-scroll when zoom changes
  useEffect(() => {
    scrolledRef.current = false;
  }, [zoom]);

  // --- Bar drag handlers ---
  const handlePointerDown = useCallback((e: React.PointerEvent, taskId: string, mode: DragMode, taskStart: number, taskEnd: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ taskId, mode, startX: e.clientX, origStart: taskStart, origEnd: taskEnd });
    setDragDelta(0);
    dragMoved.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragState) {
      const delta = e.clientX - dragState.startX;
      if (Math.abs(delta) > 3) dragMoved.current = true;
      setDragDelta(delta);
    }
  }, [dragState]);

  const handlePointerUp = useCallback(() => {
    if (!dragState) return;
    const deltaMs = dragDelta * msPerPx;
    const deltaDays = Math.round(deltaMs / DAY);
    const snapMs = deltaDays * DAY;

    if (deltaDays !== 0) {
      const data: Record<string, unknown> = {};
      if (dragState.mode === 'move') {
        data.startDate = dragState.origStart + snapMs;
        data.dueDate = dragState.origEnd + snapMs;
      } else if (dragState.mode === 'resize-right') {
        data.dueDate = Math.max(dragState.origStart + DAY, dragState.origEnd + snapMs);
      } else if (dragState.mode === 'resize-left') {
        data.startDate = Math.min(dragState.origEnd - DAY, dragState.origStart + snapMs);
      }
      updateTask.mutate({ id: dragState.taskId, data });
    }
    setDragState(null);
    setDragDelta(0);
  }, [dragState, dragDelta, msPerPx, updateTask]);

  const handleBarClick = useCallback((taskId: string) => {
    if (!dragMoved.current) navigate(`/tasks/${taskId}`);
  }, [navigate]);

  const getDragDates = useCallback(() => {
    if (!dragState) return { newStart: 0, newEnd: 0, days: 0 };
    const snapMs = Math.round(dragDelta * msPerPx / DAY) * DAY;
    let newStart = dragState.origStart;
    let newEnd = dragState.origEnd;
    if (dragState.mode === 'move') { newStart += snapMs; newEnd += snapMs; }
    else if (dragState.mode === 'resize-right') newEnd = Math.max(dragState.origStart + DAY, dragState.origEnd + snapMs);
    else if (dragState.mode === 'resize-left') newStart = Math.min(dragState.origEnd - DAY, dragState.origStart + snapMs);
    return { newStart, newEnd, days: Math.round((newEnd - newStart) / DAY) };
  }, [dragState, dragDelta, msPerPx]);

  // --- Connection drag handlers ---
  const getChartCoords = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = chartAreaRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const taskIndexAtY = useCallback((y: number) => {
    const idx = Math.floor(y / ROW_HEIGHT);
    return idx >= 0 && idx < tasks.length ? idx : null;
  }, [tasks.length]);

  const handleConnectStart = useCallback((e: React.PointerEvent, fromTaskId: string, barRight: number, rowIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const startY = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    setConnectState({ fromTaskId, fromX: barRight, fromY: startY, currentX: barRight, currentY: startY, toTaskId: null });
  }, []);

  const handleConnectMove = useCallback((e: React.PointerEvent) => {
    if (!connectState) return;
    const { x, y } = getChartCoords(e);
    const idx = taskIndexAtY(y);
    const toTaskId = idx !== null && tasks[idx].id !== connectState.fromTaskId ? tasks[idx].id : null;
    setConnectState(prev => prev ? { ...prev, currentX: x, currentY: y, toTaskId } : prev);
  }, [connectState, getChartCoords, taskIndexAtY, tasks]);

  const handleConnectEnd = useCallback(() => {
    if (!connectState) return;
    if (connectState.toTaskId) {
      const already = dependencies.some(
        d => d.taskId === connectState.toTaskId && d.dependsOnTaskId === connectState.fromTaskId,
      );
      if (!already) {
        addDep.mutate({ taskId: connectState.toTaskId, dependsOnTaskId: connectState.fromTaskId });
      }
    }
    setConnectState(null);
  }, [connectState, dependencies, addDep]);

  if (isLoading) return <SkeletonGantt />;

  // --- Computed layout values ---
  const todayOffset = ((Date.now() - startDate) / DAY) * dayWidth;
  const chartHeight = tasks.length * ROW_HEIGHT;
  const { showDayNumbers } = ZOOM_CONFIG[zoom];

  // Month headers
  const months: { label: string; width: number; left: number }[] = [];
  const tempDate = new Date(startDate);
  while (tempDate.getTime() < endDate) {
    const monthStart = tempDate.getTime();
    const month = tempDate.getMonth();
    while (tempDate.getMonth() === month && tempDate.getTime() < endDate) tempDate.setDate(tempDate.getDate() + 1);
    const monthEnd = Math.min(tempDate.getTime(), endDate);
    months.push({
      label: new Date(monthStart).toLocaleDateString('ja', { month: 'short', year: 'numeric' }),
      width: ((monthEnd - monthStart) / DAY) * dayWidth,
      left: ((monthStart - startDate) / DAY) * dayWidth,
    });
  }

  // Week headers (for week/month zoom)
  const weeks: { label: string; left: number; width: number }[] = [];
  if (zoom === 'week' || zoom === 'month') {
    const cur = new Date(startDate);
    // Advance to start of week (Mon)
    const dow = cur.getDay();
    cur.setDate(cur.getDate() - (dow === 0 ? 6 : dow - 1));
    while (cur.getTime() < endDate) {
      const wStart = Math.max(cur.getTime(), startDate);
      cur.setDate(cur.getDate() + 7);
      const wEnd = Math.min(cur.getTime(), endDate);
      if (wEnd <= startDate) continue;
      const weekNum = Math.ceil((new Date(wStart).getDate()) / 7);
      weeks.push({
        label: `W${weekNum}`,
        left: ((wStart - startDate) / DAY) * dayWidth,
        width: ((wEnd - wStart) / DAY) * dayWidth,
      });
    }
  }

  // Day grid columns
  const dayColumns: { left: number; isWeekend: boolean; isMonday: boolean; date: Date }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate + i * DAY);
    const dow = d.getDay();
    dayColumns.push({ left: i * dayWidth, isWeekend: dow === 0 || dow === 6, isMonday: dow === 1, date: d });
  }

  // Task index map for arrow rendering
  const taskIndexMap = new Map<string, number>();
  tasks.forEach((t, i) => taskIndexMap.set(t.id, i));

  const getBarRect = (task: typeof tasks[number], isDragging: boolean) => {
    const { taskStart, taskEnd } = getTaskDates(task);
    let left = ((taskStart - startDate) / DAY) * dayWidth;
    let width = Math.max(((taskEnd - taskStart) / DAY) * dayWidth, dayWidth);
    if (isDragging && dragState) {
      if (dragState.mode === 'move') left += dragDelta;
      else if (dragState.mode === 'resize-right') width = Math.max(dayWidth, width + dragDelta);
      else if (dragState.mode === 'resize-left') {
        const nw = width - dragDelta;
        if (nw >= dayWidth) { left += dragDelta; width = nw; }
      }
    }
    return { left, right: left + width };
  };

  // Existing dependency arrows
  const arrowPaths: { d: string; key: string }[] = [];
  for (const dep of dependencies) {
    const fromIdx = taskIndexMap.get(dep.dependsOnTaskId);
    const toIdx = taskIndexMap.get(dep.taskId);
    if (fromIdx === undefined || toIdx === undefined) continue;
    const fromRect = getBarRect(tasks[fromIdx], dragState?.taskId === tasks[fromIdx].id);
    const toRect = getBarRect(tasks[toIdx], dragState?.taskId === tasks[toIdx].id);
    const x1 = fromRect.right, y1 = fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x2 = toRect.left, y2 = toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const cx = (x1 + x2) / 2;
    arrowPaths.push({ d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`, key: `${dep.dependsOnTaskId}-${dep.taskId}` });
  }

  // Mobile fallback
  const MobileGanttList = (
    <div className="md:hidden bg-surface rounded-xl border border-outline-variant overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
        <span className="text-sm font-semibold text-on-surface">タスク一覧</span>
        <span className="text-xs text-on-surface-variant">ガントチャートはPC表示でご確認ください</span>
      </div>
      {tasks.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-on-surface-variant">タスクがありません</div>
      ) : (
        <ul className="divide-y divide-outline-variant/30">
          {tasks.map((task) => {
            const { taskStart, taskEnd } = getTaskDates(task);
            const statusColor = TASK_STATUS_COLORS[task.status as TaskStatusType] || '#94a3b8';
            const statusLabel = TASK_STATUS_LABELS[task.status as TaskStatusType] || task.status;
            const durationDays = Math.round((taskEnd - taskStart) / DAY);
            return (
              <li
                key={task.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: statusColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {task.isMilestone && <span className="text-amber-500 mr-1">◆</span>}
                    {task.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-xs text-on-surface-variant">{statusLabel}</span>
                    {task.dueDate && (
                      <span className="text-xs text-on-surface-variant">
                        期限: {new Date(task.dueDate).toLocaleDateString('ja')}
                      </span>
                    )}
                    {task.startDate && (
                      <span className="text-xs text-on-surface-variant">{durationDays}日間</span>
                    )}
                    {task.progress > 0 && (
                      <span className="text-xs text-on-surface-variant">{task.progress}%</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <>
      {/* ===== Filter & Toolbar ===== */}
      <div className="hidden md:block mb-3 bg-surface-container-low rounded-2xl border border-outline-variant">
        {/* Top row: search + zoom + today + filter toggle */}
        <div className="flex items-center gap-2 p-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="タスクを検索..."
              className="w-full pl-9 pr-8 py-1.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setFilters(f => ({ ...f, search: '' })); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-surface-container-highest">
                <X className="w-3.5 h-3.5 text-on-surface-variant" />
              </button>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-outline-variant rounded-xl overflow-hidden">
            {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  zoom === z
                    ? 'bg-primary-600 text-white'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {ZOOM_CONFIG[z].label}
              </button>
            ))}
          </div>

          {/* Zoom in/out */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(z => z === 'month' ? 'week' : 'day')}
              disabled={zoom === 'day'}
              className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors disabled:opacity-40"
              title="ズームイン"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(z => z === 'day' ? 'week' : 'month')}
              disabled={zoom === 'month'}
              className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors disabled:opacity-40"
              title="ズームアウト"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            title="今日の位置へ移動"
          >
            <Calendar className="w-3.5 h-3.5" />
            今日
          </button>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersExpanded(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border transition-colors ${
              hasActiveFilters
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>フィルター</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-600" />}
            {filtersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container-highest transition-colors"
            >
              クリア
            </button>
          )}

          {/* Task count */}
          <span className="text-xs text-on-surface-variant ml-auto">
            {tasks.length}/{allTasks.length} タスク
          </span>
        </div>

        {/* Expanded filters */}
        {filtersExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-outline-variant pt-3">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-on-surface-variant mb-1.5">ステータス</p>
              <div className="flex flex-wrap gap-1.5">
                {TASK_STATUSES.map((status) => {
                  const isActive = filters.status.includes(status);
                  const color = TASK_STATUS_COLORS[status as TaskStatusType];
                  return (
                    <button
                      key={status}
                      onClick={() => setFilters(f => ({
                        ...f,
                        status: isActive ? f.status.filter(s => s !== status) : [...f.status, status],
                      }))}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        isActive ? 'border-transparent text-white' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                      style={isActive ? { backgroundColor: color } : undefined}
                    >
                      {TASK_STATUS_LABELS[status as TaskStatusType]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-semibold text-on-surface-variant mb-1.5">優先度</p>
              <div className="flex flex-wrap gap-1.5">
                {TASK_PRIORITIES.map((priority) => {
                  const isActive = filters.priority.includes(priority);
                  const color = TASK_PRIORITY_COLORS[priority as TaskPriorityType];
                  return (
                    <button
                      key={priority}
                      onClick={() => setFilters(f => ({
                        ...f,
                        priority: isActive ? f.priority.filter(p => p !== priority) : [...f.priority, priority],
                      }))}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        isActive ? 'border-transparent text-white' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                      style={isActive ? { backgroundColor: color } : undefined}
                    >
                      {TASK_PRIORITY_LABELS[priority as TaskPriorityType]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due date filter + Assignee + Milestone */}
            <div className="flex flex-wrap gap-4">
              {/* Due filter */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant mb-1.5">期限</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { value: 'overdue', label: '期限切れ' },
                    { value: 'today', label: '今日' },
                    { value: 'week', label: '7日以内' },
                  ] as const).map(({ value, label }) => {
                    const isActive = filters.dueFilter === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setFilters(f => ({ ...f, dueFilter: isActive ? '' : value }))}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          isActive
                            ? value === 'overdue'
                              ? 'bg-error text-white border-transparent'
                              : 'bg-primary-600 text-white border-transparent'
                            : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assignee */}
              {members.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant mb-1.5">担当者</p>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-on-surface-variant" />
                    <select
                      value={filters.assigneeId}
                      onChange={(e) => setFilters(f => ({ ...f, assigneeId: e.target.value }))}
                      className="px-3 py-1.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">すべて</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>{m.user.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Milestone only */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant mb-1.5">表示</p>
                <button
                  onClick={() => setFilters(f => ({ ...f, showMilestonesOnly: !f.showMilestonesOnly }))}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    filters.showMilestonesOnly
                      ? 'bg-amber-500 text-white border-transparent'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  <span>◆</span> マイルストーンのみ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== Mobile list ===== */}
      {MobileGanttList}

      {/* ===== Desktop Gantt ===== */}
      <div className="hidden md:block bg-surface rounded-xl border border-outline-variant overflow-hidden">
        {tasks.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-on-surface-variant">
            {hasActiveFilters ? 'フィルター条件に一致するタスクが見つかりません。' : 'タスクがありません。'}
          </div>
        ) : (
          <div className="overflow-x-auto" ref={containerRef}>
            <div
              style={{ width: totalDays * dayWidth + TASK_LABEL_WIDTH, minWidth: '100%' }}
              onPointerMove={(e) => { handlePointerMove(e); handleConnectMove(e); }}
              onPointerUp={() => { handlePointerUp(); handleConnectEnd(); }}
              onPointerCancel={() => { handlePointerUp(); setConnectState(null); }}
            >
              {/* Month headers */}
              <div className="flex border-b border-outline-variant">
                <div className="flex-shrink-0 px-4 py-2 bg-surface-container-low border-r border-outline-variant" style={{ width: TASK_LABEL_WIDTH }}>
                  <span className="text-xs font-semibold text-on-surface-variant">タスク</span>
                </div>
                <div className="relative flex-1" style={{ height: zoom === 'day' ? 32 : 52 }}>
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 text-xs font-medium text-on-surface-variant px-2 py-1 border-r border-outline-variant/50 bg-surface-container-low/50"
                      style={{ left: m.left, width: m.width, height: zoom === 'day' ? 32 : 28 }}>
                      {m.label}
                    </div>
                  ))}
                  {/* Week sub-row for week/month zoom */}
                  {(zoom === 'week' || zoom === 'month') && weeks.map((w, i) => (
                    <div key={i} className="absolute text-[10px] text-on-surface-variant/70 px-1 border-r border-outline-variant/30"
                      style={{ left: w.left, width: w.width, top: 28, height: 24, display: 'flex', alignItems: 'center' }}>
                      {w.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Task rows + SVG overlays */}
              <div className="relative">
                {/* Chart area SVG */}
                <svg
                  ref={chartAreaRef as any}
                  className="absolute pointer-events-none z-20"
                  style={{ left: TASK_LABEL_WIDTH, top: 0, width: totalDays * dayWidth, height: chartHeight }}
                >
                  <defs>
                    <marker id="dep-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" fillOpacity="0.9" />
                    </marker>
                    <marker id="connect-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#6366f1" fillOpacity="0.9" />
                    </marker>
                  </defs>

                  {arrowPaths.map(({ d, key }) => (
                    <path key={key} d={d} fill="none" stroke="#94a3b8" strokeWidth="1.5"
                      strokeOpacity="0.75" strokeDasharray="5 3" markerEnd="url(#dep-arrow)" />
                  ))}

                  {connectState && (() => {
                    const toIdx = connectState.toTaskId ? taskIndexMap.get(connectState.toTaskId) : undefined;
                    let tx = connectState.currentX;
                    let ty = connectState.currentY;
                    if (toIdx !== undefined && connectState.toTaskId) {
                      const toRect = getBarRect(tasks[toIdx], false);
                      tx = toRect.left;
                      ty = toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    }
                    const cx = (connectState.fromX + tx) / 2;
                    const d = `M ${connectState.fromX} ${connectState.fromY} C ${cx} ${connectState.fromY}, ${cx} ${ty}, ${tx} ${ty}`;
                    return (
                      <>
                        <path d={d} fill="none" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.8"
                          strokeDasharray="6 3" markerEnd="url(#connect-arrow)" />
                        {toIdx !== undefined && connectState.toTaskId && (() => {
                          const toRect = getBarRect(tasks[toIdx], false);
                          return <rect x={toRect.left} y={toIdx * ROW_HEIGHT + 4} width={toRect.right - toRect.left} height={ROW_HEIGHT - 8}
                            rx="4" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />;
                        })()}
                      </>
                    );
                  })()}
                </svg>

                {/* Task rows */}
                {tasks.map((task, rowIdx) => {
                  const { taskStart, taskEnd } = getTaskDates(task);
                  const statusColor = TASK_STATUS_COLORS[task.status as TaskStatusType] || '#94a3b8';
                  const progress = task.progress || 0;
                  const isDragging = dragState?.taskId === task.id;
                  const durationDays = Math.round((taskEnd - taskStart) / DAY);
                  const isMilestone = task.isMilestone;

                  let visualLeft = ((taskStart - startDate) / DAY) * dayWidth;
                  let visualWidth = Math.max(((taskEnd - taskStart) / DAY) * dayWidth, dayWidth);
                  if (isDragging && dragState) {
                    if (dragState.mode === 'move') visualLeft += dragDelta;
                    else if (dragState.mode === 'resize-right') visualWidth = Math.max(dayWidth, visualWidth + dragDelta);
                    else if (dragState.mode === 'resize-left') {
                      const nw = visualWidth - dragDelta;
                      if (nw >= dayWidth) { visualLeft += dragDelta; visualWidth = nw; }
                    }
                  }

                  const isConnectTarget = connectState?.toTaskId === task.id;

                  return (
                    <div key={task.id} className={`flex border-b border-outline-variant/30 transition-colors ${isConnectTarget ? 'bg-primary/5' : 'hover:bg-surface-container-low/50'} group`}>
                      {/* Task label */}
                      <div
                        className="flex-shrink-0 px-3 border-r border-outline-variant flex items-center gap-2 cursor-pointer hover:bg-surface-container-low transition-colors"
                        style={{ width: TASK_LABEL_WIDTH, height: ROW_HEIGHT }}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        {isMilestone && (
                          <span className="text-amber-500 text-sm shrink-0">◆</span>
                        )}
                        <span className={`text-xs text-on-surface truncate flex-1 ${isMilestone ? 'font-semibold' : ''}`}>
                          {task.title}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60 shrink-0">{durationDays}d</span>
                        {progress > 0 && (
                          <span className="text-[10px] font-medium shrink-0" style={{ color: statusColor }}>{progress}%</span>
                        )}
                      </div>

                      {/* Chart area */}
                      <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                        {dayColumns.map((col, i) => (
                          <div key={i}
                            className={`absolute top-0 bottom-0 border-r ${col.isWeekend ? 'bg-surface-container-low/40 border-outline-variant/20' : col.isMonday ? 'border-outline-variant/30' : 'border-outline-variant/10'}`}
                            style={{ left: col.left, width: dayWidth }}
                          >
                            {showDayNumbers && !col.isWeekend && (
                              <span className="absolute top-0.5 left-0.5 text-[9px] text-on-surface-variant/40">{col.date.getDate()}</span>
                            )}
                          </div>
                        ))}

                        {/* Today line */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/70 z-10" style={{ left: todayOffset }} />

                        {/* Milestone diamond marker */}
                        {isMilestone ? (
                          <div
                            className={`absolute z-10 flex items-center justify-center cursor-pointer ${isDragging ? 'z-30' : ''}`}
                            style={{ left: visualLeft + visualWidth / 2 - 10, top: 8, width: 24, height: ROW_HEIGHT - 16 }}
                            onPointerDown={(e) => handlePointerDown(e, task.id, 'move', taskStart, taskEnd)}
                            onClick={() => handleBarClick(task.id)}
                          >
                            <div
                              className="w-5 h-5 rotate-45 border-2"
                              style={{ backgroundColor: `${statusColor}40`, borderColor: statusColor }}
                            />
                            {isDragging && (() => {
                              const { newStart, newEnd, days } = getDragDates();
                              return (
                                <div className="absolute text-[10px] font-medium bg-slate-900 text-white px-2 py-1 rounded-md whitespace-nowrap z-30 shadow-lg" style={{ top: -32, left: -20 }}>
                                  <span>{new Date(newStart).toLocaleDateString('ja')}</span>
                                  <span className="text-white/50 mx-1">→</span>
                                  <span>{new Date(newEnd).toLocaleDateString('ja')}</span>
                                  <span className="text-primary-300 ml-1.5">({days}日間)</span>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          /* Regular task bar */
                          <div
                            className={`absolute rounded-md overflow-visible transition-shadow ${isDragging ? 'shadow-lg z-30 ring-2 ring-primary-400/70' : 'hover:shadow-md'}`}
                            style={{ left: visualLeft, width: visualWidth, top: 8, height: ROW_HEIGHT - 16 }}
                          >
                            <div className="absolute inset-0 rounded-md" style={{ backgroundColor: `${statusColor}25` }} />
                            {progress > 0 && (
                              <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${progress}%`, backgroundColor: `${statusColor}55` }} />
                            )}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md" style={{ backgroundColor: statusColor }} />

                            {/* Progress badge inside bar (when bar is wide enough) */}
                            {progress > 0 && visualWidth > 48 && (
                              <span
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1 py-0.5 rounded-sm pointer-events-none"
                                style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
                              >
                                {progress}%
                              </span>
                            )}

                            <span className="absolute inset-0 flex items-center pl-2 pr-6 text-[11px] font-medium truncate pointer-events-none" style={{ color: statusColor }}>
                              {task.title}
                            </span>

                            {/* Left resize handle */}
                            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/10 rounded-l-md z-10"
                              onPointerDown={(e) => handlePointerDown(e, task.id, 'resize-left', taskStart, taskEnd)} />

                            {/* Move handle */}
                            <div className="absolute left-2 right-6 top-0 bottom-0 cursor-grab active:cursor-grabbing z-10"
                              onPointerDown={(e) => handlePointerDown(e, task.id, 'move', taskStart, taskEnd)}
                              onClick={() => handleBarClick(task.id)} />

                            {/* Right resize handle */}
                            <div className="absolute right-5 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/10 z-10"
                              onPointerDown={(e) => handlePointerDown(e, task.id, 'resize-right', taskStart, taskEnd)} />

                            {/* Connection handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 flex items-center justify-center cursor-crosshair z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ width: CONNECT_HANDLE_W + 4 }}
                              title="ドラッグして依存関係を接続"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                handleConnectStart(e, task.id, visualLeft + visualWidth, rowIdx);
                              }}
                            >
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 bg-indigo-100" />
                            </div>
                          </div>
                        )}

                        {/* Date tooltip on drag (for non-milestone bars) */}
                        {isDragging && !isMilestone && (() => {
                          const { newStart, newEnd, days } = getDragDates();
                          return (
                            <div className="absolute text-[10px] font-medium bg-slate-900 text-white px-2 py-1 rounded-md whitespace-nowrap z-30 shadow-lg" style={{ left: visualLeft, top: -28 }}>
                              <span>{new Date(newStart).toLocaleDateString('ja')}</span>
                              <span className="text-white/50 mx-1">→</span>
                              <span>{new Date(newEnd).toLocaleDateString('ja')}</span>
                              <span className="text-primary-300 ml-1.5">({days}日間)</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Today label */}
              {todayOffset > 0 && todayOffset < totalDays * dayWidth && (
                <div className="flex">
                  <div style={{ width: TASK_LABEL_WIDTH }} className="flex-shrink-0" />
                  <div className="relative flex-1" style={{ height: 20 }}>
                    <div className="absolute text-[9px] font-bold text-red-400 whitespace-nowrap" style={{ left: todayOffset - 10, top: 2 }}>今日</div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-outline-variant/30 bg-surface-container-low/30 text-[10px] text-on-surface-variant">
                {dependencies.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg width="36" height="12" style={{ overflow: 'visible' }}>
                      <defs>
                        <marker id="legend-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" fillOpacity="0.9" />
                        </marker>
                      </defs>
                      <line x1="0" y1="6" x2="28" y2="6" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#legend-arrow)" />
                    </svg>
                    <span>依存関係 ({dependencies.length})</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 bg-indigo-100" />
                  <span>右端をドラッグ → 依存を接続</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500">◆</span>
                  <span>マイルストーン</span>
                </div>
                <span className="ml-auto">ズーム: {ZOOM_CONFIG[zoom].label}ビュー</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
