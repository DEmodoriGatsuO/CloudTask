import { useState, useMemo } from 'react';
import { FileText, Plus, Pencil, Trash2, BookOpen, Search, Eye, EyeOff } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import {
  useWikiPages,
  useWikiPage,
  useCreateWikiPage,
  useUpdateWikiPage,
  useDeleteWikiPage,
  useSearchWikiPages,
} from '../../hooks/useWiki';
import type { WikiPage } from '@cloudtask/shared';

interface WikiEditorProps {
  projectId: string;
}

export function WikiEditor({ projectId }: WikiEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState(false);

  const { data: pagesData, isLoading: pagesLoading } = useWikiPages(projectId);
  const { data: pageData, isLoading: pageLoading } = useWikiPage(selectedPageId ?? '');
  const { data: searchData } = useSearchWikiPages(projectId, searchQuery);

  const createMutation = useCreateWikiPage();
  const updateMutation = useUpdateWikiPage();
  const deleteMutation = useDeleteWikiPage();

  const pages: WikiPage[] = useMemo(() => {
    if (searchQuery.length >= 2 && searchData?.data) {
      return searchData.data;
    }
    return pagesData?.data ?? [];
  }, [pagesData, searchData, searchQuery]);

  // Build a tree structure: top-level pages and children grouped by parentPageId
  const { topLevel, childrenMap } = useMemo(() => {
    const childrenMap = new Map<string, WikiPage[]>();
    const topLevel: WikiPage[] = [];

    for (const page of pages) {
      if (page.parentPageId) {
        const existing = childrenMap.get(page.parentPageId) ?? [];
        existing.push(page);
        childrenMap.set(page.parentPageId, existing);
      } else {
        topLevel.push(page);
      }
    }
    return { topLevel, childrenMap };
  }, [pages]);

  const selectedPage = pageData?.data ?? null;

  function handleSelectPage(id: string) {
    setSelectedPageId(id);
    setIsEditing(false);
    setIsCreating(false);
  }

  function handleStartEdit() {
    if (!selectedPage) return;
    setEditTitle(selectedPage.title);
    setEditContent(selectedPage.content);
    setIsEditing(true);
    setIsCreating(false);
  }

  function handleStartCreate() {
    setEditTitle('');
    setEditContent('');
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPageId(null);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setIsCreating(false);
    setEditPreview(false);
  }

  async function handleSave() {
    if (isCreating) {
      await createMutation.mutateAsync({
        projectId,
        data: { title: editTitle, content: editContent },
      });
      setIsCreating(false);
      setEditPreview(false);
    } else if (isEditing && selectedPageId) {
      await updateMutation.mutateAsync({
        id: selectedPageId,
        data: { title: editTitle, content: editContent },
      });
      setIsEditing(false);
      setEditPreview(false);
    }
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    await deleteMutation.mutateAsync(deleteTargetId);
    if (selectedPageId === deleteTargetId) {
      setSelectedPageId(null);
      setIsEditing(false);
    }
    setDeleteTargetId(null);
  }

  function renderPageTreeItem(page: WikiPage, depth: number) {
    const children = childrenMap.get(page.id) ?? [];
    const isSelected = selectedPageId === page.id;

    return (
      <div key={page.id}>
        <button
          onClick={() => handleSelectPage(page.id)}
          className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors truncate ${
            isSelected
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-on-surface hover:bg-surface-container-highest'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          title={page.title}
        >
          <span className="inline-flex items-center gap-1.5">
            <FileText className="w-4 h-4 flex-shrink-0 text-on-surface-variant" />
            {page.title}
          </span>
        </button>
        {children.map((child) => renderPageTreeItem(child, depth + 1))}
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isEditMode = isEditing || isCreating;
  // On mobile, show sidebar when no page is selected (or in sidebar view), content otherwise
  const showContentOnMobile = selectedPageId || isEditMode;

  return (
    <div className="flex h-full min-h-[500px] border border-outline-variant rounded-2xl overflow-hidden bg-surface-container-low">
      {/* Left Sidebar */}
      <div className={`${showContentOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 border-r border-outline-variant flex-col`}>
        <div className="px-4 py-3 border-b border-outline-variant">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-on-surface">Wikiページ</h2>
            <Button size="sm" onClick={handleStartCreate}>
              <Plus className="w-4 h-4 mr-1" />
              New Page
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="ページを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-outline-variant pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {pagesLoading ? (
            <Spinner size="sm" />
          ) : pages.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-on-surface-variant">
              {searchQuery.length >= 2 ? 'ページが見つかりません' : 'Wikiページがありません'}
            </div>
          ) : (
            topLevel.map((page) => renderPageTreeItem(page, 0))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${showContentOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {isEditMode ? (
          <>
            {/* Edit Mode Header */}
            <div className="px-4 md:px-6 py-3 border-b border-outline-variant flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-on-surface shrink-0">
                {isCreating ? '新規ページ' : 'ページ編集'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditPreview(!editPreview)}
                  className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1 rounded-lg hover:bg-surface-container"
                >
                  {editPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {editPreview ? '編集に戻る' : 'プレビュー'}
                </button>
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={!editTitle.trim() || !editContent.trim()}
                >
                  保存
                </Button>
              </div>
            </div>

            {/* Edit Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <Input
                label="タイトル"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="ページタイトル"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-on-surface">
                  コンテンツ（Markdown）
                </label>
                {editPreview ? (
                  <div className="min-h-[480px] rounded-xl border border-outline-variant px-4 py-3 bg-surface">
                    {editContent.trim() ? (
                      <MarkdownRenderer content={editContent} />
                    ) : (
                      <p className="text-sm text-on-surface-variant italic">プレビューするコンテンツがありません</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder={`Markdownで記述できます...\n\n# 見出し1\n## 見出し2\n\n**太字** *斜体* \`コード\`\n\n- リスト項目\n\n> 引用`}
                    rows={20}
                    className="block w-full rounded-xl border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono leading-relaxed"
                  />
                )}
              </div>
            </div>
          </>
        ) : selectedPage ? (
          <>
            {/* View Mode Header */}
            <div className="px-4 md:px-6 py-3 border-b border-outline-variant flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile back button */}
                <button
                  className="md:hidden shrink-0 p-1 -ml-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                  onClick={() => { setSelectedPageId(null); setIsEditing(false); }}
                  title="一覧に戻る"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-semibold text-on-surface truncate">{selectedPage.title}</h1>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    最終更新: {selectedPage.updatedByUser.displayName}
                    {' · '}
                    {new Date(selectedPage.updatedAt).toLocaleDateString('ja')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="secondary" size="sm" onClick={handleStartEdit}>
                  <Pencil className="w-4 h-4 mr-1" />
                  編集
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTargetId(selectedPage.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Page Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {pageLoading ? (
                <Spinner />
              ) : (
                <article className="max-w-none">
                  <MarkdownRenderer content={selectedPage.content} />
                </article>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<BookOpen className="w-12 h-12" />}
              title="Wikiページを選択してください"
              description="サイドバーからページを選択するか、新規ページを作成してください。"
              action={
                <Button size="sm" onClick={handleStartCreate}>
                  新規ページ作成
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Wikiページ削除"
        message="このWikiページを削除しますか？この操作は取り消せません。"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
