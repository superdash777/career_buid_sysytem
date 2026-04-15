import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface TetrisGameProps {
  active: boolean;
  onStop?: () => void;
}

type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const COLS = 10;
const ROWS = 20;
const CELL = 24;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

const BASE_SHAPES: Record<PieceKind, [number, number][]> = {
  I: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  O: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  T: [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  S: [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
  ],
  Z: [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  J: [
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  L: [
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
};

const PIECE_ORDER: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function rotateCW(cells: [number, number][]): [number, number][] {
  const rotated = cells.map(([r, c]) => [c, 3 - r] as [number, number]);
  const minR = Math.min(...rotated.map(([r]) => r));
  const minC = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minR, c - minC] as [number, number]);
}

function getShapeCells(kind: PieceKind, rotation: number): [number, number][] {
  let cells = BASE_SHAPES[kind];
  const steps = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < steps; i += 1) {
    cells = rotateCW(cells);
  }
  return cells;
}

function createEmptyBoard(): (PieceKind | null)[][] {
  return Array.from({ length: ROWS }, (): (PieceKind | null)[] =>
    Array.from({ length: COLS }, (): PieceKind | null => null),
  );
}

function randomPieceKind(): PieceKind {
  return PIECE_ORDER[Math.floor(Math.random() * PIECE_ORDER.length)]!;
}

interface ActivePiece {
  kind: PieceKind;
  row: number;
  col: number;
  rotation: number;
}

const DROP_MS = 700;
const SOFT_DROP_MS = 45;

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export default function TetrisGame({ active, onStop }: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<(PieceKind | null)[][]>(createEmptyBoard());
  const pieceRef = useRef<ActivePiece | null>(null);
  const scoreRef = useRef(0);
  const lastTimeRef = useRef(0);
  const prevActiveRef = useRef(false);
  const dropAccRef = useRef(0);
  const softDropRef = useRef(false);
  const rafRef = useRef<number>(0);
  const colorsLoadedRef = useRef(false);
  const colorMapRef = useRef<Record<PieceKind, string>>({
    I: '#2563eb',
    O: '#22c55e',
    T: '#ef4444',
    S: '#7c3aed',
    Z: '#0ea5e9',
    J: '#f59e0b',
    L: '#ec4899',
  });

  const [score, setScore] = useState(0);

  const pieceColors = useMemo(
    () => ({
      I: 'var(--blue-deep)',
      O: 'var(--accent-green)',
      T: 'var(--accent-red)',
      S: '#7c3aed',
      Z: '#0ea5e9',
      J: '#f59e0b',
      L: '#ec4899',
    }),
    [],
  );

  const resolvePieceColors = useCallback(() => {
    colorMapRef.current = {
      I: readCssVar('--blue-deep', '#2563eb'),
      O: readCssVar('--accent-green', '#22c55e'),
      T: readCssVar('--accent-red', '#ef4444'),
      S: pieceColors.S,
      Z: pieceColors.Z,
      J: pieceColors.J,
      L: pieceColors.L,
    };
    colorsLoadedRef.current = true;
  }, [pieceColors]);

  const spawnPiece = useCallback((): boolean => {
    const kind = randomPieceKind();
    const piece: ActivePiece = { kind, row: 0, col: 3, rotation: 0 };
    const cells = getShapeCells(kind, piece.rotation);
    for (const [dr, dc] of cells) {
      const r = piece.row + dr;
      const c = piece.col + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && boardRef.current[r]![c]) {
        boardRef.current = createEmptyBoard();
        scoreRef.current = 0;
        pieceRef.current = null;
        queueMicrotask(() => {
          setScore(0);
        });
        return false;
      }
    }
    pieceRef.current = piece;
    return true;
  }, []);

  const collides = useCallback(
    (p: ActivePiece, board: (PieceKind | null)[][]): boolean => {
      const cells = getShapeCells(p.kind, p.rotation);
      for (const [dr, dc] of cells) {
        const r = p.row + dr;
        const c = p.col + dc;
        if (c < 0 || c >= COLS || r >= ROWS) return true;
        if (r < 0) continue;
        if (board[r]![c]) return true;
      }
      return false;
    },
    [],
  );

  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const board = boardRef.current;
    const cells = getShapeCells(p.kind, p.rotation);
    for (const [dr, dc] of cells) {
      const r = p.row + dr;
      const c = p.col + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        board[r]![c] = p.kind;
      }
    }

    const cleared: number[] = [];
    for (let r = ROWS - 1; r >= 0; r -= 1) {
      if (board[r]!.every((cell) => cell !== null)) {
        cleared.push(r);
      }
    }
    if (cleared.length > 0) {
      const next = createEmptyBoard();
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        if (cleared.includes(r)) continue;
        for (let c = 0; c < COLS; c += 1) {
          next[writeRow]![c] = board[r]![c];
        }
        writeRow -= 1;
      }
      boardRef.current = next;
      const add = 100 * cleared.length * cleared.length;
      scoreRef.current += add;
      setScore(scoreRef.current);
    }

    pieceRef.current = null;
    spawnPiece();
  }, [spawnPiece]);

  const tryMove = useCallback(
    (dr: number, dc: number): boolean => {
      const p = pieceRef.current;
      if (!p) return false;
      const next: ActivePiece = { ...p, row: p.row + dr, col: p.col + dc };
      if (collides(next, boardRef.current)) return false;
      pieceRef.current = next;
      return true;
    },
    [collides],
  );

  const tryRotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const next: ActivePiece = {
      ...p,
      rotation: (p.rotation + 1) % 4,
    };
    if (!collides(next, boardRef.current)) {
      pieceRef.current = next;
      return;
    }
    const kicks = [-1, 1, -2, 2];
    for (const k of kicks) {
      const kicked: ActivePiece = { ...next, col: next.col + k };
      if (!collides(kicked, boardRef.current)) {
        pieceRef.current = kicked;
        return;
      }
    }
  }, [collides]);

  const tickGravity = useCallback(() => {
    const p = pieceRef.current;
    if (!p) {
      spawnPiece();
      return;
    }
    if (!tryMove(1, 0)) {
      lockPiece();
    }
  }, [lockPiece, spawnPiece, tryMove]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!colorsLoadedRef.current) {
      resolvePieceColors();
    }
    const colors = colorMapRef.current;

    ctx.fillStyle = 'var(--paper)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'color-mix(in srgb, var(--line) 55%, transparent)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c += 1) {
      ctx.beginPath();
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, CANVAS_H);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r += 1) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(CANVAS_W, r * CELL + 0.5);
      ctx.stroke();
    }

    const board = boardRef.current;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const cell = board[r]![c];
        if (!cell) continue;
        ctx.fillStyle = colors[cell];
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }

    const cur = pieceRef.current;
    if (cur) {
      ctx.fillStyle = colors[cur.kind];
      const cells = getShapeCells(cur.kind, cur.rotation);
      for (const [dr, dc] of cells) {
        const r = cur.row + dr;
        const c = cur.col + dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    ctx.strokeStyle = 'var(--line)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_W - 2, CANVAS_H - 2);
  }, [resolvePieceColors]);

  useEffect(() => {
    if (prevActiveRef.current && !active) {
      onStop?.();
    }
    prevActiveRef.current = active;
  }, [active, onStop]);

  useEffect(() => {
    if (!active) return;

    resolvePieceColors();
    boardRef.current = createEmptyBoard();
    scoreRef.current = 0;
    queueMicrotask(() => {
      setScore(0);
    });
    pieceRef.current = null;
    dropAccRef.current = 0;
    softDropRef.current = false;
    lastTimeRef.current = performance.now();
    spawnPiece();

    let running = true;

    const loop = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      const last = lastTimeRef.current;
      const dt = now - last;
      lastTimeRef.current = now;

      const interval = softDropRef.current ? SOFT_DROP_MS : DROP_MS;
      dropAccRef.current += dt;
      while (dropAccRef.current >= interval) {
        dropAccRef.current -= interval;
        tickGravity();
      }

      draw();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowUp'
      ) {
        e.preventDefault();
      }
      switch (e.code) {
        case 'ArrowLeft':
          tryMove(0, -1);
          break;
        case 'ArrowRight':
          tryMove(0, 1);
          break;
        case 'ArrowDown':
          softDropRef.current = true;
          dropAccRef.current = DROP_MS;
          break;
        case 'ArrowUp':
          tryRotate();
          break;
        default:
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        softDropRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      softDropRef.current = false;
    };
  }, [
    active,
    draw,
    resolvePieceColors,
    spawnPiece,
    tickGravity,
    tryMove,
    tryRotate,
  ]);

  const handleLeft = () => {
    if (!active) return;
    tryMove(0, -1);
    draw();
  };
  const handleRight = () => {
    if (!active) return;
    tryMove(0, 1);
    draw();
  };
  const handleRotate = () => {
    if (!active) return;
    tryRotate();
    draw();
  };
  const handleSoftDropTap = () => {
    if (!active) return;
    if (!tryMove(1, 0)) {
      lockPiece();
    }
    draw();
  };

  return (
    <div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-2xl p-4 flex flex-col gap-3 max-w-[min(100%,280px)]">
      <p className="text-sm text-center leading-snug">
        Пока AI строит ваш план, можно поиграть
      </p>

      <div className="relative mx-auto">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block rounded-lg bg-[var(--paper)]"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        />
        {!active && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--paper)]/90 backdrop-blur-[2px]"
            aria-live="polite"
          >
            <span className="text-lg font-semibold tracking-tight">
              Готово!
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          className="rounded-xl border border-[var(--line)] bg-[var(--paper)] py-3 text-lg font-semibold text-[var(--ink)] transition hover:border-[var(--blue-deep)] active:scale-95 disabled:opacity-40"
          aria-label="Влево"
          disabled={!active}
          onPointerDown={(e) => {
            e.preventDefault();
            handleLeft();
          }}
        >
          ←
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--line)] bg-[var(--paper)] py-3 text-lg font-semibold text-[var(--ink)] transition hover:border-[var(--blue-deep)] active:scale-95 disabled:opacity-40"
          aria-label="Повернуть"
          disabled={!active}
          onPointerDown={(e) => {
            e.preventDefault();
            handleRotate();
          }}
        >
          ↻
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--line)] bg-[var(--paper)] py-3 text-lg font-semibold text-[var(--ink)] transition hover:border-[var(--blue-deep)] active:scale-95 disabled:opacity-40"
          aria-label="Вправо"
          disabled={!active}
          onPointerDown={(e) => {
            e.preventDefault();
            handleRight();
          }}
        >
          →
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--line)] bg-[var(--paper)] py-3 text-lg font-semibold text-[var(--ink)] transition hover:border-[var(--blue-deep)] active:scale-95 disabled:opacity-40"
          aria-label="Вниз"
          disabled={!active}
          onPointerDown={(e) => {
            e.preventDefault();
            handleSoftDropTap();
          }}
        >
          ▼
        </button>
      </div>

      <p className="text-center text-sm tabular-nums">
        Счёт: <span className="font-semibold">{score}</span>
      </p>
    </div>
  );
}
