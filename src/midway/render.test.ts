import { describe, expect, it } from 'vitest';
import { propBounds } from './render';
import { CART_KINDS, layoutMidway, toScreen, type Prop } from './world';

/** The corners of a sign drawn by signBoard (border included) through onPlane's skew. */
function signCorners(prop: Prop, width: number, height: number, z: number) {
  const c = toScreen(prop.x + 0.5, prop.y + 0.5);
  const corners = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const x = sx * (width / 2 + 2);
      const y = sy * (height / 2 + 2);
      corners.push({ x: c.x + 0.894 * x, y: c.y - z + 0.447 * x + y });
    }
  return corners;
}

describe('the ice cream cart bounds', () => {
  const map = layoutMidway(['water-cannon', 'ice-cream-bar']);
  const iceCream = CART_KINDS.indexOf('Ice cream');

  it('covers the whole Ice Cream Bar sign, so all of it can be hovered and clicked', () => {
    const cart = map.props.find((p) => p.gameId === 'ice-cream-bar')!;
    const b = propBounds(cart);
    for (const p of signCorners(cart, 44, 11, 50)) {
      expect(p.x).toBeGreaterThanOrEqual(b.left);
      expect(p.x).toBeLessThanOrEqual(b.right);
      expect(p.y).toBeGreaterThanOrEqual(b.top);
      expect(p.y).toBeLessThanOrEqual(b.bottom);
    }
    // The point the review found falling through to the ground: plane-local (-12, -4).
    const c = toScreen(cart.x + 0.5, cart.y + 0.5);
    const missed = { x: c.x + 0.894 * -12, y: c.y - 50 + 0.447 * -12 - 4 };
    expect(missed.y).toBeGreaterThanOrEqual(b.top);
    expect(missed.x).toBeGreaterThanOrEqual(b.left);
  });

  it('leaves the bounds of decorative carts as they were', () => {
    const decorative = { ...map.props.find((p) => p.gameId === 'ice-cream-bar')! };
    delete decorative.gameId;
    expect(decorative.variant % CART_KINDS.length).toBe(iceCream);
    const c = toScreen(decorative.x + 0.5, decorative.y + 0.5);
    expect(propBounds(decorative)).toEqual({
      left: c.x - 16,
      right: c.x + 16,
      top: c.y - 8 - 50,
      bottom: c.y + 8,
    });
  });
});
