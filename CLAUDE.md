# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla Tetris implementation using HTML5 Canvas, CSS, and plain JavaScript (ES6+). No frameworks, no dependencies, no build step, no package.json, no test suite.

## Running the game

```bash
open index.html            # macOS, just opens the file
python3 -m http.server 8000  # or serve locally, then visit http://localhost:8000
```

There is no lint, build, or test command — this project has none configured.

## Architecture

Three files cooperate, all logic lives in `game.js` (~300 lines):

- `index.html` — DOM structure: a `300×600` `<canvas id="board">` for the game board, a `120×120` `<canvas id="next-canvas">` for the next-piece preview, a side panel (score/lines/level), and a pause/game-over overlay.
- `style.css` — dark/retro arcade look (flexbox layout, backdrop blur on overlays).
- `game.js` — entire game model and loop:
  - Board is a `ROWS × COLS` matrix; each cell is `0` (empty) or a color index `1–7` identifying the locked piece.
  - Pieces (`PIECES`) are square matrices; rotation is transpose + row-reverse (`rotateCW`).
  - `collide(shape, ox, oy)` checks board bounds and overlap with locked cells.
  - `tryRotate()` implements basic wall kicks: on rotation collision, tries shifting ±1/±2 columns before giving up.
  - `loop(ts)` is the `requestAnimationFrame` game loop; accumulates elapsed time and drops the piece one row when `dropInterval` is exceeded.
  - `clearLines()` scans bottom-to-top, removing full rows and unshifting empty ones at the top.
  - Scoring uses `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by current level; hard drop adds 2 pts/row, soft drop 1 pt/row.
  - Level increases every 10 lines cleared; drop speed follows `max(100, 1000 - (level - 1) * 90)` ms.
  - `ghostY()` projects the current piece's landing row for the ghost-piece rendering (`globalAlpha = 0.2`).
  - Game over is triggered in `spawn()` when a freshly spawned piece immediately collides, calling `endGame()`.

Tunable constants at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `width`/`height` of `<canvas id="board">` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).
