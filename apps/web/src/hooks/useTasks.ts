import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasksApi, getTaskApi, createTaskApi, updateTaskApi, deleteTaskApi, getSubTasksApi, batchUpdateTasksApi, batchDeleteTasksApi, getTaskDependenciesApi, getProjectDependenciesApi, addTaskDependencyApi, removeTaskDependencyApi, type BatchUpdateResult, type BatchDeleteResult } from '../api/tasks';

// デフォルト filters を定数にすることで、呼び出し元が引数を渡さない場合でも
// 毎レンダーで新しいオブジェクト参照が生成されず queryKey が安定する。
const EMPTY_FILTERS: Record<string, any> = {};

export function useTasks(projectId: string, filters: Record<string, any> = EMPTY_FILTERS) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () => getTasksApi(projectId, filters),
    enabled: !!projectId,
    staleTime: 30_000, // 30秒間はキャッシュを新鮮とみなし、バックグラウンドrefetchを抑制
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => getTaskApi(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTaskApi,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tasks', res.data.projectId] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateTaskApi(id, data),

    // Optimistic update: apply the change to all task-list caches immediately
    // so the board reflects the drop position with zero latency after drag ends.
    // cancelQueries is intentionally omitted here to avoid triggering re-renders
    // during an active drag (which caused infinite loop via dnd-kit's onDragOver).
    onMutate: async ({ id, data }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update.
      // This is safe here because onMutate fires after dragEnd (dnd-kit is no longer
      // in its synchronous sensor loop), so cancelling won't trigger the #185 loop.
      await qc.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot every task-list cache for rollback on error
      const previousTaskCaches = qc.getQueriesData<any>({ queryKey: ['tasks'] });

      // Apply optimistic update: patch the changed fields AND re-sort by sortOrder
      // so the card immediately appears in its new position without waiting for the API.
      qc.setQueriesData<any>({ queryKey: ['tasks'] }, (old: any) => {
        if (!old?.data) return old;
        const updated = old.data.map((task: any) =>
          task.id === id ? { ...task, ...data } : task
        );
        // Re-sort so the visual order matches the new sortOrder immediately
        updated.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return { ...old, data: updated };
      });

      return { previousTaskCaches };
    },

    onSuccess: (res, { data: mutatedData }) => {
      // Sync single-task detail cache with confirmed server response
      qc.setQueryData(['task', res.data.id], (old: any) => {
        if (!old) return old;
        return { ...old, data: { ...old.data, ...res.data } };
      });
      // Only invalidate (trigger refetch) when the status actually changed.
      // For same-column reorders the optimistic sort is already correct,
      // so we skip the refetch to avoid a visual "snap back then re-render" flicker.
      if (mutatedData.status !== undefined) {
        qc.invalidateQueries({ queryKey: ['tasks'] });
        qc.invalidateQueries({ queryKey: ['task', res.data.id] });
      }
    },

    // Roll back optimistic changes on API failure
    onError: (_err, _vars, context) => {
      if (context?.previousTaskCaches) {
        for (const [queryKey, data] of context.previousTaskCaches) {
          qc.setQueryData(queryKey, data);
        }
      }
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTaskApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useSubTasks(taskId: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => getSubTasksApi(taskId),
    enabled: !!taskId,
  });
}

export function useBatchUpdateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds, data }: { taskIds: string[]; data: Record<string, unknown> }) =>
      batchUpdateTasksApi(taskIds, data),
    onSuccess: (res: { data: BatchUpdateResult }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      if (res.data.failed.length > 0) {
        const msg = `${res.data.succeeded.length}件成功、${res.data.failed.length}件失敗しました。`;
        // eslint-disable-next-line no-console
        console.warn('[BatchUpdate] 部分失敗:', res.data.failed);
        window.alert(msg);
      }
    },
  });
}

export function useBatchDeleteTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskIds: string[]) => batchDeleteTasksApi(taskIds),
    onSuccess: (res: { data: BatchDeleteResult }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      if (res.data.failed.length > 0) {
        const msg = `${res.data.succeeded.length}件削除成功、${res.data.failed.length}件失敗しました。`;
        // eslint-disable-next-line no-console
        console.warn('[BatchDelete] 部分失敗:', res.data.failed);
        window.alert(msg);
      }
    },
  });
}

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: () => getTaskDependenciesApi(taskId),
    enabled: !!taskId,
  });
}

export function useProjectDependencies(projectId: string) {
  return useQuery({
    queryKey: ['dependencies', projectId],
    queryFn: () => getProjectDependenciesApi(projectId),
    enabled: !!projectId,
  });
}

export function useAddTaskDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) =>
      addTaskDependencyApi(taskId, dependsOnTaskId),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
      qc.invalidateQueries({ queryKey: ['dependencies'] });
    },
  });
}

export function useRemoveTaskDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) =>
      removeTaskDependencyApi(taskId, dependsOnTaskId),
    onSuccess: (_data, { taskId, dependsOnTaskId }) => {
      qc.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
      qc.invalidateQueries({ queryKey: ['task-dependencies', dependsOnTaskId] });
      qc.invalidateQueries({ queryKey: ['dependencies'] });
    },
  });
}
