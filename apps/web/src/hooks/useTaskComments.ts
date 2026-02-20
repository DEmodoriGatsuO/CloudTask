import { useState } from 'react';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from './useComments';

export function useTaskComments(taskId: string) {
  const { data: commentsData } = useComments(taskId);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const [newComment, setNewComment] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  const comments = commentsData?.data || [];

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ taskId, content: newComment }, {
      onSuccess: () => {
        setNewComment('');
        setShowPreview(false);
      },
    });
  };

  const startEditingComment = (id: string, content: string) => {
    setEditingCommentId(id);
    setEditingCommentContent(content);
  };

  const handleUpdateComment = () => {
    if (!editingCommentId || !editingCommentContent.trim()) return;
    updateComment.mutate({ id: editingCommentId, content: editingCommentContent }, {
      onSuccess: () => {
        setEditingCommentId(null);
        setEditingCommentContent('');
      },
    });
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const handleDeleteComment = (id: string) => {
    deleteComment.mutate(id);
  };

  return {
    comments,
    newComment,
    setNewComment,
    showPreview,
    setShowPreview,
    editingCommentId,
    editingCommentContent,
    setEditingCommentContent,
    handleSubmitComment,
    startEditingComment,
    handleUpdateComment,
    cancelEditingComment,
    handleDeleteComment,
    isSubmitting: createComment.isPending,
    isUpdatingComment: updateComment.isPending,
  };
}
