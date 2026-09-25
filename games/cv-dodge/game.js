(function () {
  'use strict';

  const gameId = 'cv-dodge';
  const bestScoreKey = 'cv-games-cv-dodge-best';
  const favoriteStorageKey = 'cv-games-favorites';
  const themeStorageKey = 'cv-games-theme';
  const canvasWidth = 480;
  const canvasHeight = 640;
  const playerWidth = 54;
  const playerHeight = 54;
  const lanePattern = [0.5, 0.18, 0.82, 0.34, 0.66, 0.5, 0.12, 0.88, 0.3, 0.7];
  const stars = [
    [48, 55, 2], [122, 130, 1.5], [210, 74, 2], [312, 155, 1.5], [418, 70, 2],
    [76, 283, 1.5], [167, 236, 2], [276, 322, 1.5], [391, 253, 2], [446, 386, 1.5],
    [52, 492, 2], [146, 555, 1.5], [258, 455, 2], [359, 530, 1.5], [432, 592, 2]
  ];

  const bySelector = (selector) => document.querySelector(selector);
  const canvas = bySelector('[data-cv-dodge-canvas]');
  const context = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !context) return;

  const scoreElement = bySelector('[data-score]');
  const bestScoreElement = bySelector('[data-best-score]');
  const finalScoreElement = bySelector('[data-final-score]');
  const finalBestScoreElement = bySelector('[data-final-best-score]');
  const introScreen = bySelector('[data-intro-screen]');
  const pauseScreen = bySelector('[data-pause-screen]');
  const gameOverScreen = bySelector('[data-gameover-screen]');
  const pauseButton = bySelector('[data-pause-game]');
  const statusElement = bySelector('[data-game-status]');
  const favoriteButton = bySelector('[data-game-favorite]');
  const stats = window.CV_GAMES_STATS;
  const state = {
    mode: 'intro',
    frameId: null,
    lastTime: 0,
    elapsed: 0,
    score: 0,
    avoided: 0,
    nextSpawnAt: 0.85,
    laneIndex: 0,
    obstacles: [],
    movement: { left: false, right: false },
    player: null,
    bestScore: readBestScore(),
    accessRegistered: false
  };

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  function readBestScore() {
    try {
      const value = Math.floor(Number(localStorage.getItem(bestScoreKey)));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function persistBestScore() {
    try {
      localStorage.setItem(bestScoreKey, String(state.bestScore));
    } catch {
      // O recorde continua visível enquanto a página permanecer aberta.
    }
  }

  function getFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(favoriteStorageKey) || '[]');
      return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []);
    } catch {
      return new Set();
    }
  }

  let favorites = getFavorites();

  function saveFavorites() {
    try {
      localStorage.setItem(favoriteStorageKey, JSON.stringify([...favorites]));
      window.dispatchEvent(new Event('cv-games-favorites-change'));
    } catch {
      // Favoritar não interrompe a partida se o armazenamento estiver indisponível.
    }
  }

  function updateFavoriteInterface() {
    const isFavorite = favorites.has(gameId);
    const icon = favoriteButton?.querySelector('.favorite-icon');
    const label = favoriteButton?.querySelector('[data-favorite-label]');
    const count = favoriteButton?.querySelector('[data-favorite-count]');
    if (favoriteButton) {
      favoriteButton.setAttribute('aria-pressed', String(isFavorite));
      favoriteButton.setAttribute('aria-label', isFavorite ? 'Remover CV DODGE dos favoritos' : 'Adicionar CV DODGE aos favoritos');
      favoriteButton.setAttribute('title', isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    }
    if (icon) icon.textContent = isFavorite ? '♥' : '♡';
    if (label) label.textContent = isFavorite ? 'Favoritado' : 'Favoritar';
    if (count) count.textContent = String(favorites.size);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // A preferência ainda vale enquanto esta página estiver aberta.
    }
    const toggle = bySelector('[data-theme-toggle]');
    if (toggle) {
      const isLight = theme === 'light';
      toggle.textContent = isLight ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
      toggle.setAttribute('title', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
    }
  }

  function setMode(mode) {
    state.mode = mode;
    document.body.dataset.cvDodgeState = mode;
    if (introScreen) introScreen.hidden = mode !== 'intro';
    if (pauseScreen) pauseScreen.hidden = mode !== 'paused';
    if (gameOverScreen) gameOverScreen.hidden = mode !== 'gameover';
    if (pauseButton) {
      const isPaused = mode === 'paused';
      pauseButton.textContent = isPaused ? '▶ Retomar' : '⏸ Pausar';
      pauseButton.setAttribute('aria-label', isPaused ? 'Retomar jogo' : 'Pausar jogo');
      pauseButton.disabled = mode === 'intro' || mode === 'gameover';
    }
    const messages = {
      intro: 'Tela inicial. Escolha Jogar para começar.',
      running: 'Partida em andamento. Desvie dos obstáculos.',
      paused: 'Jogo pausado. Pontuação e obstáculos congelados.',
      gameover: `Fim de partida. Pontuação ${state.score}.`
    };
    if (statusElement) statusElement.textContent = messages[mode] || '';
  }

  function setScore(score) {
    state.score = score;
    if (scoreElement) scoreElement.textContent = String(score);
    if (bestScoreElement) bestScoreElement.textContent = String(Math.max(state.bestScore, score));
  }

  function updateFinalScores() {
    if (finalScoreElement) finalScoreElement.textContent = String(state.score);
    if (finalBestScoreElement) finalBestScoreElement.textContent = String(state.bestScore);
    if (bestScoreElement) bestScoreElement.textContent = String(state.bestScore);
  }

  function clearMovement() {
    state.movement.left = false;
    state.movement.right = false;
  }

  function cancelFrame() {
    if (state.frameId !== null) {
      window.cancelAnimationFrame(state.frameId);
      state.frameId = null;
    }
  }

  function resetRound() {
    cancelFrame();
    clearMovement();
    state.elapsed = 0;
    state.score = 0;
    state.avoided = 0;
    state.nextSpawnAt = 0.85;
    state.laneIndex = 0;
    state.obstacles = [];
    state.player = {
      x: (canvasWidth - playerWidth) / 2,
      y: canvasHeight - playerHeight - 34,
      width: playerWidth,
      height: playerHeight,
      speed: 285
    };
    setScore(0);
    drawScene();
  }

  function registerFirstSessionStart() {
    if (state.accessRegistered) return;
    if (typeof stats?.registerAccess === 'function') stats.registerAccess(gameId);
    state.accessRegistered = true;
  }

  function startGame() {
    if (state.mode === 'running') return;
    resetRound();
    registerFirstSessionStart();
    setMode('running');
    state.lastTime = performance.now();
    state.frameId = window.requestAnimationFrame(gameLoop);
  }

  function pauseGame() {
    if (state.mode !== 'running') return;
    cancelFrame();
    clearMovement();
    setMode('paused');
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    setMode('running');
    state.lastTime = performance.now();
    state.frameId = window.requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (state.mode === 'running') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  }

  function getObstacleSpeed() {
    return Math.min(188 + state.elapsed * 6.2, 360);
  }

  function getSpawnInterval() {
    return Math.max(1.22 - state.elapsed * 0.014, 0.56);
  }

  function spawnObstacle() {
    const width = 62 + ((state.laneIndex * 13) % 27);
    const height = 30 + ((state.laneIndex * 7) % 15);
    const lane = lanePattern[state.laneIndex % lanePattern.length];
    state.obstacles.push({
      x: clamp(canvasWidth * lane - width / 2, 18, canvasWidth - width - 18),
      y: -height - 8,
      width,
      height,
      speed: getObstacleSpeed(),
      hue: 10 + ((state.laneIndex * 47) % 64)
    });
    state.laneIndex += 1;
  }

  function overlaps(first, second) {
    return first.x < second.x + second.width
      && first.x + first.width > second.x
      && first.y < second.y + second.height
      && first.y + first.height > second.y;
  }

  function endGame() {
    clearMovement();
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      persistBestScore();
    }
    updateFinalScores();
    setMode('gameover');
    drawScene();
  }

  function update(delta) {
    const player = state.player;
    const direction = Number(state.movement.right) - Number(state.movement.left);
    player.x = clamp(player.x + direction * player.speed * delta, 14, canvasWidth - player.width - 14);

    state.elapsed += delta;
    if (state.elapsed >= state.nextSpawnAt) {
      spawnObstacle();
      state.nextSpawnAt = state.elapsed + getSpawnInterval();
    }

    const activeObstacles = [];
    for (const obstacle of state.obstacles) {
      obstacle.y += obstacle.speed * delta;
      if (overlaps(player, obstacle)) {
        endGame();
        return;
      }
      if (obstacle.y > canvasHeight + obstacle.height) state.avoided += 1;
      else activeObstacles.push(obstacle);
    }
    state.obstacles = activeObstacles;
    setScore(Math.floor(state.elapsed * 10) + state.avoided * 5);
  }

  function roundedRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }

  function drawBackground() {
    const gradient = context.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#071f42');
    gradient.addColorStop(.56, '#123d73');
    gradient.addColorStop(1, '#25174f');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    context.fillStyle = 'rgba(128, 232, 255, .76)';
    stars.forEach(([x, y, radius]) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });

    context.strokeStyle = 'rgba(134, 222, 255, .13)';
    context.lineWidth = 1;
    for (let y = 30; y < canvasHeight; y += 48) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvasWidth, y);
      context.stroke();
    }
  }

  function drawObstacle(obstacle) {
    const fill = context.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    fill.addColorStop(0, `hsl(${obstacle.hue}, 90%, 67%)`);
    fill.addColorStop(1, `hsl(${Math.max(0, obstacle.hue - 10)}, 84%, 48%)`);
    context.save();
    context.shadowColor = 'rgba(255, 105, 102, .38)';
    context.shadowBlur = 12;
    roundedRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 9);
    context.fillStyle = fill;
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(255, 239, 223, .66)';
    context.stroke();
    context.restore();
  }

  function drawPlayer(player) {
    context.save();
    context.translate(player.x + player.width / 2, player.y + player.height / 2);
    context.shadowColor = 'rgba(103, 214, 255, .7)';
    context.shadowBlur = 18;
    context.fillStyle = '#3ecff7';
    context.beginPath();
    context.moveTo(0, -player.height / 2);
    context.lineTo(player.width / 2, player.height / 2);
    context.lineTo(0, player.height / 2 - 11);
    context.lineTo(-player.width / 2, player.height / 2);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = 3;
    context.strokeStyle = '#d7fbff';
    context.stroke();
    context.fillStyle = '#0c3568';
    roundedRect(-9, -5, 18, 23, 5);
    context.fill();
    context.restore();
  }

  function drawScene() {
    drawBackground();
    state.obstacles.forEach(drawObstacle);
    if (state.player) drawPlayer(state.player);
    context.fillStyle = 'rgba(234, 248, 255, .8)';
    context.font = '800 14px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(`Velocidade ${Math.round(getObstacleSpeed())}`, 18, canvasHeight - 18);
  }

  function gameLoop(timestamp) {
    if (state.mode !== 'running') {
      state.frameId = null;
      return;
    }
    const delta = Math.min((timestamp - state.lastTime) / 1000, 0.05);
    state.lastTime = timestamp;
    update(delta);
    drawScene();
    if (state.mode === 'running') state.frameId = window.requestAnimationFrame(gameLoop);
    else state.frameId = null;
  }

  function isMovementKey(event) {
    return event.code === 'KeyA' || event.code === 'KeyD' || event.key === 'ArrowLeft' || event.key === 'ArrowRight';
  }

  function setMovementFromKey(event, pressed) {
    if (state.mode !== 'running' || !isMovementKey(event)) return false;
    if (event.code === 'KeyA' || event.key === 'ArrowLeft') state.movement.left = pressed;
    if (event.code === 'KeyD' || event.key === 'ArrowRight') state.movement.right = pressed;
    return true;
  }

  function bindHeldControl(selector, direction) {
    const button = bySelector(selector);
    if (!button) return;
    const release = () => { state.movement[direction] = false; };
    button.addEventListener('pointerdown', (event) => {
      if (state.mode !== 'running') return;
      event.preventDefault();
      state.movement[direction] = true;
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch {
        // Eventos de ponteiro sintetizados não possuem captura ativa.
      }
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('lostpointercapture', release);
  }

  function prepareMenu() {
    const menuButton = bySelector('[data-menu-toggle]');
    const menu = bySelector('[data-primary-nav]');
    if (!menuButton || !menu) return;
    menuButton.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }

  function init() {
    resetRound();
    setMode('intro');
    updateFinalScores();
    updateFavoriteInterface();
    prepareMenu();
    setTheme(document.documentElement.dataset.theme || 'dark');

    bySelector('[data-start-game]')?.addEventListener('click', startGame);
    bySelector('[data-restart-game]')?.addEventListener('click', startGame);
    bySelector('[data-pause-game]')?.addEventListener('click', togglePause);
    bySelector('[data-resume-game]')?.addEventListener('click', resumeGame);
    favoriteButton?.addEventListener('click', () => {
      if (favorites.has(gameId)) favorites.delete(gameId);
      else favorites.add(gameId);
      saveFavorites();
      updateFavoriteInterface();
    });
    bySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'p' && (state.mode === 'running' || state.mode === 'paused')) {
        event.preventDefault();
        togglePause();
        return;
      }
      if (setMovementFromKey(event, true)) event.preventDefault();
    });
    document.addEventListener('keyup', (event) => {
      if (setMovementFromKey(event, false)) event.preventDefault();
    });
    bindHeldControl('[data-move-left]', 'left');
    bindHeldControl('[data-move-right]', 'right');
    window.addEventListener('blur', () => {
      clearMovement();
      if (state.mode === 'running') pauseGame();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.mode === 'running') pauseGame();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
