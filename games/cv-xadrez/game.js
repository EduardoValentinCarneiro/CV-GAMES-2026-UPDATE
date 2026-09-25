(function () {
  'use strict';

  const Chess = window.CV_CHESS_ENGINE;
  if (!Chess) return;
  const $ = (selector) => document.querySelector(selector);
  const boardElement = $('[data-board]');
  const lobby = $('[data-lobby]');
  const gameView = $('[data-game-view]');
  const boardStack = $('[data-board-stack]');
  const settingsDialog = $('[data-settings-dialog]');
  const promotionDialog = $('[data-promotion-dialog]');
  const settingsKey = 'cv-games-chess-settings-v1';
  const favoriteKey = 'cv-games-favorites';
  const gameId = 'cv-xadrez';
  const symbols = {
    wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
    bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟'
  };
  const names = { K:'rei', Q:'dama', R:'torre', B:'bispo', N:'cavalo', P:'peão' };
  const materialValues = { Q:9, R:5, B:3, N:3, P:1, K:0 };
  const defaultSettings = { rotate:true, showMoves:true, coordinates:true };

  const ui = {
    startLocal:$('[data-start-local]'), turnLabel:$('[data-turn-label]'), turnPanel:$('[data-live-turn]'),
    status:$('[data-game-status]'), statusDetail:$('[data-status-detail]'), statusCard:$('.chess-status-card'), statusIcon:$('[data-status-icon]'),
    undo:$('[data-undo]'), drawClaim:$('[data-draw-claim]'), resign:$('[data-resign]'), newGame:$('[data-new-game]'),
    settingsOpen:$('[data-settings-open]'), settingsClose:$('[data-settings-close]'),
    moveList:$('[data-move-list]'), moveCount:$('[data-move-count]'), whiteCaptured:$('[data-white-captured]'), blackCaptured:$('[data-black-captured]'),
    whiteMaterial:$('[data-white-material]'), blackMaterial:$('[data-black-material]'),
    rotateSetting:$('[data-setting-rotate]'), movesSetting:$('[data-setting-moves]'), coordinatesSetting:$('[data-setting-coordinates]'), favorite:$('[data-game-favorite]')
  };
  const state = {
    position:Chess.createInitialPosition(), legalMoves:[], selected:null, lastMove:null, outcome:null, focusSquare:60,
    moveLog:[], undoStack:[], repetitions:new Map(), capturedBy:{ w:[], b:[] },
    settings:readSettings(), promotionMove:null, started:false
  };
  const squareButtons = [];

  function readSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(settingsKey) || '{}');
      return { ...defaultSettings, ...Object.fromEntries(Object.keys(defaultSettings).map((key) => [key, typeof stored[key] === 'boolean' ? stored[key] : defaultSettings[key]])) };
    } catch { return { ...defaultSettings }; }
  }
  function saveSettings() {
    try { localStorage.setItem(settingsKey, JSON.stringify(state.settings)); } catch { /* Preferências continuam nesta sessão. */ }
  }
  function colorName(color) { return color === 'w' ? 'brancas' : 'pretas'; }
  function sideName(color) { return color === 'w' ? 'Brancas' : 'Pretas'; }
  function pieceDescription(piece) { return piece ? `${piece[0] === 'w' ? 'peça branca' : 'peça preta'}: ${names[piece[1]]}` : 'casa vazia'; }
  function pieceAt(position, square) { return position.board[square]; }
  function currentPositionKey() { return Chess.positionKey(state.position); }
  function isFinished() { return Boolean(state.outcome && ['checkmate','stalemate','fivefold','seventy-five-move','insufficient','claimed-draw','resignation'].includes(state.outcome.type)); }

  function createBoard() {
    const fragment = document.createDocumentFragment();
    for (let square = 0; square < 64; square += 1) {
      const row = Chess.rowOf(square);
      const col = Chess.colOf(square);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
      button.dataset.square = String(square);
      button.setAttribute('role', 'gridcell');
      button.tabIndex = square === state.focusSquare ? 0 : -1;
      const piece = document.createElement('span');
      piece.className = 'chess-piece';
      piece.setAttribute('aria-hidden', 'true');
      button.append(piece);
      fragment.append(button);
      squareButtons.push(button);
    }
    boardElement.replaceChildren(fragment);
    render();
  }

  function clearSquareDecorations(button) {
    button.classList.remove('is-selected','is-legal','is-capture','is-check','is-last-move');
    button.querySelectorAll('.square-coordinate').forEach((label) => label.remove());
  }

  function renderCoordinates(button, square, flipped) {
    if (!state.settings.coordinates) return;
    const row = Chess.rowOf(square);
    const col = Chess.colOf(square);
    const fileOnEdge = flipped ? row === 0 : row === 7;
    const rankOnEdge = flipped ? col === 7 : col === 0;
    if (fileOnEdge) {
      const file = document.createElement('span');
      file.className = `square-coordinate file${flipped ? ' file-edge-flipped' : ''}`;
      file.textContent = Chess.squareName(square)[0];
      file.setAttribute('aria-hidden','true');
      button.append(file);
    }
    if (rankOnEdge) {
      const rank = document.createElement('span');
      rank.className = `square-coordinate rank${flipped ? ' rank-edge-flipped' : ''}`;
      rank.textContent = Chess.squareName(square)[1];
      rank.setAttribute('aria-hidden','true');
      button.append(rank);
    }
  }

  function renderBoard() {
    const flipped = state.settings.rotate && state.position.turn === 'b';
    boardElement.classList.toggle('is-flipped', flipped);
    boardStack.dataset.bottomSide = flipped ? 'black' : 'white';
    const checkedKing = Chess.isInCheck(state.position) ? state.position.board.findIndex((piece) => piece === `${state.position.turn}K`) : -1;
    const legalForSelected = state.selected === null ? [] : state.legalMoves.filter((move) => move.from === state.selected);
    const legalDestinations = new Map();
    for (const move of legalForSelected) {
      const previous = legalDestinations.get(move.to) || { capture:false };
      previous.capture ||= Boolean(move.capture);
      legalDestinations.set(move.to, previous);
    }
    for (let square = 0; square < 64; square += 1) {
      const button = squareButtons[square];
      const piece = pieceAt(state.position, square);
      clearSquareDecorations(button);
      const pieceElement = button.querySelector('.chess-piece');
      pieceElement.textContent = piece ? symbols[piece] : '';
      pieceElement.classList.toggle('white', piece?.[0] === 'w');
      pieceElement.classList.toggle('black', piece?.[0] === 'b');
      button.setAttribute('aria-label', `${Chess.squareName(square)}, ${pieceDescription(piece)}`);
      if (square === state.selected) button.classList.add('is-selected');
      if (state.lastMove && (square === state.lastMove.from || square === state.lastMove.to)) button.classList.add('is-last-move');
      if (square === checkedKing) button.classList.add('is-check');
      const destination = legalDestinations.get(square);
      if (destination && state.settings.showMoves) {
        button.classList.add('is-legal');
        if (destination.capture) button.classList.add('is-capture');
      }
      renderCoordinates(button, square, flipped);
      button.tabIndex = square === state.focusSquare ? 0 : -1;
    }
  }

  function renderSeats() {
    const current = state.position.turn;
    for (const color of ['w','b']) {
      const card = $(`[data-player-card="${color === 'w' ? 'white' : 'black'}"]`);
      card.classList.toggle('is-active', !isFinished() && current === color);
      const text = $(`[data-${color === 'w' ? 'white' : 'black'}-state]`);
      if (text) text.textContent = isFinished() ? 'Partida encerrada' : current === color ? 'Sua vez de jogar' : 'Esperando a vez';
      const capturedElement = color === 'w' ? ui.whiteCaptured : ui.blackCaptured;
      const capturedPieces = [...state.capturedBy[color]].sort((a,b) => materialValues[b[1]] - materialValues[a[1]]);
      capturedElement.textContent = capturedPieces.map((piece) => symbols[piece]).join('');
      capturedElement.setAttribute('aria-label', `Peças capturadas pelas ${colorName(color)}: ${capturedPieces.map((piece) => names[piece[1]]).join(', ') || 'nenhuma'}`);
    }
    const whitePoints = state.capturedBy.w.reduce((sum,piece) => sum + materialValues[piece[1]],0);
    const blackPoints = state.capturedBy.b.reduce((sum,piece) => sum + materialValues[piece[1]],0);
    ui.whiteMaterial.textContent = whitePoints ? `+${whitePoints}` : '—';
    ui.blackMaterial.textContent = blackPoints ? `+${blackPoints}` : '—';
    ui.turnPanel.dataset.turn = current;
  }

  function renderStatus() {
    const current = state.position.turn;
    const outcome = state.outcome || {};
    let title = `Vez das ${colorName(current)}`;
    let detail = 'Escolha uma peça para ver seus movimentos.';
    let icon = current === 'w' ? '♙' : '♟';
    ui.statusCard.classList.remove('is-check','is-finished');
    if (outcome.type === 'checkmate') {
      title = `Xeque-mate — ${colorName(outcome.winner)} venceram`;
      detail = `Vitória das ${colorName(outcome.winner)}.`;
      icon = '♛';
      ui.statusCard.classList.add('is-finished');
    } else if (outcome.type === 'stalemate') {
      title = 'Empate por afogamento'; detail = 'O jogador da vez não tem lances legais e não está em xeque.'; icon = '½'; ui.statusCard.classList.add('is-finished');
    } else if (outcome.type === 'fivefold') {
      title = 'Empate por repetição'; detail = 'A mesma posição ocorreu cinco vezes.'; icon = '½'; ui.statusCard.classList.add('is-finished');
    } else if (outcome.type === 'seventy-five-move') {
      title = 'Empate pela regra dos 75 lances'; detail = '75 lances foram feitos sem captura ou movimento de peão.'; icon = '½'; ui.statusCard.classList.add('is-finished');
    } else if (outcome.type === 'insufficient') {
      title = 'Empate por material insuficiente'; detail = 'Não há material suficiente para forçar xeque-mate.'; icon = '½'; ui.statusCard.classList.add('is-finished');
    } else if (outcome.type === 'claimed-draw') {
      title = 'Empate reivindicado'; detail = outcome.reason; icon = '½'; ui.statusCard.classList.add('is-finished');
    } else if (outcome.type === 'resignation') {
      title = `Vitória das ${colorName(outcome.winner)}`; detail = `${sideName(outcome.loser)} desistiram da partida.`; icon = '⚑'; ui.statusCard.classList.add('is-finished');
    } else if (outcome.check) {
      title = `Xeque nas ${colorName(current)}`; detail = `As ${colorName(current)} precisam responder ao xeque.`; icon = '♔'; ui.statusCard.classList.add('is-check');
    }
    ui.status.textContent = title;
    ui.statusDetail.textContent = detail;
    ui.statusIcon.textContent = icon;
    ui.turnLabel.textContent = isFinished() ? title : `Vez das ${colorName(current)}`;
    ui.drawClaim.disabled = !(outcome.claimable && !isFinished());
    ui.drawClaim.title = outcome.claimable ? 'Reivindicar empate por repetição ou pela regra dos 50 lances' : 'Disponível após uma posição ocorrer três vezes ou 50 lances sem captura ou movimento de peão';
    ui.undo.disabled = state.undoStack.length === 0;
  }

  function renderHistory() {
    ui.moveCount.textContent = `${state.moveLog.length} ${state.moveLog.length === 1 ? 'lance' : 'lances'}`;
    if (!state.moveLog.length) {
      const empty = document.createElement('p');
      empty.className = 'chess-empty-history';
      empty.textContent = 'A partida começa com 1. e4, 1. d4 ou qualquer jogada legal.';
      ui.moveList.replaceChildren(empty);
      return;
    }
    const rows = [];
    for (let index = 0; index < state.moveLog.length; index += 2) {
      const white = state.moveLog[index];
      const black = state.moveLog[index + 1];
      const row = document.createElement('div');
      row.className = `chess-move-row${index >= state.moveLog.length - (state.moveLog.length % 2 || 2) ? ' is-latest' : ''}`;
      const number = document.createElement('span'); number.className = 'chess-move-number'; number.textContent = `${white.number}.`;
      const whiteSan = document.createElement('span'); whiteSan.className = 'chess-move-san'; whiteSan.textContent = white.san;
      const blackSan = document.createElement('span'); blackSan.className = 'chess-move-san'; blackSan.textContent = black?.san || '';
      row.append(number,whiteSan,blackSan);
      rows.push(row);
    }
    ui.moveList.replaceChildren(...rows);
    ui.moveList.scrollTop = ui.moveList.scrollHeight;
  }

  function render() {
    state.legalMoves = Chess.getLegalMoves(state.position);
    const key = currentPositionKey();
    state.outcome = state.outcome?.type === 'claimed-draw' || state.outcome?.type === 'resignation'
      ? state.outcome
      : Chess.getOutcome(state.position, state.repetitions.get(key) || 1);
    renderBoard();
    renderSeats();
    renderStatus();
    renderHistory();
  }

  function saveSnapshot() {
    state.undoStack.push({
      position:Chess.clonePosition(state.position), lastMove:state.lastMove ? { ...state.lastMove } : null,
      moveLog:state.moveLog.map((move) => ({ ...move })),
      repetitions:new Map(state.repetitions), capturedBy:{ w:[...state.capturedBy.w], b:[...state.capturedBy.b] },
      outcome:state.outcome ? { ...state.outcome } : null
    });
  }

  function playMove(move) {
    if (isFinished()) return;
    const before = state.position;
    const san = Chess.moveToSan(before, move, state.legalMoves);
    saveSnapshot();
    const result = Chess.applyMove(before, move);
    state.position = result.position;
    state.lastMove = { from:move.from, to:move.to };
    state.focusSquare = move.to;
    if (result.captured) state.capturedBy[before.turn].push(result.captured);
    state.moveLog.push({ color:before.turn, number:before.fullmove, san });
    const key = currentPositionKey();
    state.repetitions.set(key, (state.repetitions.get(key) || 0) + 1);
    state.selected = null;
    render();
    squareButtons[state.focusSquare].focus({ preventScroll:true });
  }

  function selectSquare(square) {
    if (isFinished()) return;
    state.focusSquare = square;
    const piece = pieceAt(state.position, square);
    if (state.selected !== null) {
      const matchingMoves = state.legalMoves.filter((move) => move.from === state.selected && move.to === square);
      if (matchingMoves.length) {
        if (matchingMoves.some((move) => move.promotion)) {
          state.promotionMove = matchingMoves[0];
          showPromotionOptions();
          return;
        }
        playMove(matchingMoves[0]);
        return;
      }
    }
    if (piece && piece[0] === state.position.turn) state.selected = state.selected === square ? null : square;
    else state.selected = null;
    renderBoard();
  }

  function showPromotionOptions() {
    const color = state.position.turn;
    document.querySelectorAll('[data-promote]').forEach((button) => {
      const type = button.dataset.promote;
      const symbol = button.querySelector('span');
      symbol.textContent = symbols[`${color}${type}`];
      symbol.className = `promotion-symbol ${color === 'w' ? 'white' : 'black'}`;
    });
    if (typeof promotionDialog.showModal === 'function') promotionDialog.showModal();
    else promotionDialog.setAttribute('open','');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function startLocalGame() {
    state.position = Chess.createInitialPosition();
    state.selected = null;
    state.lastMove = null;
    state.focusSquare = 60;
    state.moveLog = [];
    state.undoStack = [];
    state.capturedBy = { w:[], b:[] };
    state.repetitions = new Map([[currentPositionKey(),1]]);
    state.outcome = null;
    state.started = true;
    lobby.hidden = true;
    gameView.hidden = false;
    if (window.CV_GAMES_STATS?.recordPlay) window.CV_GAMES_STATS.recordPlay(gameId);
    render();
    squareButtons[60].focus({ preventScroll:true });
  }

  async function newGame() {
    if (state.moveLog.length && !await window.CV_GAMES_DIALOG.confirm({
      title:'Começar outra partida?', message:'A partida atual será encerrada e o tabuleiro voltará à posição inicial.',
      confirmText:'Nova partida', cancelText:'Continuar jogando'
    })) return;
    startLocalGame();
  }

  function undoMove() {
    const snapshot = state.undoStack.pop();
    if (!snapshot) return;
    state.position = snapshot.position;
    state.lastMove = snapshot.lastMove;
    state.moveLog = snapshot.moveLog;
    state.repetitions = snapshot.repetitions;
    state.capturedBy = snapshot.capturedBy;
    state.outcome = snapshot.outcome;
    state.selected = null;
    state.promotionMove = null;
    state.focusSquare = state.lastMove?.to ?? 60;
    if (promotionDialog.open) closeDialog(promotionDialog);
    render();
  }

  function claimDraw() {
    const key = currentPositionKey();
    const repetitionCount = state.repetitions.get(key) || 1;
    const reason = repetitionCount >= 3 ? 'Empate reivindicado por repetição tripla.' : 'Empate reivindicado pela regra dos 50 lances.';
    state.outcome = { type:'claimed-draw', reason };
    state.selected = null;
    render();
  }

  async function resign() {
    if (isFinished()) return;
    const current = state.position.turn;
    if (!await window.CV_GAMES_DIALOG.confirm({
      title:'Desistir da partida?',
      message:`As ${colorName(current)} querem desistir? A vitória será das ${colorName(current === 'w' ? 'b' : 'w')}.`,
      confirmText:'Desistir', cancelText:'Continuar jogando', tone:'danger'
    })) return;
    state.outcome = { type:'resignation', loser:current, winner:current === 'w' ? 'b' : 'w' };
    state.selected = null;
    render();
  }

  function loadSettingsIntoDialog() {
    ui.rotateSetting.checked = state.settings.rotate;
    ui.movesSetting.checked = state.settings.showMoves;
    ui.coordinatesSetting.checked = state.settings.coordinates;
  }

  function updateSettings() {
    state.settings.rotate = ui.rotateSetting.checked;
    state.settings.showMoves = ui.movesSetting.checked;
    state.settings.coordinates = ui.coordinatesSetting.checked;
    saveSettings();
    renderBoard();
    renderSeats();
  }

  function readFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(favoriteKey) || '[]');
      return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []);
    } catch { return new Set(); }
  }
  function updateFavorite() {
    if (!ui.favorite) return;
    const active = readFavorites().has(gameId);
    const icon = ui.favorite.querySelector('.favorite-icon');
    const label = ui.favorite.querySelector('[data-favorite-label]');
    ui.favorite.setAttribute('aria-pressed',String(active));
    ui.favorite.setAttribute('aria-label',`${active ? 'Remover' : 'Adicionar'} CV XADREZ ${active ? 'dos' : 'aos'} favoritos`);
    ui.favorite.title = active ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    if (icon) icon.textContent = active ? '♥' : '♡';
    if (label) label.textContent = active ? 'Favoritado' : 'Favoritar';
  }
  function toggleFavorite() {
    const favorites = readFavorites();
    if (favorites.has(gameId)) favorites.delete(gameId); else favorites.add(gameId);
    try { localStorage.setItem(favoriteKey,JSON.stringify([...favorites])); window.dispatchEvent(new Event('cv-games-favorites-change')); } catch { /* Favoritos são opcionais. */ }
    updateFavorite();
  }

  function prepareMenu() {
    const menuButton = $('[data-menu-toggle]');
    const menu = $('[data-primary-nav]');
    if (!menuButton || !menu) return;
    menuButton.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded',String(open));
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded','false');
    }));
  }

  boardElement.addEventListener('click',(event) => {
    const squareButton = event.target.closest('[data-square]');
    if (squareButton) selectSquare(Number(squareButton.dataset.square));
  });
  boardElement.addEventListener('keydown',(event) => {
    const squareButton = event.target.closest('[data-square]');
    if (!squareButton || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const square = Number(squareButton.dataset.square);
    let row = Chess.rowOf(square);
    let col = Chess.colOf(square);
    const flipped = boardElement.classList.contains('is-flipped');
    const vector = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] }[event.key];
    const direction = flipped ? -1 : 1;
    row += vector[0] * direction;
    col += vector[1] * direction;
    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
      state.focusSquare = row * 8 + col;
      squareButtons[square].tabIndex = -1;
      squareButtons[state.focusSquare].tabIndex = 0;
      squareButtons[state.focusSquare].focus();
    }
  });

  ui.startLocal.addEventListener('click',startLocalGame);
  ui.undo.addEventListener('click',undoMove);
  ui.drawClaim.addEventListener('click',claimDraw);
  ui.resign.addEventListener('click',resign);
  ui.newGame.addEventListener('click',newGame);
  ui.settingsOpen.addEventListener('click',() => { loadSettingsIntoDialog(); if (settingsDialog.showModal) settingsDialog.showModal(); else settingsDialog.setAttribute('open',''); });
  ui.settingsClose.addEventListener('click',() => closeDialog(settingsDialog));
  for (const control of [ui.rotateSetting,ui.movesSetting,ui.coordinatesSetting]) control.addEventListener('change',updateSettings);
  document.querySelectorAll('[data-promote]').forEach((button) => button.addEventListener('click',() => {
    if (!state.promotionMove) return;
    playMove({ ...state.promotionMove, promotion:button.dataset.promote });
    state.promotionMove = null;
    closeDialog(promotionDialog);
  }));
  promotionDialog.addEventListener('close',() => { state.promotionMove = null; });
  settingsDialog.addEventListener('click',(event) => { if (event.target === settingsDialog) closeDialog(settingsDialog); });
  promotionDialog.addEventListener('click',(event) => { if (event.target === promotionDialog) event.preventDefault(); });
  ui.favorite?.addEventListener('click',toggleFavorite);
  function syncThemeButton() {
    const button = $('[data-theme-toggle]');
    if (!button) return;
    const dark = document.documentElement.dataset.theme !== 'light';
    button.setAttribute('aria-label',dark ? 'Ativar modo claro' : 'Ativar modo escuro');
    button.title = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
    button.textContent = dark ? '🌙' : '☀️';
  }
  $('[data-theme-toggle]')?.addEventListener('click',() => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem('cv-games-theme',nextTheme); } catch { /* Theme is still applied for the current page. */ }
    syncThemeButton();
  });
  document.addEventListener('keydown',(event) => {
    if (event.key.toLowerCase() === 'u' && state.started && !event.repeat && !event.ctrlKey && !event.metaKey) undoMove();
    if (event.key === 'Escape' && settingsDialog.open) closeDialog(settingsDialog);
  });

  prepareMenu();
  createBoard();
  updateFavorite();
  syncThemeButton();
})();
