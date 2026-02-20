import { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronUp, SlidersHorizontal, ArrowUpDown, Calendar } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TASK_STATUS_COLORS } from '@cloudtask/shared';
import type { TaskStatusType, TaskPriorityType } from '@cloudtask/shared';
import type { TaskFiltersParam } from '../../api/tasks';

const DUE_FILTER_OPTIONS: { value: NonNullable<TaskFiltersParam['dueFilter']>; label: string }[] = [
  { value: 'overdue', label: '期限切れ' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '7日以内' },
];

interface TaskFilterBarProps {
  filters: TaskFiltersParam;
  onFiltersChange: (filters: TaskFiltersParam) => void;
  members?: Array<{ userId: string; user: { displayName: string } }>;
}

export function TaskFilterBar({ filters, onFiltersChange, members = [] }: TaskFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [expanded, setExpanded] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        onFiltersChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleStatus = useCallback((status: string) => {
    const current = filters.status || [];
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, status: next.length ? next : undefined });
  }, [filters, onFiltersChange]);

  const togglePriority = useCallback((priority: string) => {
    const current = filters.priority || [];
    const next = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onFiltersChange({ ...filters, priority: next.length ? next : undefined });
  }, [filters, onFiltersChange]);

  const setAssignee = useCallback((assigneeId: string) => {
    onFiltersChange({ ...filters, assigneeId: assigneeId || undefined });
  }, [filters, onFiltersChange]);

  const setSortBy = useCallback((sortBy: string) => {
    onFiltersChange({ ...filters, sortBy: sortBy || undefined });
  }, [filters, onFiltersChange]);

  const toggleSortOrder = useCallback(() => {
    onFiltersChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [filters, onFiltersChange]);

  const setDueFilter = useCallback((dueFilter: TaskFiltersParam['dueFilter']) => {
    onFiltersChange({ ...filters, dueFilter: dueFilter || undefined });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters = !!(filters.status?.length || filters.priority?.length || filters.assigneeId || filters.search || filters.sortBy || filters.dueFilter);

  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant mb-4">
      {/* Search + Toggle Row */}
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-surface-container-highest">
              <X className="w-3.5 h-3.5 text-on-surface-variant" />
            </button>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors ${
            hasActiveFilters
              ? 'border-primary bg-primary-container text-on-primary-container'
              : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-600" />}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container-highest transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-outline-variant pt-3">
          {/* Status Filter */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant mb-1.5">ステータス</p>
            <div className="flex flex-wrap gap-1.5">
              {TASK_STATUSES.map((status) => {
                const isActive = filters.status?.includes(status);
                const color = TASK_STATUS_COLORS[status];
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      isActive
                        ? 'border-transparent text-white'
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                    style={isActive ? { backgroundColor: color } : undefined}
                  >
                    {TASK_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant mb-1.5">優先度</p>
            <div className="flex flex-wrap gap-1.5">
              {TASK_PRIORITIES.map((priority) => {
                const isActive = filters.priority?.includes(priority);
                const color = TASK_PRIORITY_COLORS[priority];
                return (
                  <button
                    key={priority}
                    onClick={() => togglePriority(priority)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      isActive
                        ? 'border-transparent text-white'
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                    style={isActive ? { backgroundColor: color } : undefined}
                  >
                    {TASK_PRIORITY_LABELS[priority]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date Filter */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              期限
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DUE_FILTER_OPTIONS.map(({ value, label }) => {
                const isActive = filters.dueFilter === value;
                return (
                  <button
                    key={value}
                    onClick={() => setDueFilter(isActive ? undefined : value)}
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

          {/* Assignee + Sort row */}
          <div className="flex flex-wrap gap-3">
            {/* Assignee */}
            {members.length > 0 && (
              <div className="flex-1 min-w-[160px]">
                <p className="text-xs font-semibold text-on-surface-variant mb-1.5">担当者</p>
                <select
                  value={filters.assigneeId || ''}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">すべて</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.displayName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort */}
            <div className="flex-1 min-w-[160px]">
              <p className="text-xs font-semibold text-on-surface-variant mb-1.5">ソート</p>
              <div className="flex gap-1.5">
                <select
                  value={filters.sortBy || ''}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">デフォルト</option>
                  <option value="title">タイトル</option>
                  <option value="priority">優先度</option>
                  <option value="due_date">期限</option>
                  <option value="created_at">作成日</option>
                </select>
                <button
                  onClick={toggleSortOrder}
                  className="px-2 py-1.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                  title={filters.sortOrder === 'desc' ? '降順' : '昇順'}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
