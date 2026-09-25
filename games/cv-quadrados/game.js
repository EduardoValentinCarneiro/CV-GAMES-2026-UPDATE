(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = (selector) => document.querySelector(selector);
  const boardElement = $('[data-board]');
  const lobby = $('[data-lobby]');
  const gameView = $('[data-game-view]');
  const gameId = 'cv-quadrados';
  const boardSize = 600;
  const margin = 36;
  const step = (boardSize - margin * 2) / 5;
  const colors = {
    a:{ name:'Azul', symbol:'A' },
    b:{ name:'Coral', symbol:'B' }
  };
  const ui = {
    start:$('[data-start-local]'), turnCard:$('[data-live-turn]'), turnLabel:$('[data-turn-label]'),
    statusCard:$('[data-status-card]'), statusMark:$('[data-status-mark]'), status:$('[data-game-status]'), statusDetail:$('[data-status-detail]'),
    undo:$('[data-undo]'), newGame:$('[data-new-game]'), aScore:$('[data-a-score]'), bScore:$('[data-b-score]'),
    aState:$('[data-a-state]'), bState:$('[data-b-state]'), boxesCount:$('[data-boxes-count]'), bonusNote:$('[data-bonus-note]'),
    progress:$('[data-progress]'), progressLabel:$('[data-progress-label]'), progressFill:$('[data-progress-fill]'),
    moveCount:$('[data-move-count]'), moveList:$('[data-move-list]'), favorite:$('[data-game-favorite]')
  };
  const state = {
    started:false, current:'a', outcome:null, edgeOwners:new Map(), boxes:Array(25).fill(null),
    scores:{ a:0, b:0 }, history:[], undoStack:[], focusEdge:null, lastBoxCount:0
  };
  const edges = [];
  const edgeMap = new Map();
  const boxes = [];

  function svgElement(tag,attributes = {}) {
    const element = document.createElementNS(SVG_NS,tag);
    for (const [name,value] of Object.entries(attributes)) element.setAttribute(name,String(value));
    return element;
  }
  function point(row,col) { return { x:margin + col * step, y:margin + row * step }; }
  function addEdge(orientation,row,col) {
    const horizontal = orientation === 'h';
    const start = point(row,col);
    const end = horizontal ? point(row,col + 1) : point(row + 1,col);
    const edge = {
      key:`${orientation}-${row}-${col}`, orientation, row, col,
      x:(start.x + end.x) / 2, y:(start.y + end.y) / 2,
      start, end, group:null, visible:null, preview:null, hit:null
    };
    const group = svgElement('g',{ class:'edge-interaction', 'data-edge-key':edge.key, role:'button', tabindex:'-1', 'aria-disabled':'false' });
    const visible = svgElement('line',{ class:'dots-edge-visible', x1:start.x,y1:start.y,x2:end.x,y2:end.y });
    const preview = svgElement('line',{ class:'dots-edge-preview', x1:start.x,y1:start.y,x2:end.x,y2:end.y });
    const hit = svgElement('line',{ class:'dots-edge-hit', x1:start.x,y1:start.y,x2:end.x,y2:end.y,stroke:'transparent','stroke-width':'38','pointer-events':'stroke' });
    group.append(visible,preview,hit);
    edge.group = group; edge.visible = visible; edge.preview = preview; edge.hit = hit;
    edges.push(edge); edgeMap.set(edge.key,edge);
    return edge;
  }
  function createBoard() {
    boardElement.setAttribute('viewBox',`0 0 ${boardSize} ${boardSize}`);
    const boxLayer = svgElement('g',{ 'aria-hidden':'true' });
    const edgeLayer = svgElement('g',{ 'aria-label':'Linhas disponíveis' });
    const dotLayer = svgElement('g',{ 'aria-hidden':'true' });
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const topLeft = point(row,col);
        const rect = svgElement('rect',{ class:'dots-box-fill', x:topLeft.x,y:topLeft.y,width:step,height:step,rx:8 });
        const label = svgElement('text',{ class:'dots-box-label',x:topLeft.x + step / 2,y:topLeft.y + step / 2,'aria-hidden':'true' });
        boxLayer.append(rect,label);
        boxes.push({ row,col,rect,label });
      }
    }
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 5; col += 1) addEdge('h',row,col);
    }
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 6; col += 1) addEdge('v',row,col);
    }
    for (const edge of edges) edgeLayer.append(edge.group);
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const location = point(row,col);
        const dot = svgElement('circle',{ class:'dots-node',cx:location.x,cy:location.y,r:8.5 });
        dotLayer.append(dot);
      }
    }
    boardElement.replaceChildren(boxLayer,edgeLayer,dotLayer);
    state.focusEdge = edges[0]?.key || null;
    render();
  }
  function boxEdgeKeys(row,col) {
    return [`h-${row}-${col}`,`h-${row + 1}-${col}`,`v-${row}-${col}`,`v-${row}-${col + 1}`];
  }
  function adjacentBoxes(edge) {
    if (edge.orientation === 'h') {
      const adjacent = [];
      if (edge.row > 0) adjacent.push((edge.row - 1) * 5 + edge.col);
      if (edge.row < 5) adjacent.push(edge.row * 5 + edge.col);
      return adjacent;
    }
    const adjacent = [];
    if (edge.col > 0) adjacent.push(edge.row * 5 + edge.col - 1);
    if (edge.col < 5) adjacent.push(edge.row * 5 + edge.col);
    return adjacent;
  }
  function edgeDescription(edge) {
    return edge.orientation === 'h'
      ? `horizontal, linha ${edge.row + 1}, pontos ${edge.col + 1}–${edge.col + 2}`
      : `vertical, coluna ${edge.col + 1}, pontos ${edge.row + 1}–${edge.row + 2}`;
  }
  function nearestOpenEdge(preferredKey) {
    const available = edges.filter((edge) => !state.edgeOwners.has(edge.key));
    if (!available.length) return null;
    const preferred = edgeMap.get(preferredKey);
    if (!preferred) return available[0];
    return available.reduce((best,edge) => {
      const score = (edge.x - preferred.x) ** 2 + (edge.y - preferred.y) ** 2;
      const bestScore = (best.x - preferred.x) ** 2 + (best.y - preferred.y) ** 2;
      return score < bestScore ? edge : best;
    },available[0]);
  }
  function renderBoard() {
    if (state.focusEdge && state.edgeOwners.has(state.focusEdge)) state.focusEdge = nearestOpenEdge(state.focusEdge)?.key || null;
    for (const edge of edges) {
      const owner = state.edgeOwners.get(edge.key);
      const open = !owner;
      edge.group.classList.toggle('is-drawn',!open);
      edge.group.classList.toggle('owner-a',owner === 'a');
      edge.group.classList.toggle('owner-b',owner === 'b');
      edge.group.classList.toggle('turn-a',open && state.started && !state.outcome && state.current === 'a');
      edge.group.classList.toggle('turn-b',open && state.started && !state.outcome && state.current === 'b');
      edge.visible.classList.toggle('owner-a',owner === 'a');
      edge.visible.classList.toggle('owner-b',owner === 'b');
      edge.group.setAttribute('aria-label',open ? `Traçar linha ${edgeDescription(edge)}` : `Linha ${edgeDescription(edge)}, feita pelo jogador ${colors[owner].name}`);
      edge.group.setAttribute('aria-disabled',String(!open || !state.started || Boolean(state.outcome)));
      edge.group.setAttribute('aria-pressed',String(!open));
      edge.group.setAttribute('tabindex',open && state.started && !state.outcome && edge.key === state.focusEdge ? '0' : '-1');
      edge.hit.setAttribute('pointer-events',open && state.started && !state.outcome ? 'stroke' : 'none');
    }
    for (let index = 0; index < boxes.length; index += 1) {
      const owner = state.boxes[index];
      boxes[index].rect.classList.toggle('owner-a',owner === 'a');
      boxes[index].rect.classList.toggle('owner-b',owner === 'b');
      boxes[index].label.classList.toggle('owner-a',owner === 'a');
      boxes[index].label.classList.toggle('owner-b',owner === 'b');
      boxes[index].label.textContent = owner ? colors[owner].symbol : '';
    }
  }
  function renderPlayers() {
    for (const player of ['a','b']) {
      const card = $(`[data-player-card="${player}"]`);
      card.classList.toggle('is-active',state.started && !state.outcome && state.current === player);
      const label = player === 'a' ? ui.aState : ui.bState;
      label.textContent = !state.started ? 'Aguardando a partida' : state.outcome ? state.outcome.type === 'win' && state.outcome.winner === player ? 'Venceu a partida' : 'Partida encerrada' : state.current === player ? 'Sua vez de jogar' : 'Esperando a vez';
    }
    ui.aScore.textContent = String(state.scores.a);
    ui.bScore.textContent = String(state.scores.b);
    const completed = state.scores.a + state.scores.b;
    ui.boxesCount.innerHTML = `${completed}<span>/25</span>`;
    ui.progressLabel.textContent = `${completed} de 25`;
    ui.progress.setAttribute('aria-valuenow',String(completed));
    ui.progressFill.style.width = `${completed / 25 * 100}%`;
  }
  function renderHistory() {
    ui.moveCount.textContent = `${state.history.length} ${state.history.length === 1 ? 'linha' : 'linhas'}`;
    if (!state.history.length) {
      const empty = document.createElement('li');
      empty.className = 'squares-empty-history';
      empty.textContent = 'As linhas traçadas aparecem aqui.';
      ui.moveList.replaceChildren(empty);
      return;
    }
    const items = state.history.map((move,index) => {
      const item = document.createElement('li');
      if (index === state.history.length - 1) item.classList.add('is-latest');
      const number = document.createElement('span'); number.className = 'squares-move-number'; number.textContent = `${index + 1}.`;
      const player = document.createElement('strong'); player.className = 'squares-move-player'; player.dataset.player = move.player; player.textContent = colors[move.player].name;
      const description = document.createElement('span'); description.textContent = move.boxCount ? `+${move.boxCount} ${move.boxCount === 1 ? 'quadrado' : 'quadrados'}` : edgeMap.get(move.key) ? edgeDescription(edgeMap.get(move.key)) : 'linha';
      description.className = move.boxCount ? 'squares-move-reward' : '';
      item.append(number,player,description);
      return item;
    });
    ui.moveList.replaceChildren(...items);
    ui.moveList.scrollTop = ui.moveList.scrollHeight;
  }
  function renderStatus() {
    ui.statusCard.removeAttribute('data-result');
    if (!state.started) {
      ui.status.textContent = 'Pronto para jogar';
      ui.statusDetail.textContent = 'Escolha uma linha entre dois pontos vizinhos.';
      ui.statusMark.textContent = '●';
      ui.turnCard.dataset.player = 'a';
      ui.turnLabel.textContent = 'Jogador Azul';
    } else if (state.outcome?.type === 'win') {
      const winner = state.outcome.winner;
      ui.statusCard.dataset.result = winner;
      ui.status.textContent = `Jogador ${colors[winner].name} venceu!`;
      ui.statusDetail.textContent = `${state.scores[winner]} quadrados conquistados. Comece outra partida para jogar novamente.`;
      ui.statusMark.textContent = '★';
      ui.turnCard.dataset.player = 'finished';
      ui.turnLabel.textContent = `Vitória do ${colors[winner].name}`;
    } else if (state.outcome?.type === 'draw') {
      ui.statusCard.dataset.result = 'draw';
      ui.status.textContent = 'Partida empatada';
      ui.statusDetail.textContent = 'Os dois jogadores conquistaram a mesma quantidade de quadrados.';
      ui.statusMark.textContent = '½';
      ui.turnCard.dataset.player = 'finished';
      ui.turnLabel.textContent = 'Empate';
    } else {
      ui.status.textContent = `Vez do jogador ${colors[state.current].name}`;
      ui.statusDetail.textContent = state.lastBoxCount
        ? `Fechou ${state.lastBoxCount} ${state.lastBoxCount === 1 ? 'quadrado' : 'quadrados'}! Você joga novamente.`
        : 'Trace uma linha entre dois pontos vizinhos.';
      ui.statusMark.textContent = '●';
      ui.turnCard.dataset.player = state.current;
      ui.turnLabel.textContent = `Jogador ${colors[state.current].name}`;
    }
    ui.bonusNote.hidden = !(state.lastBoxCount && !state.outcome);
    ui.bonusNote.textContent = state.lastBoxCount === 1 ? 'Fechou um quadrado! Jogue novamente.' : `Fechou ${state.lastBoxCount} quadrados! Jogue novamente.`;
    ui.undo.disabled = state.undoStack.length === 0;
  }
  function render() {
    renderBoard();
    renderPlayers();
    renderStatus();
    renderHistory();
  }
  function recordSnapshot() {
    state.undoStack.push({
      edgeOwners:new Map(state.edgeOwners), boxes:[...state.boxes], current:state.current,
      outcome:state.outcome ? { ...state.outcome } : null, scores:{ ...state.scores },
      history:state.history.map((move) => ({ ...move })), focusEdge:state.focusEdge, lastBoxCount:state.lastBoxCount
    });
  }
  function applyEdge(key) {
    const edge = edgeMap.get(key);
    if (!edge || !state.started || state.outcome || state.edgeOwners.has(key)) return;
    recordSnapshot();
    const player = state.current;
    state.edgeOwners.set(key,player);
    const completed = [];
    for (const boxIndex of adjacentBoxes(edge)) {
      if (state.boxes[boxIndex] !== null) continue;
      const box = boxes[boxIndex];
      if (boxEdgeKeys(box.row,box.col).every((edgeKey) => state.edgeOwners.has(edgeKey))) {
        state.boxes[boxIndex] = player;
        completed.push(boxIndex);
        state.scores[player] += 1;
      }
    }
    state.lastBoxCount = completed.length;
    state.history.push({ player,key,boxCount:completed.length });
    state.focusEdge = key;
    if (state.edgeOwners.size === edges.length) {
      if (state.scores.a === state.scores.b) state.outcome = { type:'draw' };
      else state.outcome = { type:'win', winner:state.scores.a > state.scores.b ? 'a' : 'b' };
    } else if (!completed.length) state.current = player === 'a' ? 'b' : 'a';
    state.focusEdge = nearestOpenEdge(key)?.key || null;
    render();
    if (state.focusEdge) edgeMap.get(state.focusEdge).group.focus({ preventScroll:true });
  }
  function startMatch() {
    state.started = true;
    state.current = 'a';
    state.outcome = null;
    state.edgeOwners = new Map();
    state.boxes = Array(25).fill(null);
    state.scores = { a:0,b:0 };
    state.history = [];
    state.undoStack = [];
    state.lastBoxCount = 0;
    state.focusEdge = edges[0]?.key || null;
    lobby.hidden = true;
    gameView.hidden = false;
    if (window.CV_GAMES_STATS?.recordPlay) window.CV_GAMES_STATS.recordPlay(gameId);
    render();
    if (state.focusEdge) edgeMap.get(state.focusEdge).group.focus({ preventScroll:true });
  }
  async function newGame() {
    if (state.history.length && !await window.CV_GAMES_DIALOG.confirm({
      title:'Começar uma nova partida?',
      message:'O tabuleiro e o placar desta partida serão zerados.',
      confirmText:'Nova partida', cancelText:'Continuar jogando'
    })) return;
    startMatch();
  }
  function undoMove() {
    const snapshot = state.undoStack.pop();
    if (!snapshot) return;
    state.edgeOwners = snapshot.edgeOwners;
    state.boxes = snapshot.boxes;
    state.current = snapshot.current;
    state.outcome = snapshot.outcome;
    state.scores = snapshot.scores;
    state.history = snapshot.history;
    state.focusEdge = snapshot.focusEdge;
    state.lastBoxCount = snapshot.lastBoxCount;
    render();
    if (state.focusEdge) edgeMap.get(state.focusEdge)?.group.focus({ preventScroll:true });
  }
  function focusNextEdge(currentKey,dx,dy) {
    const current = edgeMap.get(currentKey);
    if (!current) return;
    const candidates = edges.filter((edge) => !state.edgeOwners.has(edge.key) && edge.key !== currentKey);
    const directional = candidates.filter((edge) => (edge.x - current.x) * dx + (edge.y - current.y) * dy > 0);
    const pool = directional.length ? directional : candidates;
    const next = pool.reduce((best,edge) => {
      const vx = edge.x - current.x;
      const vy = edge.y - current.y;
      const score = (vx * vx + vy * vy) + Math.abs(vx * dy - vy * dx) * step;
      const bestX = best.x - current.x;
      const bestY = best.y - current.y;
      const bestScore = (bestX * bestX + bestY * bestY) + Math.abs(bestX * dy - bestY * dx) * step;
      return score < bestScore ? edge : best;
    },pool[0]);
    if (!next) return;
    state.focusEdge = next.key;
    renderBoard();
    next.group.focus();
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
    ui.favorite.setAttribute('aria-label',`${active ? 'Remover' : 'Adicionar'} CV QUADRADOS ${active ? 'dos' : 'aos'} favoritos`);
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
    const target = event.target.closest('[data-edge-key]');
    if (target) applyEdge(target.dataset.edgeKey);
  });
  boardElement.addEventListener('keydown',(event) => {
    const target = event.target.closest('[data-edge-key]');
    if (!target) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      applyEdge(target.dataset.edgeKey);
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const vectors = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] };
      const [dx,dy] = vectors[event.key];
      focusNextEdge(target.dataset.edgeKey,dx,dy);
    }
  });
  ui.start.addEventListener('click',startMatch);
  ui.undo.addEventListener('click',undoMove);
  ui.newGame.addEventListener('click',newGame);
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
