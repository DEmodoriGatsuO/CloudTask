import { useEffect, useRef, useState } from 'react';
import { useUpdateTask } from './useTasks';
import type { TaskWithRelations } from '@cloudtask/shared';

export function useTaskEdit(task: TaskWithRelations | undefined, taskId: string) {
  const updateTask = useUpdateTask();

  // Title
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleError, setTitleError] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Description
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [descPreview, setDescPreview] = useState(false);

  // Focus title input when entering edit mode
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const handleTitleSave = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleError('タイトルを入力してください');
      return;
    }
    if (trimmed.length > 200) {
      setTitleError('タイトルは200文字以内で入力してください');
      return;
    }
    setTitleError('');
    if (task && trimmed !== task.title) {
      updateTask.mutate({ id: taskId, data: { title: trimmed } });
    }
    setEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditingTitle(false);
    setTitleError('');
    if (task) setTitleDraft(task.title);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const startEditingTitle = () => {
    if (task) {
      setTitleDraft(task.title);
      setEditingTitle(true);
    }
  };

  const handleDescriptionSave = () => {
    const trimmed = descriptionDraft.trim();
    if (task && trimmed !== (task.description || '')) {
      updateTask.mutate({ id: taskId, data: { description: trimmed || null } });
    }
    setEditingDescription(false);
    setDescPreview(false);
  };

  const handleDescriptionCancel = () => {
    setEditingDescription(false);
    if (task) setDescriptionDraft(task.description || '');
    setDescPreview(false);
  };

  const startEditingDescription = () => {
    if (task) {
      setDescriptionDraft(task.description || '');
      setEditingDescription(true);
    }
  };

  return {
    // Title state
    editingTitle,
    titleDraft,
    setTitleDraft,
    titleError,
    setTitleError,
    titleInputRef,
    startEditingTitle,
    handleTitleSave,
    handleTitleCancel,
    handleTitleKeyDown,
    // Description state
    editingDescription,
    descriptionDraft,
    setDescriptionDraft,
    descPreview,
    setDescPreview,
    startEditingDescription,
    handleDescriptionSave,
    handleDescriptionCancel,
    // Shared
    isUpdating: updateTask.isPending,
  };
}
