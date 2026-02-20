import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks, useCreateTask, useBatchUpdateTasks, useBatchDeleteTasks } from '../hooks/useTasks';
import { useProject, useProjectMembers } from '../hooks/useProjects';
import { ProjectNav } from '../components/layout/ProjectNav';
import { TaskFilterBar } from '../components/task/TaskFilterBar';
import { SkeletonTable } from '../components/common/Skeleton';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { TextArea } from '../components/common/TextArea';
import { Select } from '../components/common/Select';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Trash2, CheckSquare, X, AlertTriangle, Download, Upload } from 'lucide-react';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TASK_STATUSES } from '@cloudtask/shared';
import { formatDate, daysUntil } from '@cloudtask/shared';
import type { TaskStatusType, TaskPriorityType } from '@cloudtask/shared';
import type { TaskFiltersParam } from '../api/tasks';
import { api } from '../api/client';
import { TaskCSVImport } from '../components/task/TaskCSVImport';

export function ProjectListViewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId!);
  const { data: membersData } = useProjectMembers(projectId!);
  const createTask = useCreateTask();
  const batchUpdate = useBatchUpdateTasks();
  const batchDelete = useBatchDeleteTasks();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [filters, setFilters] = useState<TaskFiltersParam>({});

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');

  const { data: tasksData, isLoading } = useTasks(projectId!, filters);
  const tasks = tasksData?.data || [];
  const members = membersData?.data || [];

  const handleFiltersChange = useCallback((newFilters: TaskFiltersParam) => {
    setFilters(newFilters);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.priority?.length) params.set('priority', filters.priority.join(','));
      if (filters.assigneeId) params.set('assignee_id', filters.assigneeId);
      if (filters.search) params.set('search', filters.search);
      const query = params.toString();
      const path = `/projects/${projectId}/tasks/export${query ? `?${query}` : ''}`;
      const projectName = project?.data?.name ?? 'tasks';
      const date = new Date().toISOString().slice(0, 10);
      await api.download(path, `tasks-${projectName}-${date}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTask.mutate({
      projectId: projectId!, title, description: description || undefined,
      priority, assigneeId: assigneeId || undefined,
      startDate: newStartDate ? new Date(newStartDate).getTime() : undefined,
      endDate: newEndDate ? new Date(newEndDate).getTime() : undefined,
    }, { onSuccess: () => { setShowCreate(false); setTitle(''); setDescription(''); setPriority('medium'); setAssigneeId(''); setNewStartDate(''); setNewEndDate(''); } });
  };

  const toggleSelect = (taskId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatchStatusChange = (status: string) => {
    if (!status || selectedIds.size === 0) return;
    batchUpdate.mutate({ taskIds: Array.from(selectedIds), data: { status } }, {
      onSuccess: () => { clearSelection(); setBatchStatus(''); },
    });
  };

  const handleBatchDelete = () => {
    batchDelete.mutate(Array.from(selectedIds), {
      onSuccess: () => { clearSelection(); setShowBatchDelete(false); },
    });
  };

  const isAllSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const isSomeSelected = selectedIds.size > 0;

  if (isLoading) {
    return (
      <div>
        <ProjectNav />
        <div className="flex items-center justify-between mb-4">
          <div className="h-7 w-48 bg-surface-container-highest animate-skeleton rounded-sm" />
          <div className="h-9 w-28 bg-surface-container-highest animate-skeleton rounded-xl" />
        </div>
        <SkeletonTable rows={8} />
      </div>
    );
  }

  return (
    <div>
      <ProjectNav />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-on-surface">{project?.data?.name} - Task List</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            Import CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
        </div>
      </div>

      <TaskFilterBar filters={filters} onFiltersChange={handleFiltersChange} members={members} />

      {/* Batch Action Toolbar */}
      {isSomeSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl animate-in">
          <CheckSquare className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-medium text-primary-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Select
              value={batchStatus}
              onChange={(e) => { setBatchStatus(e.target.value); handleBatchStatusChange(e.target.value); }}
              options={TASK_STATUSES.map(s => ({ value: s, label: TASK_STATUS_LABELS[s] }))}
              placeholder="Status Update"
              className="text-xs h-8"
            />
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowBatchDelete(true)}
              loading={batchDelete.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Bulk Delete
            </Button>
            <button onClick={clearSelection} className="p-1 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks"
          description={filters.search || filters.status?.length || filters.priority?.length || filters.assigneeId
            ? 'No tasks match the current filter criteria.'
            : 'No tasks have been created yet.'}
        />
      ) : (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-outline-variant">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-outline-variant text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant hidden sm:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant hidden md:table-cell">Assignee</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant hidden md:table-cell">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {tasks.map((task) => {
                  const isSelected = selectedIds.has(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-surface-container-highest cursor-pointer ${isSelected ? 'bg-primary-50/50' : ''}`}
                    >
                      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(task.id)}
                          className="w-4 h-4 rounded border-outline-variant text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3" onClick={() => navigate(`/tasks/${task.id}`)}>
                        <span className="font-medium text-on-surface">{task.title}</span>
                        <div className="flex gap-2 mt-1 sm:hidden">
                          <Badge text={TASK_STATUS_LABELS[task.status as TaskStatusType]} color={TASK_STATUS_COLORS[task.status as TaskStatusType]} />
                          <Badge text={TASK_PRIORITY_LABELS[task.priority as TaskPriorityType]} color={TASK_PRIORITY_COLORS[task.priority as TaskPriorityType]} />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" onClick={() => navigate(`/tasks/${task.id}`)}>
                        <Badge text={TASK_STATUS_LABELS[task.status as TaskStatusType]} color={TASK_STATUS_COLORS[task.status as TaskStatusType]} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" onClick={() => navigate(`/tasks/${task.id}`)}>
                        <Badge text={TASK_PRIORITY_LABELS[task.priority as TaskPriorityType]} color={TASK_PRIORITY_COLORS[task.priority as TaskPriorityType]} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={() => navigate(`/tasks/${task.id}`)}>
                        {task.assignee ? <div className="flex items-center gap-2"><Avatar name={task.assignee.displayName} size="sm" /><span className="text-on-surface-variant">{task.assignee.displayName}</span></div> : <span className="text-on-surface-variant">未割当</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={() => navigate(`/tasks/${task.id}`)}>
                        {task.dueDate ? (() => {
                          const days = daysUntil(task.dueDate);
                          const isCompleted = task.status === 'done' || task.status === 'completed';
                          if (!isCompleted && days < 0) return (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-error">
                              <AlertTriangle className="w-3 h-3" />{formatDate(task.dueDate)}
                            </span>
                          );
                          if (!isCompleted && days === 0) return <span className="text-xs font-semibold text-warning">{formatDate(task.dueDate)}</span>;
                          return <span className="text-xs text-on-surface-variant">{formatDate(task.dueDate)}</span>;
                        })() : <span className="text-xs text-on-surface-variant">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Task"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={handleCreate} loading={createTask.isPending}>Create</Button></>}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
          <Select label="Assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} options={members.map(m => ({ value: m.userId, label: m.user.displayName }))} placeholder="Unassigned" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
          </div>
        </form>
      </Modal>

      <TaskCSVImport
        projectId={projectId!}
        isOpen={showImport}
        onClose={() => setShowImport(false)}
      />

      <ConfirmDialog
        isOpen={showBatchDelete}
        onClose={() => setShowBatchDelete(false)}
        onConfirm={handleBatchDelete}
        title="Delete Tasks"
        message={`Are you sure you want to delete ${selectedIds.size} selected tasks? This action cannot be undone.`}
        loading={batchDelete.isPending}
      />
    </div>
  );
}
