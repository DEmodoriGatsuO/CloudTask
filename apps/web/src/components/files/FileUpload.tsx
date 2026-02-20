import { useState, useRef, useCallback } from 'react';
import { Upload, Paperclip, Download, Trash2, AlertCircle, Image, FileText, X, Maximize2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '../../hooks/useAttachments';
import { getAttachmentDownloadUrl, getAttachmentInlineUrl } from '../../api/attachments';
import { useAuthenticatedBlobUrl } from '../../hooks/useAuthenticatedBlobUrl';
import type { AttachmentWithUser } from '@cloudtask/shared';

interface FileUploadProps {
  taskId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

function isPreviewable(mimeType: string): boolean {
  return isImageFile(mimeType) || isPdfFile(mimeType);
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (isImageFile(mimeType)) return <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  if (isPdfFile(mimeType)) return <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />;
  return <Paperclip className="w-5 h-5 text-on-surface-variant flex-shrink-0" />;
}

function FileThumbnail({ attachment }: { attachment: AttachmentWithUser }) {
  // 画像サムネイルは認証付き fetch → BlobURL で表示
  const inlineUrl = isImageFile(attachment.mimeType)
    ? getAttachmentInlineUrl(attachment.id)
    : null;
  const blobUrl = useAuthenticatedBlobUrl(inlineUrl);

  if (isImageFile(attachment.mimeType)) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-highest flex-shrink-0">
        {blobUrl ? (
          <img src={blobUrl} alt={attachment.fileName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-5 h-5 text-blue-300 animate-pulse" />
          </div>
        )}
      </div>
    );
  }
  if (isPdfFile(attachment.mimeType)) {
    return (
      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-red-500" />
      </div>
    );
  }
  return <FileIcon mimeType={attachment.mimeType} />;
}

/** プレビューモーダル（フックを使うため独立コンポーネント） */
function PreviewModal({
  attachment,
  onClose,
}: {
  attachment: AttachmentWithUser;
  onClose: () => void;
}) {
  // 認証付き fetch → BlobURL に変換してプレビュー表示
  const inlineUrl = getAttachmentInlineUrl(attachment.id);
  const blobUrl = useAuthenticatedBlobUrl(inlineUrl);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant">
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon mimeType={attachment.mimeType} />
            <span className="text-sm font-medium text-on-surface truncate">{attachment.fileName}</span>
            <span className="text-xs text-on-surface-variant">({formatFileSize(attachment.fileSize)})</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={getAttachmentDownloadUrl(attachment.id)}
              download
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-on-surface bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container-highest transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              ダウンロード
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-container-highest transition-colors"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-surface-container-lowest min-h-[400px]">
          {!blobUrl ? (
            <div className="flex flex-col items-center gap-3 text-on-surface-variant">
              <Spinner size="sm" />
              <span className="text-sm">読み込み中...</span>
            </div>
          ) : isImageFile(attachment.mimeType) ? (
            <img
              src={blobUrl}
              alt={attachment.fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          ) : isPdfFile(attachment.mimeType) ? (
            <iframe
              src={blobUrl}
              title={attachment.fileName}
              className="w-full h-[70vh] rounded-lg border border-outline-variant"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FileUpload({ taskId }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentWithUser | null>(null);

  const { data: attachmentsData, isLoading } = useAttachments(taskId);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const attachments: AttachmentWithUser[] = attachmentsData?.data ?? [];

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        uploadMutation.mutate({ taskId, file });
      }
    },
    [taskId, uploadMutation],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleClickUpload() {
    fileInputRef.current?.click();
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    await deleteMutation.mutateAsync(deleteTargetId);
    setDeleteTargetId(null);
  }

  function handleFileClick(attachment: AttachmentWithUser) {
    if (isPreviewable(attachment.mimeType)) {
      setPreviewAttachment(attachment);
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-outline-variant hover:border-outline hover:bg-surface-container-highest'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="sm" />
            <p className="text-sm text-on-surface-variant">アップロード中...</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-on-surface-variant" />
            <p className="mt-2 text-sm text-on-surface-variant">
              ファイルをドラッグ＆ドロップ、または{' '}
              <span className="text-primary-600 font-medium">クリックして選択</span>
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {isLoading ? (
        <Spinner size="sm" />
      ) : attachments.length > 0 ? (
        <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`flex items-center justify-between px-4 py-3 hover:bg-surface-container-highest ${
                isPreviewable(attachment.mimeType) ? 'cursor-pointer' : ''
              }`}
              onClick={() => handleFileClick(attachment)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileThumbnail attachment={attachment} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {formatFileSize(attachment.fileSize)}
                    {' \u00b7 '}
                    {new Date(attachment.createdAt).toLocaleDateString()}
                    {' \u00b7 '}
                    {attachment.user.displayName}
                    {isPreviewable(attachment.mimeType) && (
                      <span className="ml-1 text-primary-600">
                        {' \u00b7 '}クリックでプレビュー
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {isPreviewable(attachment.mimeType) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewAttachment(attachment); }}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-on-surface bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container-highest transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5 mr-1" />
                    プレビュー
                  </button>
                )}
                <a
                  href={getAttachmentDownloadUrl(attachment.id)}
                  download
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-on-surface bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container-highest transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  ダウンロード
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setDeleteTargetId(attachment.id); }}
                  className="text-error hover:text-error hover:bg-error-container"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant text-center py-4">
          添付ファイルがありません。ファイルをアップロードしてください。
        </p>
      )}

      {/* Upload Error */}
      {uploadMutation.isError && (
        <div className="flex items-center gap-2 text-sm text-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          アップロード失敗：{uploadMutation.error.message}
        </div>
      )}

      {/* File Preview Modal */}
      {previewAttachment && (
        <PreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="添付ファイル削除"
        message="この添付ファイルを削除しますか？この操作は取り消せません。"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
