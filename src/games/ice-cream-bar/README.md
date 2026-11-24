# Ice Cream Bar

Pick a flavor and watch it scooped into a cone. There is no timer, no money and
nothing to win or lose: make as many cones as you like.

## Getting there

The Ice Cream Bar runs at the ice cream cart instead of at a booth: the blue
cart below the peaked tent, on the right of the avenue. Walk up to the cart (or
click it and the player walks there). Its sign reads ICE CREAM BAR and lights
up when you are close enough, a prompt reads "Ice Cream Bar: press E", and the
booth card shows a Play link. Press <kbd>E</kbd>, <kbd>Enter</kbd> or
<kbd>Space</kbd>, click the cart again, or use the card's Play link. The Booths
list in the corner also links to it, at `#/play/ice-cream-bar`.

## How to play

- Pick Vanilla, Chocolate or Strawberry: click or tap its button, or press
  <kbd>1</kbd>, <kbd>2</kbd> or <kbd>3</kbd>.
- A scoop in that flavor lifts out of its tub and drops onto the cone, which
  takes a little over a second. Choices made while it is serving are ignored.
- The finished cone is shown with the flavor's name. Click **Make another**, or
  press <kbd>Enter</kbd> or <kbd>Space</kbd>, to clear the counter and pick again.
- If your system asks for reduced motion, the scoop skips its trip and the
  finished cone shows straight away.

The instructions for the current step show at the top of the bar.

## Scoring

Every cone served completes a round worth 1 point, whatever the flavor and
however long it took. It is saved to the carnival's score board once, when the
cone is served, so the midway shows `Best: 1` after your first cone.

## Files

- `game.ts`: the logic (`createState`, `choose`, `step`, `claimScore`,
  `makeAnother`, `scoopPosition`, `flavorAt`, `keyAction`) and the `iceCreamBar`
  entry, the default export the midway finds.
- `game.test.ts`: tests for the logic.
