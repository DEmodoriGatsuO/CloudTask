import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useTasks, useUpdateTask, useCreateTask } from '../../hooks/useTasks';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@cloudtask/shared';
import type { TaskStatusType } from '@cloudtask/shared';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { SkeletonKanban } from '../common/Skeleton';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { TextArea } from '../common/TextArea';
import { Select } from '../common/Select';
import { useProjectMembers } from '../../hooks/useProjects';

interface KanbanBoardProps {
  projectId: string;
}

type TaskItem = { id: string; status: string; sortOrder?: number | null; [key: string]: any };

function buildColumnMap(tasks: TaskItem[]): Record<string, TaskItem[]> {
  return TASK_STATUSES.reduce(
    (acc, status) => {
      acc[status] = tasks
        .filter((t) => t.status === status)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return acc;
    },
    {} as Record<string, TaskItem[]>,
  );
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: tasksData, isLoading } = useTasks(projectId);
  const { data: membersData } = useProjectMembers(projectId);
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newStatus, setNewStatus] = useState<string>('todo');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [createDateError, setCreateDateError] = useState('');

  const serverTasks: TaskItem[] = tasksData?.data || [];
  const members = membersData?.data || [];

  // ─── ドラッグ状態管理（Ref-first アーキテクチャ）────────────────────────────
  //
  // 【設計方針】
  // dnd-kit のイベント（onDragStart/Over/End）は React のレンダーサイクル外の
  // PointerEvent から同期的に発火する。
  //
  // 従来の「handleDragOver → setLocalColumns → re-render → dnd-kit items変化
  // → onDragOver再発火」というサイクルが #185 ループの原因。
  //
  // 解決策: ドラッグ中の列状態を useState ではなく ref で管理し、
  // レンダーに必要な最小限の state（activeId のみ）だけを React に持たせる。
  // re-render が必要な時は forceRender() で明示的にトリガーする。

  // ドラッグ中のカラム状態（ref管理 — setState しないのでループしない）
  const localColumnsRef = useRef<Record<string, TaskItem[]> | null>(null);

  // サーバータスク一覧（レンダー中に即更新）
  const serverTasksRef = useRef<TaskItem[]>(serverTasks);
  serverTasksRef.current = serverTasks;

  // updateTask mutation（レンダー中に即更新）
  const updateTaskRef = useRef(updateTask);
  updateTaskRef.current = updateTask;

  // ドラッグ中の再レンダーをトリガーするための最小 state
  // （localColumnsRef を変更しても React は気づかないため、
  //   DragOverlay 表示用の activeTask と列表示用の renderTick を用意）
  const [renderTick, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick((n) => n + 1), []);

  // レンダーされる列マップ:
  //   ドラッグ中 → localColumnsRef.current（renderTickで最新が保証される）
  //   通常時    → サーバーデータから計算
  const tasksByStatus = useMemo(
    () => {
      // renderTick を依存に含めることで、localColumnsRef 更新後の forceRender() で
      // この useMemo が再計算され最新の列状態が反映される
      void renderTick;
      return localColumnsRef.current ?? buildColumnMap(serverTasks);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renderTick, serverTasks],
  );

  // tasksByStatus の最新値（コリジョン検出から参照）
  const tasksByStatusRef = useRef(tasksByStatus);
  tasksByStatusRef.current = tasksByStatus;

  // ────────────────────────────────────────────────────────────────────────────

  // DragOverlay アニメーション終了後にクリアするためのタイマー管理
  const overlayCleanupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (overlayCleanupTimer.current) clearTimeout(overlayCleanupTimer.current);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // カスタムコリジョン検出:
  // 1. ステータス列（useDroppable）との矩形交差を優先 → 空列への移動を確実に検出
  // 2. 交差がなければ closestCenter でカード間のソートを処理
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // まずカラム（ステータスID）との rectIntersection を試みる
    const columnCollisions = rectIntersection({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => TASK_STATUSES.includes(c.id as TaskStatusType)
      ),
    });
    if (columnCollisions.length > 0) {
      // 列と交差している場合、さらにその列内のカードで closestCenter を検索
      const overColumnId = columnCollisions[0].id as string;
      const cardCollisions = closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) =>
            !TASK_STATUSES.includes(c.id as TaskStatusType) &&
            tasksByStatusRef.current[overColumnId]?.some((t) => t.id === c.id)
        ),
      });
      // カード上にいればカードを返す、そうでなければ列を返す（空列対応）
      return cardCollisions.length > 0 ? cardCollisions : columnCollisions;
    }
    // 列との交差がなければ通常の closestCenter
    return closestCenter(args);
  }, []);

  // dragStart: サーバーデータを localColumnsRef にスナップショット → forceRender で表示更新
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    const tasks = serverTasksRef.current;
    const task = tasks.find((t) => t.id === id) ?? null;
    localColumnsRef.current = buildColumnMap(tasks);
    setActiveTask(task);
    setActiveId(id);
    // forceRender は不要（setActiveTask/setActiveId が re-render をトリガーする）
  }, []); // stable

  // dragOver: localColumnsRef を直接更新（setState しない → #185 ループなし）
  // 変化があった場合のみ forceRender() で再描画
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const currentCols = localColumnsRef.current;
    if (!currentCols) return;

    // アクティブカードが現在どの列にいるか
    const fromStatus = TASK_STATUSES.find((s) => currentCols[s]?.some((t) => t.id === taskId));
    if (!fromStatus) return;

    // 移動先列の特定: overId がカラムID（空列含む）かカードIDかを判別
    let toStatus: string;
    if (TASK_STATUSES.includes(overId as TaskStatusType)) {
      toStatus = overId;
    } else {
      const toCol = TASK_STATUSES.find((s) => currentCols[s]?.some((t) => t.id === overId));
      if (!toCol) return;
      toStatus = toCol;
    }

    const fromCol = [...(currentCols[fromStatus] || [])];
    const toCol = fromStatus === toStatus ? fromCol : [...(currentCols[toStatus] || [])];

    const activeIndex = fromCol.findIndex((t) => t.id === taskId);
    if (activeIndex === -1) return;

    const activeItem = { ...fromCol[activeIndex], status: toStatus as TaskStatusType };

    if (fromStatus === toStatus) {
      const overIndex = toCol.findIndex((t) => t.id === overId);
      if (overIndex === -1 || activeIndex === overIndex) return; // 変化なし → 更新しない
      localColumnsRef.current = { ...currentCols, [toStatus]: arrayMove(toCol, activeIndex, overIndex) };
    } else {
      fromCol.splice(activeIndex, 1);
      const overIndex = TASK_STATUSES.includes(overId as TaskStatusType)
        ? toCol.length
        : toCol.findIndex((t) => t.id === overId);
      toCol.splice(overIndex === -1 ? toCol.length : overIndex, 0, activeItem);
      localColumnsRef.current = { ...currentCols, [fromStatus]: fromCol, [toStatus]: toCol };
    }

    // ref を更新した後、React に再描画を依頼する
    // setRenderTick → re-render → tasksByStatus (useMemo) が localColumnsRef.current を読む
    // ここでは setState を localColumnsRef の更新から切り離しているため、
    // "stateの変化 → items変化 → dnd-kit再計算 → onDragOver再呼び出し" のループが起きない
    forceRender();
  }, [forceRender]); // forceRender は useCallback([], []) なので stable

  // dragEnd: 最終位置からsortOrderを決定してAPI呼び出し
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const taskId = active.id as string;

    const finalCols = localColumnsRef.current ?? buildColumnMap(serverTasksRef.current);

    // DragOverlay ドロップアニメーション完了後に activeTask をクリア
    if (overlayCleanupTimer.current) clearTimeout(overlayCleanupTimer.current);
    overlayCleanupTimer.current = setTimeout(() => setActiveTask(null), 300);

    // ドラッグ状態をリセット（localColumnsRef を null に戻す → 次の render でサーバーデータを表示）
    localColumnsRef.current = null;
    setActiveId(null);
    forceRender(); // localColumnsRef = null を反映させる

    if (!over) return;

    const targetStatus = TASK_STATUSES.find((s) => finalCols[s]?.some((t) => t.id === taskId));
    if (!targetStatus) return;

    // ドロップ前のステータスを特定（クロスカラム移動の検出に使用）
    const originalTask = serverTasksRef.current.find((t) => t.id === taskId);
    const fromStatus = originalTask?.status ?? targetStatus;

    // ─── 整数連番再採番 ───────────────────────────────────────────────────────
    // (prevOrder + nextOrder) / 2 の繰り返しによる浮動小数点精度劣化を防ぐため、
    // ドロップ後の列全体を 1, 2, 3... と連番で再割り当てする。
    // これにより何度並び替えても sortOrder は常に整数を保つ。

    // 更新が必要なアイテム: { id, status, sortOrder }
    const updates: { id: string; status: string; sortOrder: number }[] = [];

    // targetStatus 列を再採番
    const targetColItems = finalCols[targetStatus] ?? [];
    targetColItems.forEach((item, index) => {
      const newOrder = index + 1;
      const orig = serverTasksRef.current.find((t) => t.id === item.id);
      // status変化 または sortOrder変化があるアイテムのみ送信
      if (orig?.status !== targetStatus || orig?.sortOrder !== newOrder) {
        updates.push({ id: item.id, status: targetStatus, sortOrder: newOrder });
      }
    });

    // クロスカラム移動の場合、元の列も再採番
    if (fromStatus !== targetStatus) {
      const fromColItems = finalCols[fromStatus] ?? [];
      fromColItems.forEach((item, index) => {
        const newOrder = index + 1;
        const orig = serverTasksRef.current.find((t) => t.id === item.id);
        if (orig?.sortOrder !== newOrder) {
          updates.push({ id: item.id, status: fromStatus, sortOrder: newOrder });
        }
      });
    }

    if (updates.length === 0) return;

    // 各アイテムの status + sortOrder を個別に送信
    // batchUpdate は共通データしか送れないため、件数に関わらず個別 mutate で並列送信する
    updates.forEach((u) => {
      updateTaskRef.current.mutate({ id: u.id, data: { status: u.status, sortOrder: u.sortOrder } });
    });
  }, [forceRender]); // forceRender は stable

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const startMs = newStartDate ? new Date(newStartDate).getTime() : undefined;
    const endMs = newEndDate ? new Date(newEndDate).getTime() : undefined;
    if (startMs !== undefined && endMs !== undefined && startMs > endMs) {
      setCreateDateError('開始日は終了日より前に設定してください');
      return;
    }
    setCreateDateError('');

    createTask.mutate(
      {
        projectId,
        title: newTitle.trim(),
        description: newDesc || undefined,
        priority: newPriority,
        assigneeId: newAssignee || undefined,
        status: newStatus,
        startDate: startMs,
        endDate: endMs,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewTitle('');
          setNewDesc('');
          setNewPriority('medium');
          setNewAssignee('');
          setNewStatus('todo');
          setNewStartDate('');
          setNewEndDate('');
          setCreateDateError('');
        },
      },
    );
  };

  if (isLoading) return <SkeletonKanban />;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              title={TASK_STATUS_LABELS[status]}
              tasks={tasksByStatus[status] || []}
              count={tasksByStatus[status]?.length || 0}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
          {activeTask ? <KanbanCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateDateError(''); }}
        title="新規タスク"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); setCreateDateError(''); }}>キャンセル</Button>
            <Button onClick={handleCreate} loading={createTask.isPending} disabled={!newTitle.trim()}>作成</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="タイトル" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
          <TextArea label="説明" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Select label="ステータス" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
            options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))} />
          <Select label="優先度" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
            options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
          <Select label="担当者" value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}
            options={members.map((m) => ({ value: m.userId, label: m.user.displayName }))} placeholder="未割当" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="開始日" type="date" value={newStartDate} onChange={(e) => { setNewStartDate(e.target.value); if (createDateError) setCreateDateError(''); }} />
            <Input label="終了日" type="date" value={newEndDate} onChange={(e) => { setNewEndDate(e.target.value); if (createDateError) setCreateDateError(''); }} />
          </div>
          {createDateError && <p className="text-xs text-red-600">{createDateError}</p>}
        </form>
      </Modal>
    </>
  );
}
