"use strict";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  "#47dcef", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#69cf6e", // S - green
  "#e57373", // Z - red
  "#82b1ff", // J - indigo
  "#ffb74d", // L - orange
];

const PIECES = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const HIGHSCORES_KEY = "tetris-highscores";
const MAX_HIGHSCORES = 5;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next-canvas");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayScore = document.getElementById("overlay-score");
const restartBtn = document.getElementById("restart-btn");
const themeToggle = document.getElementById("theme-toggle");
const highscoresTableStartBody = document.querySelector(
  "#highscores-table-start tbody"
);
const highscoresTableEndBody = document.querySelector(
  "#highscores-table-end tbody"
);
const highscoresSummaryStart = document.getElementById(
  "highscores-summary-start"
);
const highscoresSummaryEnd = document.getElementById("highscores-summary-end");
const resetHighscoresBtn = document.getElementById("reset-highscores-btn");
const overlayHighscores = document.getElementById("overlay-highscores");
const nameEntry = document.getElementById("name-entry");
const playerNameInput = document.getElementById("player-name-input");
const saveHighscoreBtn = document.getElementById("save-highscore-btn");

let gridColor = "#22222e";

function updateGridColor() {
  gridColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--grid-color")
    .trim();
}

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("tetris-theme", theme);
  themeToggle.checked = theme === "light";
  updateGridColor();
}

themeToggle.checked =
  document.documentElement.getAttribute("data-theme") === "light";
themeToggle.addEventListener("change", () => {
  applyTheme(themeToggle.checked ? "light" : "dark");
});

let board,
  current,
  next,
  score,
  lines,
  level,
  paused,
  gameOver,
  lastTime,
  dropAccum,
  dropInterval,
  animId,
  currentMaxCombo,
  pendingRecord;

function loadHighscores() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIGHSCORES_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHighscoresList(list) {
  localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(list));
}

function qualifiesForHighscore(candidateScore) {
  const list = loadHighscores();
  if (list.length < MAX_HIGHSCORES) return true;
  return candidateScore > list[list.length - 1].score;
}

function insertHighscore(record) {
  const list = loadHighscores();
  list.push(record);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_HIGHSCORES);
  saveHighscoresList(trimmed);
  return trimmed;
}

function bestGlobalStats(list) {
  let bestCombo = 0;
  let mostLines = 0;
  for (const r of list) {
    if (r.combo > bestCombo) bestCombo = r.combo;
    if (r.lines > mostLines) mostLines = r.lines;
  }
  return { bestCombo, mostLines };
}

function renderHighscoresTable(tbody, list, highlightId) {
  tbody.innerHTML = "";
  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Sin récords todavía";
    td.className = "highscores-empty";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  list.forEach((record, i) => {
    const tr = document.createElement("tr");
    if (highlightId != null && record.id === highlightId) {
      tr.classList.add("highscore-current");
    }
    [i + 1, record.name, record.score.toLocaleString(), record.lines, record.combo].forEach(
      (val) => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      }
    );
    tbody.appendChild(tr);
  });
}

function renderHighscores(highlightId) {
  const list = loadHighscores();
  const { bestCombo, mostLines } = bestGlobalStats(list);
  const summaryText = list.length
    ? `Mejor combo: ${bestCombo} líneas · Más líneas en una partida: ${mostLines}`
    : "";
  renderHighscoresTable(highscoresTableStartBody, list, highlightId);
  highscoresSummaryStart.textContent = summaryText;
  renderHighscoresTable(highscoresTableEndBody, list, highlightId);
  highscoresSummaryEnd.textContent = summaryText;
}

function commitHighscore() {
  if (!pendingRecord) return;
  const name = (playerNameInput.value || "").trim().slice(0, 10) || "???";
  const record = {
    id: Date.now() + Math.random(),
    name,
    score: pendingRecord.score,
    lines: pendingRecord.lines,
    combo: pendingRecord.combo,
  };
  insertHighscore(record);
  nameEntry.classList.add("hidden");
  pendingRecord = null;
  renderHighscores(record.id);
}

resetHighscoresBtn.addEventListener("click", () => {
  localStorage.removeItem(HIGHSCORES_KEY);
  renderHighscores();
});

saveHighscoreBtn.addEventListener("click", commitHighscore);
playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") commitHighscore();
});

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length,
    cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared > currentMaxCombo) currentMaxCombo = cleared;
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = "GAME OVER";
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;

  overlayHighscores.classList.remove("hidden");
  pendingRecord = { score, lines, combo: currentMaxCombo };
  if (qualifiesForHighscore(score)) {
    nameEntry.classList.remove("hidden");
    playerNameInput.value = "";
    renderHighscores();
    overlay.classList.remove("hidden");
    playerNameInput.focus();
  } else {
    nameEntry.classList.add("hidden");
    pendingRecord = null;
    renderHighscores();
    overlay.classList.remove("hidden");
  }
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = "PAUSA";
    overlayScore.textContent = "";
    overlayHighscores.classList.add("hidden");
    overlay.classList.remove("hidden");
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  updateGridColor();
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  currentMaxCombo = 0;
  pendingRecord = null;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add("hidden");
  overlayHighscores.classList.add("hidden");
  nameEntry.classList.add("hidden");
  renderHighscores();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyP") {
    togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case "ArrowLeft":
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case "ArrowRight":
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case "ArrowDown":
      softDrop();
      break;
    case "ArrowUp":
    case "KeyX":
      tryRotate();
      break;
    case "Space":
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener("click", init);

init();
