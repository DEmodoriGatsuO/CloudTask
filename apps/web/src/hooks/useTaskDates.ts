import { useEffect, useRef, useState } from 'react';
import { useUpdateTask } from './useTasks';
import { msToDateString, dateStringToMs } from '../components/common/DateInput';
import type { TaskWithRelations } from '@cloudtask/shared';

export function useTaskDates(task: TaskWithRelations | undefined, taskId: string) {
  const updateTask = useUpdateTask();

  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftDueDate, setDraftDueDate] = useState('');
  const [draftActualEndDate, setDraftActualEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  // Track whether dates have been initialized from server
  const datesInitialized = useRef(false);
  // When saving dates, suppress useEffect re-sync until refetch completes
  const suppressDateSync = useRef(false);

  // Sync date drafts from server data on initial load only
  useEffect(() => {
    if (!task) return;
    if (suppressDateSync.current) return;
    if (!datesInitialized.current) {
      setDraftStartDate(msToDateString(task.startDate));
      setDraftDueDate(msToDateString(task.dueDate));
      setDraftActualEndDate(msToDateString(task.actualEndDate));
      datesInitialized.current = true;
    }
  }, [task]);

  const isDatesDirty = task
    ? draftStartDate !== msToDateString(task.startDate) ||
      draftDueDate !== msToDateString(task.dueDate) ||
      draftActualEndDate !== msToDateString(task.actualEndDate)
    : false;

  const clearDateError = () => setDateError('');

  const handleDatesSave = () => {
    const startMs = dateStringToMs(draftStartDate);
    const dueMs = dateStringToMs(draftDueDate);
    const actualEndMs = dateStringToMs(draftActualEndDate);

    if (startMs !== null && dueMs !== null && startMs > dueMs) {
      setDateError('開始日は期限日より前に設定してください');
      return;
    }
    if (startMs !== null && actualEndMs !== null && startMs > actualEndMs) {
      setDateError('実績終了日は開始日以降に設定してください');
      return;
    }
    setDateError('');

    if (!task) return;
    const data: Record<string, unknown> = {};
    if (draftStartDate !== msToDateString(task.startDate)) data.startDate = startMs;
    if (draftDueDate !== msToDateString(task.dueDate)) data.dueDate = dueMs;
    if (draftActualEndDate !== msToDateString(task.actualEndDate)) data.actualEndDate = actualEndMs;

    if (Object.keys(data).length > 0) {
      suppressDateSync.current = true;
      updateTask.mutate({ id: taskId, data }, {
        onSettled: () => {
          suppressDateSync.current = false;
        },
      });
    }
  };

  return {
    draftStartDate,
    setDraftStartDate,
    draftDueDate,
    setDraftDueDate,
    draftActualEndDate,
    setDraftActualEndDate,
    dateError,
    clearDateError,
    isDatesDirty,
    handleDatesSave,
    isSaving: updateTask.isPending,
  };
}
