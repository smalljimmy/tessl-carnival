# Ring Toss

Toss rings over the three pegs before you run out.

## How to play

- Move the pointer to aim: a small circle marks where your ring will land.
- Click (or tap) to toss a ring. It flies from the bottom of the booth and lands
  exactly where you clicked, 0.6 seconds later.
- You have 5 rings per round. Once they are gone, further clicks toss nothing.
- The round ends when all five rings have landed. The final score shows on the
  screen; click again to start a fresh round with five new rings.

## Scoring

A ring that lands within 18 px of a peg's centre goes over the peg and scores
10 points. Anything else is a miss and scores nothing. Each ring scores at most
once, so the best round is 50 points.

The three pegs stand still, at (200, 200), (400, 150) and (600, 200) on the
800 x 500 board. A ring that scored turns gold; a miss turns grey.

Your final score is saved to the carnival's score board once, when the round
ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `settle`, `pegAt`,
  `pointerDown`, `ringPosition`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
