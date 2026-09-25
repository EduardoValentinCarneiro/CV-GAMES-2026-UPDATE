(function () {
  'use strict';

  const gameId = 'cv-starfall';
  const bestKey = 'cv-games-cv-starfall-best';
  const favoritesKey = 'cv-games-favorites';
  const canvas = document.querySelector('[data-game-canvas]');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    stage: $('[data-stage]'), overlay: $('[data-main-overlay]'), title: $('[data-overlay-title]'), copy: $('[data-overlay-copy]'), start: $('[data-start]'),
    wave: $('[data-wave]'), score: $('[data-score]'), lives: $('[data-lives]'), best: $('[data-best]'), overlayBest: $('[data-overlay-best]'),
    upgrade: $('[data-upgrade]'), upgradeOptions: $('[data-upgrade-options]'), pause: $('[data-pause]'), sound: $('[data-sound]'), status: $('[data-status]'), toast: $('[data-toast]'), favorite: $('[data-game-favorite]')
  };
  const state = {
    mode: 'intro', lastTime: 0, raf: 0, width: 800, height: 560, dpr: 1,
    score: 0, best: readBest(), wave: 1, lives: 3, shields: 0, invulnerable: 0,
    shotCooldown: 0, waveGrace: 0, enemySpawn: 0, powerSpawn: 0, waveKills: 0,
    enemiesRequired: 6, bossWave: false, bossSpawned: false, soundOn: true, audio: null,
    keys: new Set(), bullets: [], enemyBullets: [], enemies: [], particles: [], pickups: [], stars: [],
    player: { x: 400, y: 460, radius: 13, speed: 260, damage: 1, fireRate: .34, spread: 1, angle: -Math.PI / 2, color: '#7df7e8' },
    pointer: { active: false, x: 0, y: 0 }, touch: { up: false, down: false, left: false, right: false }
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const random = (min, max) => min + Math.random() * (max - min);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const upgradeList = [
    { id: 'damage', icon: '✹', name: 'Canhão pesado', description: 'Seus disparos causam mais dano.', apply: () => { state.player.damage += 1; } },
    { id: 'speed', icon: '➤', name: 'Propulsores', description: 'Sua nave se move 14% mais rápido.', apply: () => { state.player.speed *= 1.14; } },
    { id: 'rapid', icon: '⚡', name: 'Disparo rápido', description: 'Dispare com maior frequência.', apply: () => { state.player.fireRate = Math.max(.11, state.player.fireRate * .78); } },
    { id: 'spread', icon: '✦', name: 'Canhões laterais', description: 'Dispare projéteis em leque.', apply: () => { state.player.spread = Math.min(5, state.player.spread + 1); } },
    { id: 'repair', icon: '♥', name: 'Reparo de casco', description: 'Recupere uma vida da nave.', apply: () => { state.lives = Math.min(5, state.lives + 1); } },
    { id: 'shield', icon: '⬡', name: 'Escudo de energia', description: 'Ganhe um escudo que bloqueia um impacto.', apply: () => { state.shields = Math.min(4, state.shields + 1); } }
  ];

  function readBest() { try { return Math.max(0, Number(localStorage.getItem(bestKey)) || 0); } catch { return 0; } }
  function saveBest() { try { localStorage.setItem(bestKey, String(state.best)); } catch { /* Recorde mantido nesta sessão. */ } }
  function setMode(mode) {
    state.mode = mode;
    document.body.dataset.cvStarfallState = mode;
    ui.overlay.hidden = !['intro', 'gameover', 'paused'].includes(mode);
    ui.upgrade.hidden = mode !== 'upgrade';
    ui.pause.disabled = !['playing'].includes(mode) && mode !== 'paused';
    ui.pause.textContent = mode === 'paused' ? '▶ RETOMAR' : 'Ⅱ PAUSAR';
  }
  function updateHud() {
    ui.wave.textContent = String(state.wave);
    ui.score.textContent = String(state.score);
    ui.best.textContent = String(state.best);
    ui.overlayBest.textContent = String(state.best);
    ui.lives.textContent = `${'♥'.repeat(Math.max(0, state.lives))}${'♡'.repeat(Math.max(0, 5 - state.lives))}${state.shields ? ` ⬡${state.shields}` : ''}`;
  }
  function makeStars() {
    state.stars = Array.from({ length: 100 }, () => ({ x: Math.random() * state.width, y: Math.random() * state.height, z: random(.25, 1), phase: random(0, 7) }));
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * state.dpr);
    canvas.height = Math.round(rect.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.width = rect.width;
    state.height = rect.height;
    state.player.x = clamp(state.player.x, 22, state.width - 22);
    state.player.y = clamp(state.player.y, 22, state.height - 22);
    makeStars();
    if (state.mode !== 'playing') draw(performance.now());
  }
  function tone(freq, duration = .08, type = 'sine', volume = .035) {
    if (!state.soundOn) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      state.audio ||= new AudioContextClass();
      if (state.audio.state === 'suspended') state.audio.resume();
      const osc = state.audio.createOscillator();
      const gain = state.audio.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, state.audio.currentTime + duration);
      osc.connect(gain); gain.connect(state.audio.destination); osc.start(); osc.stop(state.audio.currentTime + duration);
    } catch { /* Som não é necessário para jogar. */ }
  }
  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.remove('is-visible');
    void ui.toast.offsetWidth;
    ui.toast.classList.add('is-visible');
  }
  function resetGame() {
    state.score = 0; state.wave = 1; state.lives = 3; state.shields = 0; state.invulnerable = 1.4;
    state.shotCooldown = 0; state.waveGrace = 1.05; state.enemySpawn = .48; state.powerSpawn = 8; state.waveKills = 0;
    state.enemiesRequired = 8; state.bossWave = false; state.bossSpawned = false;
    state.bullets = []; state.enemyBullets = []; state.enemies = []; state.particles = []; state.pickups = [];
    state.player = { x: state.width / 2, y: state.height * .78, radius: 13, speed: 260, damage: 1, fireRate: .34, spread: 1, angle: -Math.PI / 2, color: '#7df7e8' };
    state.keys.clear(); state.touch = { up: false, down: false, left: false, right: false };
    updateHud();
  }
  function startGame() {
    cancelAnimationFrame(state.raf);
    resetGame();
    setMode('playing');
    ui.status.textContent = 'Missão iniciada. Sobreviva à primeira onda!';
    if (window.CV_GAMES_STATS?.recordPlay) window.CV_GAMES_STATS.recordPlay(gameId);
    state.lastTime = performance.now();
    state.raf = requestAnimationFrame(frame);
  }
  function pauseGame() {
    if (state.mode === 'playing') {
      setMode('paused'); ui.title.textContent = 'Missão pausada'; ui.copy.textContent = 'Respire fundo. Sua nave está segura por enquanto.';
      ui.start.textContent = '▶ RETOMAR MISSÃO'; ui.status.textContent = 'Jogo pausado.';
      cancelAnimationFrame(state.raf);
    } else if (state.mode === 'paused') {
      setMode('playing'); ui.status.textContent = 'Missão retomada.'; state.lastTime = performance.now(); state.raf = requestAnimationFrame(frame);
    }
  }
  function finishGame() {
    setMode('gameover');
    const newRecord = state.score > state.best;
    if (newRecord) { state.best = state.score; saveBest(); }
    updateHud();
    ui.title.textContent = newRecord ? 'NOVO RECORDE!' : 'A missão acabou.';
    ui.copy.textContent = `Você chegou à onda ${state.wave} e marcou ${state.score} pontos. ${newRecord ? 'Sua melhor marca já está salva!' : `Seu recorde é ${state.best}.`}`;
    ui.start.textContent = '↻ TENTAR DE NOVO';
    ui.status.textContent = 'Nave perdida. Uma nova missão pode começar quando quiser.';
    tone(newRecord ? 520 : 170, .3, newRecord ? 'triangle' : 'sawtooth', .05);
  }
  function openUpgrade() {
    setMode('upgrade');
    state.wave += 1;
    updateHud();
    ui.status.textContent = 'Escolha uma melhoria antes da próxima onda.';
    const choices = [...upgradeList].sort(() => Math.random() - .5).slice(0, 3);
    ui.upgradeOptions.replaceChildren();
    for (const upgrade of choices) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'starfall-upgrade-card';
      button.innerHTML = `<span class="starfall-upgrade-icon" aria-hidden="true">${upgrade.icon}</span><strong>${upgrade.name}</strong><span>${upgrade.description}</span>`;
      button.addEventListener('click', () => {
        upgrade.apply();
        if (upgrade.id === 'repair') state.invulnerable = .7;
        updateHud();
        toast(`${upgrade.icon} ${upgrade.name.toUpperCase()}`);
        beginNextWave();
        setMode('playing'); ui.status.textContent = `Onda ${state.wave}. Boa sorte, piloto.`;
        state.lastTime = performance.now(); state.raf = requestAnimationFrame(frame);
      });
      ui.upgradeOptions.append(button);
    }
    tone(640, .2, 'triangle', .04);
  }
  function beginNextWave() {
    state.enemiesRequired = 7 + state.wave * 2;
    state.waveKills = 0; state.bossWave = state.wave % 5 === 0; state.bossSpawned = false;
    state.enemySpawn = .58; state.waveGrace = 1.05; state.powerSpawn = 7;
    ui.status.textContent = state.bossWave ? `Onda ${state.wave}: sinal de guardião detectado!` : `Onda ${state.wave}: novos inimigos se aproximam.`;
    if (state.bossWave) toast(`GUARDIÃO NA ONDA ${state.wave}`);
  }
  function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    const pad = 22;
    const pos = edge === 0 ? { x: random(pad, state.width - pad), y: -18 }
      : edge === 1 ? { x: state.width + 18, y: random(pad, state.height - pad) }
        : edge === 2 ? { x: random(pad, state.width - pad), y: state.height + 18 }
          : { x: -18, y: random(pad, state.height - pad) };
    const roll = Math.random();
    let kind = 'meteor';
    if (state.wave >= 2 && roll > .43) kind = 'drone';
    if (state.wave >= 3 && roll > .75) kind = 'hunter';
    if (state.wave >= 6 && roll > .91) kind = 'brute';
    const multiplier = 1 + (state.wave - 1) * .13;
    const config = {
      meteor: { r: random(12, 20), hp: 1 + Math.floor(state.wave / 9), speed: random(54, 82) * multiplier, score: 70, color: '#f6a26f' },
      drone: { r: 14, hp: 2 + Math.floor(state.wave / 4), speed: random(72, 98) * multiplier, score: 120, color: '#ff5fa4', shoot: random(1.3, 2.2) },
      hunter: { r: 12, hp: 2 + Math.floor(state.wave / 3), speed: random(112, 148) * multiplier, score: 160, color: '#b68aff' },
      brute: { r: 23, hp: 6 + Math.floor(state.wave / 2), speed: 44 * multiplier, score: 240, color: '#ffcf69', shoot: 1.9 }
    }[kind];
    state.enemies.push({ ...pos, ...config, kind, maxHp: config.hp, cooldown: config.shoot || 0, spin: random(-2, 2), angle: random(0, 7) });
  }
  function spawnBoss() {
    if (state.bossSpawned) return;
    state.bossSpawned = true;
    const hp = 38 + state.wave * 7;
    state.enemies.push({ x: state.width / 2, y: -48, r: 38, hp, maxHp: hp, speed: 64 + state.wave * 2.5, score: 1500 + state.wave * 120, color: '#ff547d', kind: 'boss', cooldown: .9, angle: 0, spin: .35 });
    toast('GUARDIÃO DETECTADO');
    tone(90, .7, 'sawtooth', .045);
  }
  function spawnPickup(x, y, kind = Math.random() > .5 ? 'repair' : 'shield') {
    state.pickups.push({ x, y, kind, r: 11, life: 9, spin: 0 });
  }
  function burst(x, y, color, count = 12, power = 100) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = random(power * .25, power);
      state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.22, .62), maxLife: .62, r: random(1.5, 3.5), color });
    }
  }
  function fire() {
    const n = state.player.spread;
    for (let i = 0; i < n; i++) {
      const offset = i - (n - 1) / 2;
      const angle = -Math.PI / 2 + offset * .17;
      state.bullets.push({ x: state.player.x + Math.sin(angle) * 13, y: state.player.y - 10, vx: Math.sin(angle) * 40, vy: Math.cos(angle) * -510, r: 3.5, damage: state.player.damage, color: '#8affee' });
    }
    tone(420, .035, 'square', .012);
  }
  function nearestEnemy() {
    let best = null; let bestDistance = Infinity;
    for (const enemy of state.enemies) { const d = distance(state.player, enemy); if (d < bestDistance) { best = enemy; bestDistance = d; } }
    return best;
  }
  function enemyFire(enemy) {
    const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const count = enemy.kind === 'boss' ? 5 : enemy.kind === 'brute' ? 3 : 1;
    const speed = enemy.kind === 'boss' ? 225 + state.wave * 4 : 180 + state.wave * 4;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * .19;
      state.enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.r * .5, vx: Math.cos(angle + offset) * speed, vy: Math.sin(angle + offset) * speed, r: enemy.kind === 'boss' ? 6 : 5, color: enemy.color });
    }
    tone(150, .06, 'sawtooth', .012);
  }
  function damagePlayer() {
    if (state.invulnerable > 0) return;
    if (state.shields > 0) { state.shields -= 1; state.invulnerable = .8; toast('ESCUDO ABSORVEU O IMPACTO'); tone(680, .18, 'triangle', .04); updateHud(); return; }
    state.lives -= 1; state.invulnerable = 1.35; burst(state.player.x, state.player.y, '#ff6687', 22, 160); tone(120, .23, 'sawtooth', .05); updateHud();
    if (state.lives <= 0) finishGame();
  }
  function update(dt) {
    state.invulnerable = Math.max(0, state.invulnerable - dt);
    state.waveGrace = Math.max(0, state.waveGrace - dt);
    state.shotCooldown -= dt;
    state.powerSpawn -= dt;
    let dx = 0; let dy = 0;
    if (state.keys.has('ArrowLeft') || state.keys.has('KeyA') || state.touch.left) dx -= 1;
    if (state.keys.has('ArrowRight') || state.keys.has('KeyD') || state.touch.right) dx += 1;
    if (state.keys.has('ArrowUp') || state.keys.has('KeyW') || state.touch.up) dy -= 1;
    if (state.keys.has('ArrowDown') || state.keys.has('KeyS') || state.touch.down) dy += 1;
    if (state.pointer.active) { const d = Math.hypot(state.pointer.x - state.player.x, state.pointer.y - state.player.y); if (d > 8) { dx = (state.pointer.x - state.player.x) / d; dy = (state.pointer.y - state.player.y) / d; } }
    if (dx !== 0 || dy !== 0) {
      // Quantiza a direção do movimento em oito ângulos de 45 graus.
      const eighthTurn = Math.PI / 4;
      state.player.angle = Math.round(Math.atan2(dy, dx) / eighthTurn) * eighthTurn;
    }
    const norm = Math.hypot(dx, dy) || 1;
    state.player.x = clamp(state.player.x + (dx / norm) * state.player.speed * dt, 17, state.width - 17);
    state.player.y = clamp(state.player.y + (dy / norm) * state.player.speed * dt, 17, state.height - 17);
    if (state.shotCooldown <= 0 && state.enemies.length) {
      const target = nearestEnemy();
      if (target) {
        const angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
        const count = state.player.spread;
        for (let i = 0; i < count; i++) {
          const spreadAngle = angle + (i - (count - 1) / 2) * .17;
          state.bullets.push({ x: state.player.x + Math.cos(spreadAngle) * 13, y: state.player.y + Math.sin(spreadAngle) * 13, vx: Math.cos(spreadAngle) * 500, vy: Math.sin(spreadAngle) * 500, r: 3.5, damage: state.player.damage, color: '#8affee' });
        }
        state.shotCooldown = state.player.fireRate;
        tone(420, .035, 'square', .01);
      }
    }
    if (!state.bossWave && state.waveKills < state.enemiesRequired && state.waveGrace <= 0) {
      state.enemySpawn -= dt;
      if (state.enemySpawn <= 0) { spawnEnemy(); state.enemySpawn = Math.max(.3, 1.12 - state.wave * .065) * random(.68, 1.08); }
    }
    if (state.bossWave && !state.bossSpawned) { state.enemySpawn -= dt; if (state.enemySpawn <= 0) spawnBoss(); }
    if (state.powerSpawn <= 0 && state.wave > 1) { spawnPickup(random(30, state.width - 30), random(40, state.height - 40)); state.powerSpawn = random(13, 20); }
    for (const bullet of state.bullets) { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; }
    state.bullets = state.bullets.filter(b => b.x > -20 && b.x < state.width + 20 && b.y > -30 && b.y < state.height + 20);
    for (const bullet of state.enemyBullets) { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; }
    state.enemyBullets = state.enemyBullets.filter(b => b.x > -25 && b.x < state.width + 25 && b.y > -25 && b.y < state.height + 25);
    for (const enemy of state.enemies) {
      const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      enemy.angle += enemy.spin * dt;
      if (enemy.kind === 'boss') {
        enemy.y += Math.min(enemy.speed * dt, Math.max(0, 115 - enemy.y));
        enemy.x += Math.sin(performance.now() / 720) * 74 * dt;
      } else {
        const speed = enemy.kind === 'hunter' ? enemy.speed : enemy.speed * .75;
        enemy.x += Math.cos(angle) * speed * dt; enemy.y += Math.sin(angle) * speed * dt;
      }
      if (enemy.cooldown) { enemy.cooldown -= dt; if (enemy.cooldown <= 0 && enemy.y > 0 && enemy.y < state.height - 25) { enemyFire(enemy); enemy.cooldown = enemy.kind === 'boss' ? .68 : enemy.kind === 'brute' ? 1.65 : random(1.7, 2.8); } }
      if (distance(state.player, enemy) < state.player.radius + enemy.r * .75) damagePlayer();
    }
    for (const bullet of state.bullets) {
      for (const enemy of state.enemies) {
        if (bullet.dead || enemy.dead) continue;
        if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.r + enemy.r * .72) {
          bullet.dead = true; enemy.hp -= bullet.damage; burst(bullet.x, bullet.y, bullet.color, 3, 44);
          if (enemy.hp <= 0) {
            enemy.dead = true; state.score += enemy.score; state.waveKills += enemy.kind === 'boss' ? state.enemiesRequired : 1; burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 42 : 15, enemy.kind === 'boss' ? 210 : 110); tone(enemy.kind === 'boss' ? 260 : 300, .09, 'triangle', .025);
            if (enemy.kind === 'boss') { spawnPickup(enemy.x - 18, enemy.y, 'repair'); spawnPickup(enemy.x + 18, enemy.y, 'shield'); toast('GUARDIÃO DESTRUÍDO'); }
            else if (Math.random() < .09) spawnPickup(enemy.x, enemy.y);
            updateHud();
          }
          break;
        }
      }
    }
    state.bullets = state.bullets.filter(b => !b.dead);
    state.enemies = state.enemies.filter(e => !e.dead && e.y > -100 && e.y < state.height + 100 && e.x > -100 && e.x < state.width + 100);
    for (const bullet of state.enemyBullets) if (Math.hypot(bullet.x - state.player.x, bullet.y - state.player.y) < bullet.r + state.player.radius * .7) { bullet.dead = true; damagePlayer(); }
    state.enemyBullets = state.enemyBullets.filter(b => !b.dead);
    for (const pickup of state.pickups) {
      pickup.life -= dt; pickup.spin += dt * 3;
      const angle = Math.atan2(state.player.y - pickup.y, state.player.x - pickup.x);
      if (distance(state.player, pickup) < 105) { pickup.x += Math.cos(angle) * 105 * dt; pickup.y += Math.sin(angle) * 105 * dt; }
      if (distance(state.player, pickup) < state.player.radius + pickup.r) {
        pickup.dead = true;
        if (pickup.kind === 'repair') { state.lives = Math.min(5, state.lives + 1); toast('CASCO REPARADO +1 VIDA'); }
        else { state.shields = Math.min(4, state.shields + 1); toast('ESCUDO DE ENERGIA +1'); }
        burst(pickup.x, pickup.y, pickup.kind === 'repair' ? '#76ffae' : '#75bdff', 14, 90); tone(780, .17, 'sine', .04); updateHud();
      }
    }
    state.pickups = state.pickups.filter(p => !p.dead && p.life > 0);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.vy *= .985; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
    if (state.mode === 'playing' && state.waveKills >= state.enemiesRequired && state.enemies.length === 0) openUpgrade();
  }
  function drawShip(x, y, size, color, angle = -Math.PI / 2, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2); ctx.globalAlpha = alpha;
    ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, -size * 1.45); ctx.lineTo(size * .92, size); ctx.lineTo(0, size * .56); ctx.lineTo(-size * .92, size); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#f1ffff'; ctx.beginPath(); ctx.ellipse(0, -size * .08, size * .27, size * .52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6db9ff'; ctx.beginPath(); ctx.moveTo(-size * .42, size * .58); ctx.lineTo(0, size * random(1, 1.8)); ctx.lineTo(size * .42, size * .58); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function drawEnemy(enemy) {
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(enemy.angle); ctx.shadowColor = enemy.color; ctx.shadowBlur = enemy.kind === 'boss' ? 24 : 12; ctx.fillStyle = enemy.color; ctx.strokeStyle = '#ffeef5'; ctx.lineWidth = 1.2;
    if (enemy.kind === 'meteor' || enemy.kind === 'brute') {
      const n = 8; ctx.beginPath();
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const r = enemy.r * (i % 2 ? .78 : random(.91, 1.08)); const px = Math.cos(a) * r; const py = Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (enemy.kind === 'boss') {
      ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const r = enemy.r * (i % 2 ? .87 : 1.2); const px = Math.cos(a) * r; const py = Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff3f7'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff547d'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -enemy.r * 1.15); ctx.lineTo(enemy.r, enemy.r * .85); ctx.lineTo(0, enemy.r * .46); ctx.lineTo(-enemy.r, enemy.r * .85); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(-3, -2, 6, 4);
    }
    ctx.restore();
    if (enemy.kind === 'boss') {
      const barWidth = Math.min(190, state.width * .45); const ratio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(state.width / 2 - barWidth / 2, 15, barWidth, 7);
      ctx.fillStyle = '#ff547d'; ctx.fillRect(state.width / 2 - barWidth / 2, 15, barWidth * ratio, 7);
      ctx.fillStyle = '#ffdbe4'; ctx.font = '800 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('GUARDIÃO', state.width / 2, 34);
    } else if (enemy.hp > 1) {
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 6, enemy.r * 2, 2);
      ctx.fillStyle = enemy.color; ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 6, enemy.r * 2 * (enemy.hp / enemy.maxHp), 2);
    }
  }
  function draw(timestamp) {
    ctx.clearRect(0, 0, state.width, state.height);
    const bg = ctx.createLinearGradient(0, 0, state.width, state.height); bg.addColorStop(0, '#080e20'); bg.addColorStop(1, '#0e1025'); ctx.fillStyle = bg; ctx.fillRect(0, 0, state.width, state.height);
    for (const star of state.stars) { star.y += star.z * .13; if (star.y > state.height) { star.y = 0; star.x = Math.random() * state.width; } const twinkle = .45 + .45 * Math.sin(timestamp / 600 + star.phase); ctx.fillStyle = `rgba(190,220,255,${twinkle * star.z})`; ctx.fillRect(star.x, star.y, star.z * 1.5, star.z * 1.5); }
    ctx.strokeStyle = 'rgba(129,160,255,.045)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(state.width / 2, 0); ctx.lineTo(state.width / 2, state.height); ctx.moveTo(0, state.height / 2); ctx.lineTo(state.width, state.height / 2); ctx.stroke();
    for (const pickup of state.pickups) {
      const color = pickup.kind === 'repair' ? '#72ffad' : '#75bdff'; ctx.save(); ctx.translate(pickup.x, pickup.y); ctx.rotate(pickup.spin); ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -pickup.r); ctx.lineTo(pickup.r, 0); ctx.lineTo(0, pickup.r); ctx.lineTo(-pickup.r, 0); ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pickup.kind === 'repair' ? '+' : '⬡', 0, 0); ctx.restore();
    }
    for (const b of state.bullets) { ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0;
    for (const b of state.enemyBullets) { ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0;
    for (const enemy of state.enemies) drawEnemy(enemy);
    for (const p of state.particles) { ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (state.invulnerable <= 0 || Math.floor(timestamp / 90) % 2 === 0) drawShip(state.player.x, state.player.y, state.player.radius, state.player.color, state.player.angle);
    if (state.shields) { ctx.strokeStyle = `rgba(110,190,255,${.3 + Math.sin(timestamp / 150) * .12})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(state.player.x, state.player.y, state.player.radius + 9, 0, Math.PI * 2); ctx.stroke(); }
  }
  function frame(timestamp) {
    if (state.mode !== 'playing') return;
    const dt = Math.min(.033, Math.max(0, (timestamp - state.lastTime) / 1000)); state.lastTime = timestamp;
    update(dt); draw(timestamp);
    if (state.mode === 'playing') state.raf = requestAnimationFrame(frame);
  }
  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left; state.pointer.y = event.clientY - rect.top;
  }
  function readFavorites() { try { const list = JSON.parse(localStorage.getItem(favoritesKey) || '[]'); return new Set(Array.isArray(list) ? list : []); } catch { return new Set(); } }
  function updateFavorite() {
    if (!ui.favorite) return;
    const favorites = readFavorites(); const active = favorites.has(gameId);
    ui.favorite.setAttribute('aria-pressed', String(active)); ui.favorite.setAttribute('aria-label', `${active ? 'Remover' : 'Adicionar'} CV STARFALL ${active ? 'dos' : 'aos'} favoritos`); ui.favorite.title = active ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    const icon = ui.favorite.querySelector('.favorite-icon'); const label = ui.favorite.querySelector('[data-favorite-label]');
    if (icon) icon.textContent = active ? '♥' : '♡'; if (label) label.textContent = active ? 'Favoritado' : 'Favoritar';
  }
  function toggleFavorite() {
    const favorites = readFavorites(); if (favorites.has(gameId)) favorites.delete(gameId); else favorites.add(gameId);
    try { localStorage.setItem(favoritesKey, JSON.stringify([...favorites])); window.dispatchEvent(new Event('cv-games-favorites-change')); } catch { /* Favoritos são opcionais. */ }
    updateFavorite();
  }
  function toggleSound() { state.soundOn = !state.soundOn; ui.sound.setAttribute('aria-pressed', String(state.soundOn)); ui.sound.textContent = state.soundOn ? '🔊 SOM' : '🔇 SOM'; if (state.soundOn) tone(520, .1); }

  ui.start.addEventListener('click', () => state.mode === 'paused' ? pauseGame() : startGame());
  ui.pause.addEventListener('click', pauseGame);
  ui.sound.addEventListener('click', toggleSound);
  ui.favorite?.addEventListener('click', toggleFavorite);
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Escape' || event.code === 'KeyP') { if (state.mode === 'playing' || state.mode === 'paused') pauseGame(); }
    if (event.code === 'Enter' && ['intro', 'gameover'].includes(state.mode)) startGame();
    state.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => state.keys.delete(event.code));
  window.addEventListener('blur', () => { state.keys.clear(); state.pointer.active = false; if (state.mode === 'playing') pauseGame(); });
  canvas.addEventListener('pointerdown', (event) => { if (state.mode !== 'playing') return; canvas.setPointerCapture(event.pointerId); pointerPosition(event); state.pointer.active = true; });
  canvas.addEventListener('pointermove', (event) => { if (state.pointer.active) pointerPosition(event); });
  canvas.addEventListener('pointerup', () => { state.pointer.active = false; });
  canvas.addEventListener('pointercancel', () => { state.pointer.active = false; });
  document.querySelectorAll('[data-dir]').forEach((button) => {
    const direction = button.dataset.dir;
    const start = (event) => { event.preventDefault(); state.touch[direction] = true; };
    const stop = () => { state.touch[direction] = false; };
    button.addEventListener('pointerdown', start); button.addEventListener('pointerup', stop); button.addEventListener('pointercancel', stop); button.addEventListener('pointerleave', stop);
  });
  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', resize);
  document.addEventListener('webkitfullscreenchange', resize);
  document.addEventListener('cv-games-fullscreenchange', resize);
  updateHud(); updateFavorite(); resize(); setMode('intro'); draw(0);
})();
