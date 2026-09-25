(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const boardElement = $('[data-board]');
  const lobby = $('[data-lobby]');
  const gameView = $('[data-game-view]');
  const gameId = 'cv-jogo-da-velha';
  const scoreKey = 'cv-jogo-da-velha-scores-v1';
  const winLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const ui = {
    start:$('[data-start-local]'), turnCard:$('[data-live-turn]'), turnSymbol:$('[data-turn-symbol]'), turnLabel:$('[data-turn-label]'),
    statusCard:$('[data-status-card]'), statusMark:$('[data-status-mark]'), status:$('[data-game-status]'), statusDetail:$('[data-status-detail]'),
    undo:$('[data-undo]'), resetScores:$('[data-reset-scores]'), newRound:$('[data-new-round]'), roundLabel:$('[data-round-label]'),
    xScore:$('[data-x-score]'), oScore:$('[data-o-score]'), drawScore:$('[data-draw-score]'), xState:$('[data-x-state]'), oState:$('[data-o-state]'),
    moveCount:$('[data-move-count]'), moveList:$('[data-move-list]'), favorite:$('[data-game-favorite]')
  };
  const state = {
    board:Array(9).fill(null), current:'x', starter:'x', started:false, outcome:null,
    winningCells:[], history:[], undoStack:[], focusSquare:4,
    scores:readScores()
  };
  const cells = [];

  function readScores() {
    try {
      const saved = JSON.parse(localStorage.getItem(scoreKey) || '{}');
      return {
        x:Number.isSafeInteger(saved.x) && saved.x >= 0 ? saved.x : 0,
        o:Number.isSafeInteger(saved.o) && saved.o >= 0 ? saved.o : 0,
        draws:Number.isSafeInteger(saved.draws) && saved.draws >= 0 ? saved.draws : 0
      };
    } catch { return { x:0, o:0, draws:0 }; }
  }
  function saveScores() {
    try { localStorage.setItem(scoreKey,JSON.stringify(state.scores)); } catch { /* O placar continua disponível nesta partida. */ }
  }
  function playerName(player) { return player === 'x' ? 'X' : 'O'; }
  function cellName(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    if (row === 1 && col === 1) return 'centro';
    const rows = ['linha de cima','linha do meio','linha de baixo'];
    const columns = ['à esquerda','no centro','à direita'];
    return `${rows[row]}, ${columns[col]}`;
  }
  function createBoard() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 9; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ttt-cell';
      button.dataset.cell = String(index);
      button.setAttribute('role','gridcell');
      button.tabIndex = index === state.focusSquare ? 0 : -1;
      button.setAttribute('aria-label',`Casa ${cellName(index)}, vazia`);
      const mark = document.createElement('span');
      mark.className = 'ttt-mark';
      mark.setAttribute('aria-hidden','true');
      button.append(mark);
      fragment.append(button);
      cells.push(button);
    }
    boardElement.replaceChildren(fragment);
    render();
  }
  function getWinningLine() { return winLines.find((line) => line.every((index) => state.board[index] === state.current)) || null; }
  function recordSnapshot() {
    state.undoStack.push({
      board:[...state.board], current:state.current, outcome:state.outcome,
      winningCells:[...state.winningCells], history:[...state.history], focusSquare:state.focusSquare
    });
  }
  function renderBoard() {
    cells.forEach((button,index) => {
      const value = state.board[index];
      const mark = button.querySelector('.ttt-mark');
      mark.textContent = value === 'x' ? '×' : value === 'o' ? '○' : '';
      mark.className = `ttt-mark${value ? ` ttt-mark-${value}` : ''}`;
      button.classList.toggle('is-winner',state.winningCells.includes(index));
      button.disabled = !state.started || Boolean(value);
      button.tabIndex = index === state.focusSquare ? 0 : -1;
      button.setAttribute('aria-label',`Casa ${cellName(index)}, ${value ? `marcada com ${playerName(value)}` : 'vazia'}`);
    });
  }
  function renderPlayers() {
    const finished = Boolean(state.outcome);
    for (const player of ['x','o']) {
      const card = $(`[data-player-card="${player}"]`);
      card.classList.toggle('is-active',state.started && !finished && state.current === player);
      const label = player === 'x' ? ui.xState : ui.oState;
      label.textContent = !state.started ? 'Aguardando a partida' : finished ? state.outcome.type === 'win' && state.outcome.winner === player ? 'Venceu esta rodada' : 'Rodada encerrada' : state.current === player ? 'Sua vez de jogar' : 'Esperando a vez';
    }
    ui.xScore.textContent = String(state.scores.x);
    ui.oScore.textContent = String(state.scores.o);
    ui.drawScore.textContent = String(state.scores.draws);
  }
  function renderHistory() {
    ui.moveCount.textContent = `${state.history.length} ${state.history.length === 1 ? 'jogada' : 'jogadas'}`;
    if (!state.history.length) {
      const empty = document.createElement('li');
      empty.className = 'ttt-empty-history';
      empty.textContent = 'As jogadas aparecem aqui.';
      ui.moveList.replaceChildren(empty);
      return;
    }
    const items = state.history.map((move,index) => {
      const item = document.createElement('li');
      if (index === state.history.length - 1) item.classList.add('is-latest');
      const number = document.createElement('span'); number.className = 'ttt-move-index'; number.textContent = `${index + 1}.`;
      const player = document.createElement('strong'); player.className = 'ttt-move-player'; player.dataset.player = move.player; player.textContent = playerName(move.player);
      const location = document.createElement('span'); location.textContent = cellName(move.square);
      item.append(number,player,location);
      return item;
    });
    ui.moveList.replaceChildren(...items);
  }
  function renderStatus() {
    ui.statusCard.removeAttribute('data-result');
    if (!state.started) {
      ui.status.textContent = 'Pronto para jogar';
      ui.statusDetail.textContent = 'Faça três símbolos em linha para vencer a rodada.';
      ui.statusMark.textContent = '✦';
      ui.turnCard.dataset.player = 'x';
      ui.turnSymbol.textContent = '×';
      ui.turnLabel.textContent = 'Jogador X';
    } else if (state.outcome?.type === 'win') {
      const winner = state.outcome.winner;
      ui.statusCard.dataset.result = winner;
      ui.status.textContent = `Jogador ${playerName(winner)} venceu!`;
      ui.statusDetail.textContent = 'Três em linha. Comece outra rodada para continuar a disputa.';
      ui.statusMark.textContent = winner === 'x' ? '×' : '○';
      ui.turnCard.dataset.player = 'finished';
      ui.turnSymbol.textContent = '✓';
      ui.turnLabel.textContent = `Vitória de ${playerName(winner)}`;
    } else if (state.outcome?.type === 'draw') {
      ui.statusCard.dataset.result = 'draw';
      ui.status.textContent = 'Deu velha!';
      ui.statusDetail.textContent = 'As nove casas foram preenchidas. A próxima rodada começa com o outro jogador.';
      ui.statusMark.textContent = '½';
      ui.turnCard.dataset.player = 'finished';
      ui.turnSymbol.textContent = '½';
      ui.turnLabel.textContent = 'Rodada empatada';
    } else {
      ui.status.textContent = `Vez do jogador ${playerName(state.current)}`;
      ui.statusDetail.textContent = `${state.board.filter(Boolean).length ? 'Escolha uma casa vazia para continuar.' : `Jogador ${playerName(state.current)} começa esta rodada.`}`;
      ui.statusMark.textContent = state.current === 'x' ? '×' : '○';
      ui.turnCard.dataset.player = state.current;
      ui.turnSymbol.textContent = state.current === 'x' ? '×' : '○';
      ui.turnLabel.textContent = `Jogador ${playerName(state.current)}`;
    }
    ui.undo.disabled = state.undoStack.length === 0;
    ui.newRound.textContent = state.outcome ? '＋ Próxima rodada' : '＋ Nova rodada';
    const completedRounds = state.scores.x + state.scores.o + state.scores.draws;
    ui.roundLabel.textContent = `Rodada ${Math.max(1,completedRounds + (state.outcome ? 0 : 1))} · ${playerName(state.starter)} começa`;
  }
  function render() {
    renderBoard();
    renderPlayers();
    renderStatus();
    renderHistory();
  }
  function startRound(starter) {
    state.board = Array(9).fill(null);
    state.starter = starter;
    state.current = starter;
    state.outcome = null;
    state.winningCells = [];
    state.history = [];
    state.undoStack = [];
    state.focusSquare = 4;
    render();
    cells[state.focusSquare].focus({ preventScroll:true });
  }
  function startLocalGame() {
    state.started = true;
    lobby.hidden = true;
    gameView.hidden = false;
    startRound('x');
    if (window.CV_GAMES_STATS?.recordPlay) window.CV_GAMES_STATS.recordPlay(gameId);
  }
  function playCell(index) {
    if (!state.started || state.outcome || state.board[index]) return;
    recordSnapshot();
    const player = state.current;
    state.board[index] = player;
    state.history.push({ player, square:index });
    state.focusSquare = index;
    const line = getWinningLine();
    if (line) {
      state.outcome = { type:'win', winner:player };
      state.winningCells = line;
      state.scores[player] += 1;
      saveScores();
    } else if (state.board.every(Boolean)) {
      state.outcome = { type:'draw' };
      state.scores.draws += 1;
      saveScores();
    } else state.current = player === 'x' ? 'o' : 'x';
    render();
    cells[index].focus({ preventScroll:true });
  }
  async function newRound() {
    if (state.history.length && !state.outcome && !await window.CV_GAMES_DIALOG.confirm({
      title:'Começar outra rodada?', message:'A rodada atual será encerrada sem alterar o placar.',
      confirmText:'Começar rodada', cancelText:'Continuar jogando'
    })) return;
    startRound(state.starter === 'x' ? 'o' : 'x');
  }
  function undoMove() {
    const snapshot = state.undoStack.pop();
    if (!snapshot) return;
    if (state.outcome?.type === 'win') state.scores[state.outcome.winner] = Math.max(0,state.scores[state.outcome.winner] - 1);
    if (state.outcome?.type === 'draw') state.scores.draws = Math.max(0,state.scores.draws - 1);
    state.board = snapshot.board;
    state.current = snapshot.current;
    state.outcome = snapshot.outcome;
    state.winningCells = snapshot.winningCells;
    state.history = snapshot.history;
    state.focusSquare = snapshot.focusSquare;
    saveScores();
    render();
    cells[state.focusSquare].focus({ preventScroll:true });
  }
  async function resetScores() {
    if (!await window.CV_GAMES_DIALOG.confirm({
      title:'Zerar o placar?', message:'Os pontos de X, O e os empates serão apagados deste dispositivo.',
      confirmText:'Zerar placar', cancelText:'Manter placar', tone:'danger'
    })) return;
    state.scores = { x:0, o:0, draws:0 };
    saveScores();
    renderPlayers();
    renderStatus();
  }
  function readFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem('cv-games-favorites') || '[]');
      return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []);
    } catch { return new Set(); }
  }
  function updateFavorite() {
    if (!ui.favorite) return;
    const active = readFavorites().has(gameId);
    const icon = ui.favorite.querySelector('.favorite-icon');
    const label = ui.favorite.querySelector('[data-favorite-label]');
    ui.favorite.setAttribute('aria-pressed',String(active));
    ui.favorite.setAttribute('aria-label',`${active ? 'Remover' : 'Adicionar'} CV JOGO DA VELHA ${active ? 'dos' : 'aos'} favoritos`);
    ui.favorite.title = active ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    if (icon) icon.textContent = active ? '♥' : '♡';
    if (label) label.textContent = active ? 'Favoritado' : 'Favoritar';
  }
  function toggleFavorite() {
    const favorites = readFavorites();
    if (favorites.has(gameId)) favorites.delete(gameId); else favorites.add(gameId);
    try { localStorage.setItem('cv-games-favorites',JSON.stringify([...favorites])); window.dispatchEvent(new Event('cv-games-favorites-change')); } catch { /* Favoritos são opcionais. */ }
    updateFavorite();
  }
  function prepareMenu() {
    const menuButton = $('[data-menu-toggle]');
    const menu = $('[data-primary-nav]');
    if (!menuButton || !menu) return;
    menuButton.addEventListener('click',() => {
      const open = menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded',String(open));
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click',() => {
      menu.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded','false');
    }));
  }

  boardElement.addEventListener('click',(event) => {
    const button = event.target.closest('[data-cell]');
    if (button) playCell(Number(button.dataset.cell));
  });
  boardElement.addEventListener('keydown',(event) => {
    const button = event.target.closest('[data-cell]');
    if (!button || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const index = Number(button.dataset.cell);
    let row = Math.floor(index / 3);
    let col = index % 3;
    const [dr,dc] = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] }[event.key];
    row += dr; col += dc;
    if (row >= 0 && row < 3 && col >= 0 && col < 3) {
      state.focusSquare = row * 3 + col;
      cells.forEach((cell,cellIndex) => { cell.tabIndex = cellIndex === state.focusSquare ? 0 : -1; });
      cells[state.focusSquare].focus();
    }
  });
  ui.start.addEventListener('click',startLocalGame);
  ui.undo.addEventListener('click',undoMove);
  ui.resetScores.addEventListener('click',resetScores);
  ui.newRound.addEventListener('click',newRound);
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
    try { localStorage.setItem('cv-games-theme',nextTheme); } catch { /* O tema continua aplicado nesta página. */ }
    syncThemeButton();
  });
  document.addEventListener('keydown',(event) => {
    if (event.key.toLowerCase() === 'u' && state.started && !event.repeat && !event.ctrlKey && !event.metaKey) undoMove();
  });

  prepareMenu();
  createBoard();
  updateFavorite();
  syncThemeButton();
})();
