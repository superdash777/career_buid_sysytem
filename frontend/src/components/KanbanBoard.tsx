import { useCallback, useEffect, useRef, useState } from 'react';

export interface KanbanTask {
  id: string;
  title: string;
  tag?: string;
  status: 'todo' | 'in_progress' | 'done';
}

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onStatusChange: (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => void;
  onAddTask?: (status: 'todo' | 'in_progress' | 'done') => void;
}

const COLUMNS: { status: KanbanTask['status']; title: string }[] = [
  { status: 'todo', title: 'К выполнению' },
  { status: 'in_progress', title: 'В работе' },
  { status: 'done', title: 'Выполнено' },
];

type DragState = {
  taskId: string;
  task: KanbanTask;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  clientX: number;
  clientY: number;
  pointerId: number;
};

function TaskCard({
  task,
  isDragging,
  onPointerDown,
}: {
  task: KanbanTask;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, task: KanbanTask) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => onPointerDown(e, task)}
      className={`cursor-grab touch-none select-none rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-left transition-shadow active:cursor-grabbing ${
        isDragging ? 'opacity-0' : ''
      }`}
    >
      {task.tag ? (
        <span className="mb-2 inline-block rounded-full bg-[var(--chip)] px-2 py-0.5 text-xs text-[var(--blue-deep)]">
          {task.tag}
        </span>
      ) : null}
      <p className="text-sm font-medium text-[var(--ink)]">{task.title}</p>
    </div>
  );
}

export default function KanbanBoard({ tasks, onStatusChange, onAddTask }: KanbanBoardProps) {
  const columnRefs = useRef<Partial<Record<KanbanTask['status'], HTMLDivElement | null>>>({});
  const dragRef = useRef<DragState | null>(null);
  const dragListenersCleanupRef = useRef<(() => void) | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverStatus, setHoverStatus] = useState<KanbanTask['status'] | null>(null);

  const getStatusUnderPoint = useCallback((x: number, y: number): KanbanTask['status'] | null => {
    for (const { status } of COLUMNS) {
      const el = columnRefs.current[status];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return status;
      }
    }
    return null;
  }, []);

  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, task: KanbanTask) => {
      if (e.button !== 0) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      e.preventDefault();

      const initial: DragState = {
        taskId: task.id,
        task,
        width: rect.width,
        height: rect.height,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        clientX: e.clientX,
        clientY: e.clientY,
        pointerId: e.pointerId,
      };
      dragRef.current = initial;
      setDrag(initial);
      setHoverStatus(task.status);

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d || ev.pointerId !== d.pointerId) return;
        const next: DragState = {
          ...d,
          clientX: ev.clientX,
          clientY: ev.clientY,
        };
        dragRef.current = next;
        setDrag(next);
        setHoverStatus(getStatusUnderPoint(ev.clientX, ev.clientY));
      };

      const onEnd = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d || ev.pointerId !== d.pointerId) return;

        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onEnd);
        document.removeEventListener('pointercancel', onEnd);
        dragListenersCleanupRef.current = null;

        dragRef.current = null;
        const under = getStatusUnderPoint(ev.clientX, ev.clientY);
        if (under !== null && under !== d.task.status) {
          onStatusChange(d.taskId, under);
        }
        setDrag(null);
        setHoverStatus(null);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onEnd);
      document.addEventListener('pointercancel', onEnd);
      dragListenersCleanupRef.current = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onEnd);
        document.removeEventListener('pointercancel', onEnd);
        dragListenersCleanupRef.current = null;
      };
    },
    [getStatusUnderPoint, onStatusChange],
  );

  useEffect(() => {
    return () => {
      dragListenersCleanupRef.current?.();
      dragRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      {COLUMNS.map(({ status, title }) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        const isDropTarget = hoverStatus === status;

        return (
          <div
            key={status}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-2xl bg-[var(--bg)] p-4"
          >
            <h2 className="text-[var(--ink)] font-semibold">{title}</h2>
            <div
              ref={(node) => {
                columnRefs.current[status] = node;
              }}
              className={`flex min-h-[120px] flex-col gap-2 rounded-xl transition-colors ${
                isDropTarget
                  ? 'border border-dashed border-[var(--blue-deep)] bg-[var(--chip)]/50'
                  : ''
              }`}
            >
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDragging={drag?.taskId === task.id}
                  onPointerDown={handleCardPointerDown}
                />
              ))}
            </div>
            {onAddTask ? (
              <button
                type="button"
                onClick={() => onAddTask(status)}
                className="w-full rounded-xl border border-dashed border-[var(--line)] py-2.5 text-sm text-[var(--muted)] transition-colors hover:border-[var(--blue-deep)]/40 hover:text-[var(--ink)]"
              >
                Добавить задачу
              </button>
            ) : null}
          </div>
        );
      })}

      {drag ? (
        <div
          className="pointer-events-none fixed z-[1000] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 opacity-80 shadow-lg scale-105"
          style={{
            width: drag.width,
            height: drag.height,
            left: drag.clientX - drag.offsetX,
            top: drag.clientY - drag.offsetY,
          }}
        >
          {drag.task.tag ? (
            <span className="mb-2 inline-block rounded-full bg-[var(--chip)] px-2 py-0.5 text-xs text-[var(--blue-deep)]">
              {drag.task.tag}
            </span>
          ) : null}
          <p className="text-sm font-medium text-[var(--ink)]">{drag.task.title}</p>
        </div>
      ) : null}
    </div>
  );
}
