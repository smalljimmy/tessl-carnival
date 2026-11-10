import { describe, expect, it } from 'vitest';
import ringTossDefault, {
  CATCH_RADIUS,
  FLIGHT_TIME,
  PEGS,
  POINTS_PER_RINGER,
  RINGS_PER_ROUND,
  createState,
  pegAt,
  pointerDown,
  ringPosition,
  ringToss,
  settle,
  step,
  toss,
} from './game';

const peg = PEGS[1];
const miss = { x: 50, y: 400 };

/** Lets every ring in the air land. */
function landAll(state: ReturnType<typeof createState>) {
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('is the default export, with the id ring-toss', () => {
    expect(ringTossDefault).toBe(ringToss);
    expect(ringToss.id).toBe('ring-toss');
  });

  it('starts a round with five rings and no score', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(RINGS_PER_ROUND).toBe(5);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('uses one ring per toss and cannot toss a sixth', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) {
      expect(toss(state, miss.x, miss.y)).toBe(true);
    }
    expect(state.ringsLeft).toBe(0);
    expect(toss(state, peg.x, peg.y)).toBe(false);
    expect(state.rings).toHaveLength(RINGS_PER_ROUND);
  });

  it('scores 10 when a ring lands over a peg', () => {
    const state = createState();
    toss(state, peg.x, peg.y);
    landAll(state);
    expect(state.score).toBe(POINTS_PER_RINGER);
    expect(state.rings[0].scored).toBe(true);
  });

  it('scores nothing until the ring lands', () => {
    const state = createState();
    toss(state, peg.x, peg.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
  });

  it('scores nothing for a miss', () => {
    const state = createState();
    toss(state, miss.x, miss.y);
    landAll(state);
    expect(state.score).toBe(0);
    expect(state.rings[0].settled).toBe(true);
    expect(state.rings[0].scored).toBe(false);
  });

  it('catches a ring at the edge of the catch radius, but not beyond it', () => {
    expect(pegAt(peg.x + CATCH_RADIUS, peg.y)).toBe(peg);
    expect(pegAt(peg.x + CATCH_RADIUS + 1, peg.y)).toBeUndefined();
  });

  it('scores each ring at most once', () => {
    const state = createState();
    toss(state, peg.x, peg.y);
    landAll(state);
    step(state, 1);
    settle(state, state.rings[0]);
    expect(state.score).toBe(POINTS_PER_RINGER);
  });

  it('draws a settled ring at its landing point, even if settled early', () => {
    const state = createState();
    toss(state, peg.x, peg.y);
    settle(state, state.rings[0]);
    expect(ringPosition(state.rings[0])).toEqual({ x: peg.x, y: peg.y });
  });

  it('ends the round only after all five rings settle', () => {
    const state = createState();
    for (const p of PEGS) toss(state, p.x, p.y);
    toss(state, miss.x, miss.y);
    landAll(state);
    expect(state.phase).toBe('playing');
    toss(state, peg.x, peg.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
    expect(state.score).toBe(4 * POINTS_PER_RINGER);
  });

  it('ignores tosses once the round is over', () => {
    const state = createState();
    state.ringsLeft = 0;
    step(state, 0);
    expect(state.phase).toBe('over');
    expect(toss(state, peg.x, peg.y)).toBe(false);
  });

  it('tosses on a click while playing', () => {
    const state = createState();
    expect(pointerDown(state, peg.x, peg.y)).toBe(state);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
  });

  it('starts a fresh round on a click after the round is over', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) toss(state, peg.x, peg.y);
    landAll(state);
    expect(state.phase).toBe('over');
    const next = pointerDown(state, peg.x, peg.y);
    expect(next).not.toBe(state);
    expect(next.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(next.score).toBe(0);
    expect(next.rings).toHaveLength(0);
    expect(next.phase).toBe('playing');
  });
});
