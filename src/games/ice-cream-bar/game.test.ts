import { describe, expect, it } from 'vitest';
import iceCreamBar, {
  choose,
  claimScore,
  COMPLETION_SCORE,
  CONE_TOP,
  createState,
  FLAVOR_BUTTONS,
  FLAVORS,
  flavorAt,
  isMakeAnother,
  keyAction,
  MAKE_ANOTHER_BUTTON,
  makeAnother,
  scoopPosition,
  SERVE_TIME,
  step,
  travel,
} from './game';

/** Steps a whole serving in small frames, as the animation loop does. */
function serve(state: ReturnType<typeof createState>) {
  for (let t = 0; t < SERVE_TIME + 0.1; t += 0.05) step(state, 0.05);
}

describe('ice cream bar', () => {
  it('is registered under its folder name', () => {
    expect(iceCreamBar.id).toBe('ice-cream-bar');
    expect(iceCreamBar.name).toBe('Ice Cream Bar');
  });

  it('opens waiting for a choice of three named flavors', () => {
    const state = createState();
    expect(state.phase).toBe('choosing');
    expect(state.flavor).toBeUndefined();
    expect(FLAVORS.map((f) => f.name)).toEqual(['Vanilla', 'Chocolate', 'Strawberry']);
    expect(new Set(FLAVORS.map((f) => f.color)).size).toBe(3);
  });

  it.each(FLAVORS.map((f, i) => [f.name, i] as const))(
    'serves a %s cone from start to finish',
    (_, index) => {
      const state = createState();
      expect(choose(state, index)).toBe(true);
      expect(state.phase).toBe('serving');
      expect(state.flavor).toBe(index);

      step(state, SERVE_TIME / 2);
      expect(state.phase).toBe('serving');
      expect(travel(state)).toBeGreaterThan(0);

      serve(state);
      expect(state.phase).toBe('served');
      expect(state.flavor).toBe(index);
      expect(state.cones).toBe(1);
    },
  );

  it('moves the scoop from its flavor into the cone', () => {
    const state = createState();
    choose(state, 2);
    const button = FLAVOR_BUTTONS[2];
    expect(scoopPosition(state)).toEqual({ x: button.x + button.w / 2, y: button.y + 20 });
    // Halfway along, it arcs above the straight line to the cone.
    step(state, SERVE_TIME * 0.35);
    expect(scoopPosition(state).y).toBeLessThan((button.y + 20 + CONE_TOP.y) / 2);
    serve(state);
    expect(scoopPosition(state).x).toBeCloseTo(CONE_TOP.x);
    expect(scoopPosition(state).y).toBeCloseTo(CONE_TOP.y);
  });

  it('ignores more choices while serving and after the cone is served', () => {
    const state = createState();
    choose(state, 0);
    expect(choose(state, 1)).toBe(false);
    expect(choose(state, 2)).toBe(false);
    serve(state);
    expect(choose(state, 1)).toBe(false);
    expect(state.flavor).toBe(0);
    expect(state.cones).toBe(1);
  });

  it('ignores flavors that do not exist', () => {
    const state = createState();
    expect(choose(state, 3)).toBe(false);
    expect(choose(state, -1)).toBe(false);
    expect(state.phase).toBe('choosing');
  });

  it('scores each served cone once, with a fixed score', () => {
    const state = createState();
    expect(claimScore(state)).toBeUndefined();
    choose(state, 1);
    step(state, SERVE_TIME / 2);
    expect(claimScore(state)).toBeUndefined();
    choose(state, 1);
    serve(state);
    expect(claimScore(state)).toBe(COMPLETION_SCORE);
    expect(claimScore(state)).toBeUndefined();
    step(state, 1);
    expect(claimScore(state)).toBeUndefined();
  });

  it('makes another cone from a clean counter', () => {
    const state = createState();
    expect(makeAnother(state)).toBe(false);
    choose(state, 2);
    expect(makeAnother(state)).toBe(false);
    serve(state);
    claimScore(state);

    expect(makeAnother(state)).toBe(true);
    expect(state).toMatchObject({ phase: 'choosing', flavor: undefined, elapsed: 0, cones: 1 });
    expect(makeAnother(state)).toBe(false);

    choose(state, 1);
    expect(state.flavor).toBe(1);
    expect(travel(state)).toBe(0);
    serve(state);
    expect(state.cones).toBe(2);
    expect(claimScore(state)).toBe(COMPLETION_SCORE);
  });

  it('serves the finished cone at once with reduced motion', () => {
    const state = createState();
    expect(choose(state, 2, true)).toBe(true);
    expect(state.phase).toBe('served');
    expect(state.flavor).toBe(2);
    expect(travel(state)).toBe(1);
    expect(claimScore(state)).toBe(COMPLETION_SCORE);
    expect(claimScore(state)).toBeUndefined();
    expect(choose(state, 0, true)).toBe(false);
    makeAnother(state);
    expect(choose(state, 0, true)).toBe(true);
    expect(state.cones).toBe(2);
  });

  it('finds the flavor and Make another buttons under a point', () => {
    FLAVOR_BUTTONS.forEach((b, i) => expect(flavorAt(b.x + 5, b.y + 5)).toBe(i));
    expect(flavorAt(5, 5)).toBeUndefined();
    const b = MAKE_ANOTHER_BUTTON;
    expect(isMakeAnother(b.x + b.w / 2, b.y + b.h / 2)).toBe(true);
    expect(isMakeAnother(5, 5)).toBe(false);
  });

  it('maps 1, 2 and 3 to the flavors, and Enter or Space to Make another', () => {
    expect(keyAction('1')).toEqual({ type: 'choose', flavor: 0 });
    expect(keyAction('2')).toEqual({ type: 'choose', flavor: 1 });
    expect(keyAction('3')).toEqual({ type: 'choose', flavor: 2 });
    expect(keyAction('Enter')).toEqual({ type: 'another' });
    expect(keyAction(' ')).toEqual({ type: 'another' });
    expect(keyAction('4')).toBeUndefined();
  });
});
