import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** Seconds a scoop takes to travel into the cone and settle. */
export const SERVE_TIME = 1.2;
/** The part of the serving the scoop spends travelling; the rest it settles. */
export const TRAVEL_SHARE = 0.7;
/** Every served cone completes a round worth the same, however long it took. */
export const COMPLETION_SCORE = 1;

export interface Flavor {
  name: string;
  /** The key that picks it. */
  key: string;
  color: string;
}

// The theme has no ice cream colours, so each flavour uses the closest one.
export const FLAVORS: readonly Flavor[] = [
  { name: 'Vanilla', key: '1', color: theme.colors.stripeB },
  { name: 'Chocolate', key: '2', color: theme.colors.wood },
  { name: 'Strawberry', key: '3', color: theme.colors.danger },
];

export interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The flavour buttons, side by side along the bottom. */
export const FLAVOR_BUTTONS: readonly Button[] = FLAVORS.map((_, i) => ({
  x: 70 + i * 230,
  y: 380,
  w: 200,
  h: 80,
}));
export const MAKE_ANOTHER_BUTTON: Button = { x: WIDTH / 2 - 110, y: 390, w: 220, h: 60 };
/** Where the scoop lands, on top of the cone. */
export const CONE_TOP = { x: WIDTH / 2, y: 210 } as const;

export interface IceCreamState {
  phase: 'choosing' | 'serving' | 'served';
  /** Index into FLAVORS of the cone being made, or undefined while choosing. */
  flavor: number | undefined;
  /** Seconds into the serving. */
  elapsed: number;
  /** How long this serving lasts; 0 skips straight to the finished cone. */
  duration: number;
  /** Whether this cone's round has been scored yet. */
  scored: boolean;
  /** Cones served since the bar opened. */
  cones: number;
}

export function createState(): IceCreamState {
  return {
    phase: 'choosing',
    flavor: undefined,
    elapsed: 0,
    duration: SERVE_TIME,
    scored: false,
    cones: 0,
  };
}

function finishServing(state: IceCreamState) {
  state.phase = 'served';
  state.elapsed = state.duration;
  state.cones += 1;
}

/**
 * Starts scooping a flavour. With `calm` (reduced motion) the scoop skips its
 * travel and the finished cone shows at once. Returns false, and changes
 * nothing, unless the bar is waiting for a choice.
 */
export function choose(state: IceCreamState, flavor: number, calm = false): boolean {
  if (state.phase !== 'choosing' || !Number.isInteger(flavor) || !FLAVORS[flavor]) return false;
  state.phase = 'serving';
  state.flavor = flavor;
  state.elapsed = 0;
  state.duration = calm ? 0 : SERVE_TIME;
  state.scored = false;
  if (state.duration === 0) finishServing(state);
  return true;
}

/** Advances the serving by `dt` seconds. */
export function step(state: IceCreamState, dt: number): void {
  if (state.phase !== 'serving') return;
  state.elapsed += dt;
  if (state.elapsed >= state.duration) finishServing(state);
}

/**
 * The score for the cone just served, once: later calls return undefined
 * until the next cone is served.
 */
export function claimScore(state: IceCreamState): number | undefined {
  if (state.phase !== 'served' || state.scored) return undefined;
  state.scored = true;
  return COMPLETION_SCORE;
}

/** Clears the counter for the next cone. Returns false unless a cone was served. */
export function makeAnother(state: IceCreamState): boolean {
  if (state.phase !== 'served') return false;
  state.phase = 'choosing';
  state.flavor = undefined;
  state.elapsed = 0;
  state.duration = SERVE_TIME;
  state.scored = false;
  return true;
}

/** How far the scoop has travelled into the cone, from 0 to 1. */
export function travel(state: IceCreamState): number {
  if (state.phase === 'served') return 1;
  if (state.phase !== 'serving' || state.duration === 0) return 0;
  return Math.min(1, state.elapsed / (state.duration * TRAVEL_SHARE));
}

/** Where the scoop is drawn: lifted from its tub, then dropped onto the cone in an arc. */
export function scoopPosition(state: IceCreamState): { x: number; y: number } {
  const button = FLAVOR_BUTTONS[state.flavor ?? 0];
  const from = { x: button.x + button.w / 2, y: button.y + 20 };
  const p = travel(state);
  const ease = p * p * (3 - 2 * p);
  return {
    x: from.x + (CONE_TOP.x - from.x) * ease,
    y: from.y + (CONE_TOP.y - from.y) * ease - Math.sin(p * Math.PI) * 90,
  };
}

function inside(button: Button, x: number, y: number) {
  return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
}

/** The flavour under a canvas point, if any. */
export function flavorAt(x: number, y: number): number | undefined {
  const index = FLAVOR_BUTTONS.findIndex((button) => inside(button, x, y));
  return index === -1 ? undefined : index;
}

export function isMakeAnother(x: number, y: number): boolean {
  return inside(MAKE_ANOTHER_BUTTON, x, y);
}

/** What a key press does: picks a flavour, makes another cone, or nothing. */
export function keyAction(
  key: string,
): { type: 'choose'; flavor: number } | { type: 'another' } | undefined {
  const flavor = FLAVORS.findIndex((f) => f.key === key);
  if (flavor !== -1) return { type: 'choose', flavor };
  if (key === 'Enter' || key === ' ') return { type: 'another' };
  return undefined;
}

function button(ctx: CanvasRenderingContext2D, b: Button, text: string, fill: string) {
  const { colors, radius } = theme;
  ctx.fillStyle = fill;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, radius);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, b.x + b.w / 2, b.y + b.h - 22);
}

function scoop(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.colors.text;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(x - 11, y - 12, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function cone(ctx: CanvasRenderingContext2D) {
  const { colors } = theme;
  const top = CONE_TOP.y + 18;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.moveTo(CONE_TOP.x - 36, top);
  ctx.lineTo(CONE_TOP.x + 36, top);
  ctx.lineTo(CONE_TOP.x, top + 120);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(CONE_TOP.x - 36 + i * 18, top);
    ctx.lineTo(CONE_TOP.x + 6 + i * 6, top + 60 + i * 6);
    ctx.moveTo(CONE_TOP.x + 36 - i * 18, top);
    ctx.lineTo(CONE_TOP.x - 6 - i * 6, top + 60 + i * 6);
    ctx.stroke();
  }
}

function draw(ctx: CanvasRenderingContext2D, state: IceCreamState) {
  const { colors } = theme;
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The bar's awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  const flavor = state.flavor === undefined ? undefined : FLAVORS[state.flavor];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.muted;
  ctx.font = canvasFont('body');
  const help =
    state.phase === 'choosing'
      ? 'Click a flavor, or press 1, 2 or 3.'
      : state.phase === 'serving'
        ? `Scooping your ${flavor!.name}...`
        : 'Click Make another, or press Enter.';
  ctx.fillText(help, WIDTH / 2, 70);

  cone(ctx);

  if (state.phase === 'choosing') {
    FLAVORS.forEach((f, i) => {
      const b = FLAVOR_BUTTONS[i];
      button(ctx, b, `${f.key}  ${f.name}`, colors.surface);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + 20, 14, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (flavor) {
    const p = scoopPosition(state);
    scoop(ctx, p.x, p.y, flavor.color);
  }

  if (state.phase === 'served' && flavor) {
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`${flavor.name}!`, WIDTH / 2, 130);
    button(ctx, MAKE_ANOTHER_BUTTON, 'Make another', colors.surface);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('small');
  ctx.textAlign = 'right';
  ctx.fillText(`Cones served: ${state.cones}`, WIDTH - 16, HEIGHT - 16);
}

export const iceCreamBar: CarnivalGame = {
  id: 'ice-cream-bar',
  name: 'Ice Cream Bar',
  description:
    'Pick a flavor and watch it scooped into a cone. No rush, no prizes, just ice cream.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const state = createState();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const score = () => {
      const points = claimScore(state);
      if (points !== undefined) recordScore(iceCreamBar.id, points);
    };
    const pick = (flavor: number) => {
      if (choose(state, flavor, calm)) score();
    };

    const onDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      // Make another sits over the middle flavor, so one click only does one thing.
      if (state.phase === 'served') {
        if (isMakeAnother(x, y)) makeAnother(state);
        return;
      }
      const flavor = flavorAt(x, y);
      if (flavor !== undefined) pick(flavor);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const action = keyAction(event.key);
      if (!action) return;
      // Leave Enter and Space alone on links and buttons, like the back link.
      if (event.target instanceof HTMLElement && event.target.closest('a, button')) return;
      event.preventDefault();
      if (action.type === 'choose') pick(action.flavor);
      else makeAnother(state);
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the whole serving.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      score();
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  },
};

export default iceCreamBar;
