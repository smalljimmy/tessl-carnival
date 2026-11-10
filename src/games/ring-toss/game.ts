import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 5;
export const POINTS_PER_RINGER = 10;
/** How close to a peg's centre a ring must land to go over it. */
export const CATCH_RADIUS = 18;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
const RING_RADIUS = 16;
const ARC_HEIGHT = 80;

export interface Peg {
  x: number;
  y: number;
}

export const PEGS: readonly Peg[] = [
  { x: 200, y: 200 },
  { x: 400, y: 150 },
  { x: 600, y: 200 },
];

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the toss. */
  age: number;
  settled: boolean;
  /** True once this ring has scored. A ring never scores twice. */
  scored: boolean;
}

export interface RingTossState {
  rings: Ring[];
  ringsLeft: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  return { rings: [], ringsLeft: RINGS_PER_ROUND, score: 0, phase: 'playing' };
}

/** The peg a ring landing at (x, y) goes over, if any. */
export function pegAt(x: number, y: number): Peg | undefined {
  return PEGS.find((peg) => Math.hypot(x - peg.x, y - peg.y) <= CATCH_RADIUS);
}

/** Tosses one ring towards the aim point. Returns false if no ring was tossed. */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  state.rings.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX,
    toY: aimY,
    age: 0,
    settled: false,
    scored: false,
  });
  state.ringsLeft -= 1;
  return true;
}

/** Lands a ring: it scores if it went over a peg and hasn't scored before. */
export function settle(state: RingTossState, ring: Ring): void {
  ring.settled = true;
  if (!ring.scored && pegAt(ring.toX, ring.toY)) {
    ring.scored = true;
    state.score += POINTS_PER_RINGER;
  }
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  for (const ring of state.rings) {
    if (ring.settled) continue;
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) settle(state, ring);
  }
  if (state.ringsLeft === 0 && state.rings.every((ring) => ring.settled)) {
    state.phase = 'over';
  }
}

/** A click: tosses a ring while playing, or starts a fresh round once it's over. */
export function pointerDown(state: RingTossState, x: number, y: number): RingTossState {
  if (state.phase === 'over') return createState();
  toss(state, x, y);
  return state;
}

/** Where a ring is drawn: along a line to its aim, lifted by an arc while in the air. */
export function ringPosition(ring: Ring): { x: number; y: number } {
  const t = ring.settled ? 1 : Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(Math.PI * t) * ARC_HEIGHT,
  };
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Pegs on their bases, with the catch area marked.
  for (const peg of PEGS) {
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(peg.x, peg.y, CATCH_RADIUS * 1.6, CATCH_RADIUS * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.wood;
    ctx.fillRect(peg.x - 4, peg.y - 50, 8, 50);
  }

  ctx.lineWidth = 5;
  for (const ring of state.rings) {
    const { x, y } = ringPosition(ring);
    ctx.strokeStyle = ring.scored ? colors.accent : ring.settled ? colors.muted : colors.stripeA;
    ctx.beginPath();
    ctx.ellipse(x, y, RING_RADIUS, RING_RADIUS * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.phase === 'playing' && state.ringsLeft > 0) {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Toss five rings at the pegs. Every ringer scores 10.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      const next = pointerDown(state, aim.x, aim.y);
      if (next !== state) {
        state = next;
        scoreRecorded = false;
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
