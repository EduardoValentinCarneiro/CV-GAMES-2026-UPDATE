(function () {
  'use strict';

  const state = {
    stopwatch: { elapsed: 0, lastLap: 0, rafId: null, startedAt: null },
    countdown: { alarmPlayed: false, endAt: null, mode: 'idle', rafId: null, remaining: 0 },
  };

  const elements = {};

  function query(selector) {
    return document.querySelector(selector);
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function setStatus(element, message, tone) {
    setText(element, message);
    if (element) element.dataset.tone = tone || 'default';
  }

  function pad(value, length) {
    return String(value).padStart(length, '0');
  }

  function formatElapsed(milliseconds) {
    const total = Math.max(0, Math.floor(milliseconds));
    const hours = Math.floor(total / 3600000);
    const minutes = Math.floor((total % 3600000) / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const remainder = total % 1000;
    const hourPrefix = hours ? `${pad(hours, 2)}:` : '';
    return `${hourPrefix}${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(remainder, 3)}`;
  }

  function formatCountdown(milliseconds) {
    const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours ? `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}` : `${pad(minutes, 2)}:${pad(seconds, 2)}`;
  }

  function formatNumber(value, maximumFractionDigits) {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: maximumFractionDigits === undefined ? 1 : maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(value);
  }

  function cancelFrame(id) {
    if (id !== null) window.cancelAnimationFrame(id);
  }

  function getStopwatchElapsed() {
    if (state.stopwatch.startedAt === null) return state.stopwatch.elapsed;
    return state.stopwatch.elapsed + (performance.now() - state.stopwatch.startedAt);
  }

  function updateStopwatchControls() {
    const isRunning = state.stopwatch.startedAt !== null;
    const hasElapsed = state.stopwatch.elapsed > 0;
    elements.stopwatchStart.textContent = hasElapsed && !isRunning ? '▶ Continuar' : '▶ Iniciar';
    elements.stopwatchPause.disabled = !isRunning;
    elements.stopwatchLap.disabled = !isRunning;
  }

  function renderStopwatch() {
    setText(elements.stopwatchDisplay, formatElapsed(getStopwatchElapsed()));
  }

  function tickStopwatch() {
    if (state.stopwatch.startedAt === null) return;
    renderStopwatch();
    state.stopwatch.rafId = window.requestAnimationFrame(tickStopwatch);
  }

  function startStopwatch() {
    if (state.stopwatch.startedAt !== null) return;
    state.stopwatch.startedAt = performance.now();
    setStatus(elements.stopwatchStatus, 'Cronômetro em andamento.', 'running');
    updateStopwatchControls();
    cancelFrame(state.stopwatch.rafId);
    state.stopwatch.rafId = window.requestAnimationFrame(tickStopwatch);
  }

  function pauseStopwatch() {
    if (state.stopwatch.startedAt === null) return;
    state.stopwatch.elapsed = getStopwatchElapsed();
    state.stopwatch.startedAt = null;
    cancelFrame(state.stopwatch.rafId);
    state.stopwatch.rafId = null;
    renderStopwatch();
    setStatus(elements.stopwatchStatus, 'Cronômetro pausado.', 'default');
    updateStopwatchControls();
  }

  function renderLaps() {
    const fragment = document.createDocumentFragment();
    state.stopwatch.laps.forEach((lap, index) => {
      const item = document.createElement('li');
      const label = document.createElement('strong');
      const interval = document.createElement('span');
      const total = document.createElement('span');
      label.textContent = `Volta ${index + 1}`;
      interval.textContent = formatElapsed(lap.interval);
      total.textContent = `Total: ${formatElapsed(lap.total)}`;
      item.append(label, interval, total);
      fragment.appendChild(item);
    });
    elements.stopwatchLaps.replaceChildren(fragment);
  }

  function addStopwatchLap() {
    if (state.stopwatch.startedAt === null) return;
    const total = getStopwatchElapsed();
    const interval = total - state.stopwatch.lastLap;
    state.stopwatch.lastLap = total;
    state.stopwatch.laps.push({ interval, total });
    renderLaps();
    setStatus(elements.stopwatchStatus, `Volta ${state.stopwatch.laps.length} registrada.`, 'success');
  }

  function resetStopwatch() {
    cancelFrame(state.stopwatch.rafId);
    state.stopwatch.rafId = null;
    state.stopwatch.elapsed = 0;
    state.stopwatch.lastLap = 0;
    state.stopwatch.startedAt = null;
    state.stopwatch.laps = [];
    renderStopwatch();
    renderLaps();
    setStatus(elements.stopwatchStatus, 'Cronômetro zerado.', 'default');
    updateStopwatchControls();
  }

  function readCountdownDuration() {
    const values = [
      Number(elements.countdownHours.value),
      Number(elements.countdownMinutes.value),
      Number(elements.countdownSeconds.value),
    ];
    const limits = [23, 59, 59];
    if (values.some((value, index) => !Number.isInteger(value) || value < 0 || value > limits[index])) return null;
    const duration = ((values[0] * 3600) + (values[1] * 60) + values[2]) * 1000;
    return duration > 0 ? duration : null;
  }

  function syncCountdownDisplayFromInputs() {
    if (state.countdown.mode !== 'idle' && state.countdown.mode !== 'complete') return;
    stopCountdownAlarm();
    state.countdown.alarmPlayed = false;
    if (state.countdown.mode === 'complete') state.countdown.mode = 'idle';
    const duration = readCountdownDuration();
    state.countdown.remaining = duration || 0;
    setText(elements.countdownDisplay, formatCountdown(state.countdown.remaining));
  }

  function getCountdownRemaining() {
    if (state.countdown.mode !== 'running' || state.countdown.endAt === null) return state.countdown.remaining;
    return Math.max(0, state.countdown.endAt - Date.now());
  }

  function stopCountdownAlarm() {
    if (!elements.countdownAlarm) return;
    try {
      elements.countdownAlarm.pause();
      elements.countdownAlarm.currentTime = 0;
    } catch {
      // O timer continua utilizável mesmo se o navegador recusar o controle do áudio.
    }
  }

  function playCountdownAlarm() {
    if (state.countdown.alarmPlayed || !elements.countdownAlarm) return;
    state.countdown.alarmPlayed = true;
    try {
      elements.countdownAlarm.currentTime = 0;
      const playback = elements.countdownAlarm.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch((error) => {
          console.warn('[CV GAMES] O navegador bloqueou o alarme automático do timer.', error);
          setStatus(elements.countdownStatus, 'Tempo encerrado! O navegador bloqueou o som automático.', 'success');
        });
      }
    } catch (error) {
      console.warn('[CV GAMES] Não foi possível reproduzir o alarme do timer.', error);
      setStatus(elements.countdownStatus, 'Tempo encerrado! Não foi possível reproduzir o alarme neste navegador.', 'success');
    }
  }

  function updateCountdownControls() {
    const isRunning = state.countdown.mode === 'running';
    const isPaused = state.countdown.mode === 'paused';
    const isActive = isRunning || isPaused;
    [elements.countdownHours, elements.countdownMinutes, elements.countdownSeconds].forEach((input) => {
      input.disabled = isActive;
    });
    document.querySelectorAll('[data-countdown-preset]').forEach((button) => {
      button.disabled = isActive;
    });
    elements.countdownStart.hidden = isPaused;
    elements.countdownStart.disabled = isRunning;
    elements.countdownPause.hidden = !isRunning;
    elements.countdownPause.disabled = !isRunning;
    elements.countdownResume.hidden = !isPaused;
    elements.countdownCancel.disabled = !isActive;
  }

  function finishCountdown() {
    if (state.countdown.mode !== 'running') return;
    cancelFrame(state.countdown.rafId);
    state.countdown.rafId = null;
    state.countdown.endAt = null;
    state.countdown.remaining = 0;
    state.countdown.mode = 'complete';
    setText(elements.countdownDisplay, '00:00');
    setStatus(elements.countdownStatus, 'Tempo encerrado!', 'success');
    updateCountdownControls();
    playCountdownAlarm();
  }

  function tickCountdown() {
    if (state.countdown.mode !== 'running') return;
    state.countdown.remaining = getCountdownRemaining();
    setText(elements.countdownDisplay, formatCountdown(state.countdown.remaining));
    if (state.countdown.remaining <= 0) {
      finishCountdown();
      return;
    }
    state.countdown.rafId = window.requestAnimationFrame(tickCountdown);
  }

  function startCountdown() {
    if (state.countdown.mode === 'running') return;
    const duration = readCountdownDuration();
    if (!duration) {
      setStatus(elements.countdownStatus, 'Defina um tempo válido maior que zero.', 'error');
      return;
    }
    stopCountdownAlarm();
    state.countdown.alarmPlayed = false;
    state.countdown.remaining = duration;
    state.countdown.endAt = Date.now() + duration;
    state.countdown.mode = 'running';
    setStatus(elements.countdownStatus, 'Timer regressivo em andamento.', 'running');
    updateCountdownControls();
    cancelFrame(state.countdown.rafId);
    state.countdown.rafId = window.requestAnimationFrame(tickCountdown);
  }

  function pauseCountdown() {
    if (state.countdown.mode !== 'running') return;
    state.countdown.remaining = getCountdownRemaining();
    state.countdown.endAt = null;
    state.countdown.mode = 'paused';
    cancelFrame(state.countdown.rafId);
    state.countdown.rafId = null;
    setText(elements.countdownDisplay, formatCountdown(state.countdown.remaining));
    setStatus(elements.countdownStatus, 'Timer regressivo pausado.', 'default');
    updateCountdownControls();
  }

  function resumeCountdown() {
    if (state.countdown.mode !== 'paused' || state.countdown.remaining <= 0) return;
    state.countdown.endAt = Date.now() + state.countdown.remaining;
    state.countdown.mode = 'running';
    setStatus(elements.countdownStatus, 'Timer regressivo retomado.', 'running');
    updateCountdownControls();
    state.countdown.rafId = window.requestAnimationFrame(tickCountdown);
  }

  function cancelCountdown() {
    cancelFrame(state.countdown.rafId);
    state.countdown.rafId = null;
    state.countdown.endAt = null;
    state.countdown.mode = 'idle';
    stopCountdownAlarm();
    state.countdown.alarmPlayed = false;
    syncCountdownDisplayFromInputs();
    setStatus(elements.countdownStatus, 'Timer regressivo cancelado.', 'default');
    updateCountdownControls();
  }

  function applyCountdownPreset(seconds) {
    if (state.countdown.mode === 'running' || state.countdown.mode === 'paused') return;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    elements.countdownHours.value = String(hours);
    elements.countdownMinutes.value = String(minutes);
    elements.countdownSeconds.value = String(remainingSeconds);
    state.countdown.mode = 'idle';
    syncCountdownDisplayFromInputs();
    setStatus(elements.countdownStatus, `Preset de ${formatCountdown(seconds * 1000)} selecionado.`, 'default');
  }

  const STANDARD_GAMEPAD_BUTTON_NAMES = {
    0: 'principal inferior',
    1: 'principal direito',
    2: 'principal esquerdo',
    3: 'principal superior',
    4: 'ombro esquerdo',
    5: 'ombro direito',
    6: 'gatilho esquerdo',
    7: 'gatilho direito',
    8: 'selecionar',
    9: 'iniciar',
    10: 'analógico esquerdo',
    11: 'analógico direito',
    12: 'direcional para cima',
    13: 'direcional para baixo',
    14: 'direcional para esquerda',
    15: 'direcional para direita',
  };
  const GAMEPAD_DRIFT_DELAY = 550;
  const GAMEPAD_BUTTON_ACTIVE_VALUE = 0.1;

  const gamepadTool = {
    elements: {},
    axisNodes: [],
    buttonNodes: [],
    driftSince: null,
    initialized: false,
    lastDriftMessage: '',
    lastStatus: '',
    lastTopology: '',
    rafId: null,
    selectedIndex: null,
    visualControls: new Map(),
  };

  const keyboardTool = {
    elements: {},
    initialized: false,
    lastCode: '',
    pressed: new Set(),
    visualKeys: new Map(),
  };

  const mouseTool = {
    counts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
    elements: {},
    initialized: false,
    pressed: new Set(),
  };

  function formatGamepadValue(value) {
    return formatNumber(Number(value) || 0, 2);
  }

  function getConnectedGamepads() {
    if (!navigator.getGamepads) return [];
    try {
      return Array.from(navigator.getGamepads() || []).filter((gamepad) => gamepad && gamepad.connected !== false);
    } catch (error) {
      return [];
    }
  }

  function getLiveGamepad(index) {
    if (index === null || index === undefined || !navigator.getGamepads) return null;
    try {
      const gamepad = navigator.getGamepads()[index];
      return gamepad && gamepad.connected !== false ? gamepad : null;
    } catch (error) {
      return null;
    }
  }

  function setGamepadStatus(message, tone) {
    if (!gamepadTool.elements.status || gamepadTool.lastStatus === `${tone || 'default'}|${message}`) return;
    gamepadTool.lastStatus = `${tone || 'default'}|${message}`;
    setStatus(gamepadTool.elements.status, message, tone);
  }

  function setGamepadDrift(message, tone) {
    const driftElement = gamepadTool.elements.drift;
    if (!driftElement || gamepadTool.lastDriftMessage === `${tone || 'default'}|${message}`) return;
    gamepadTool.lastDriftMessage = `${tone || 'default'}|${message}`;
    setText(driftElement, message);
    driftElement.dataset.tone = tone || 'default';
  }

  function gamepadTopology(gamepads) {
    return gamepads.map((gamepad) => [
      gamepad.index,
      gamepad.id,
      gamepad.mapping || '',
      gamepad.buttons ? gamepad.buttons.length : 0,
      gamepad.axes ? gamepad.axes.length : 0,
    ].join(':')).join('|');
  }

  function getHapticActuator(gamepad) {
    if (!gamepad) return null;
    if (gamepad.vibrationActuator && (typeof gamepad.vibrationActuator.playEffect === 'function' || typeof gamepad.vibrationActuator.pulse === 'function')) {
      return gamepad.vibrationActuator;
    }
    return Array.from(gamepad.hapticActuators || []).find((actuator) => actuator && (typeof actuator.playEffect === 'function' || typeof actuator.pulse === 'function')) || null;
  }

  function createGamepadOption(gamepad) {
    const option = document.createElement('option');
    option.value = String(gamepad.index);
    option.textContent = `Controle ${gamepad.index + 1} — ${gamepad.id || 'sem nome informado'}`;
    return option;
  }

  function updateGamepadSelector(gamepads, preferredIndex) {
    const toolElements = gamepadTool.elements;
    const signature = gamepadTopology(gamepads);

    if (!gamepads.length) {
      gamepadTool.selectedIndex = null;
      gamepadTool.lastTopology = '';
      toolElements.selectorWrap.hidden = true;
      toolElements.details.hidden = true;
      toolElements.vibrate.hidden = true;
      toolElements.select.replaceChildren();
      toolElements.rawButtons.replaceChildren();
      toolElements.axisList.replaceChildren();
      gamepadTool.buttonNodes = [];
      gamepadTool.axisNodes = [];
      gamepadTool.driftSince = null;
      setGamepadDrift('Sem movimento acima da deadzone.', 'default');
      setGamepadStatus('Nenhum controle detectado. Conecte um controle USB ou Bluetooth e pressione algum botão.', 'default');
      return null;
    }

    const selectedStillConnected = gamepads.some((gamepad) => gamepad.index === gamepadTool.selectedIndex);
    if (!selectedStillConnected) {
      const preferred = gamepads.find((gamepad) => gamepad.index === preferredIndex);
      gamepadTool.selectedIndex = (preferred || gamepads[0]).index;
    }

    if (signature !== gamepadTool.lastTopology) {
      gamepadTool.lastTopology = signature;
      toolElements.select.replaceChildren(...gamepads.map(createGamepadOption));
    }

    toolElements.select.value = String(gamepadTool.selectedIndex);
    toolElements.selectorWrap.hidden = false;
    toolElements.details.hidden = false;
    setGamepadStatus(`${gamepads.length} controle${gamepads.length === 1 ? '' : 's'} detectado${gamepads.length === 1 ? '' : 's'}.`, 'success');
    return getLiveGamepad(gamepadTool.selectedIndex) || gamepads.find((gamepad) => gamepad.index === gamepadTool.selectedIndex) || null;
  }

  function createGamepadRawButton(index, mapping) {
    const item = document.createElement('div');
    const title = document.createElement('strong');
    const stateLabel = document.createElement('span');
    title.textContent = `Botão ${index}${mapping === 'standard' && STANDARD_GAMEPAD_BUTTON_NAMES[index] ? ` — ${STANDARD_GAMEPAD_BUTTON_NAMES[index]}` : ''}`;
    stateLabel.textContent = 'Solto · 0,00';
    item.className = 'gamepad-raw-button';
    item.dataset.pressed = 'false';
    item.append(title, stateLabel);
    return { item, stateLabel };
  }

  function createGamepadAxis(index) {
    const item = document.createElement('div');
    const title = document.createElement('strong');
    const value = document.createElement('span');
    title.textContent = `Eixo ${index}`;
    value.textContent = '0,00';
    item.append(title, value);
    return { item, value };
  }

  function ensureGamepadRawData(gamepad) {
    const buttons = Array.from(gamepad.buttons || []);
    const axes = Array.from(gamepad.axes || []);
    const mapping = gamepad.mapping || '';
    if (gamepadTool.buttonNodes.length !== buttons.length || gamepadTool.buttonNodes.mapping !== mapping) {
      gamepadTool.buttonNodes = buttons.map((button, index) => createGamepadRawButton(index, mapping));
      gamepadTool.buttonNodes.mapping = mapping;
      gamepadTool.elements.rawButtons.replaceChildren(...gamepadTool.buttonNodes.map((node) => node.item));
    }
    if (gamepadTool.axisNodes.length !== axes.length) {
      gamepadTool.axisNodes = axes.map((axis, index) => createGamepadAxis(index));
      gamepadTool.elements.axisList.replaceChildren(...gamepadTool.axisNodes.map((node) => node.item));
    }
  }

  function getGamepadButton(gamepad, index) {
    const button = gamepad.buttons && gamepad.buttons[index];
    const value = button && Number.isFinite(Number(button.value)) ? Number(button.value) : 0;
    return { pressed: Boolean(button && button.pressed) || value > GAMEPAD_BUTTON_ACTIVE_VALUE, value };
  }

  function getGamepadAxis(gamepad, index) {
    const value = gamepad.axes && Number(gamepad.axes[index]);
    return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
  }

  function updateGamepadStick(name, x, y) {
    const thumb = gamepadTool.elements[`${name}Thumb`];
    const text = gamepadTool.elements[`${name}Axis`];
    if (!thumb || !text) return;
    thumb.style.setProperty('--axis-x', String(x));
    thumb.style.setProperty('--axis-y', String(y));
    setText(text, `X: ${formatGamepadValue(x)} · Y: ${formatGamepadValue(y)}`);
  }

  function updateGamepadDrift(gamepad) {
    const deadzone = Number(gamepadTool.elements.deadzone.value) || 0.1;
    const hasButtonInput = Array.from(gamepad.buttons || []).some((button) => {
      const value = button && Number.isFinite(Number(button.value)) ? Number(button.value) : 0;
      return Boolean(button && button.pressed) || value > GAMEPAD_BUTTON_ACTIVE_VALUE;
    });
    const movingAxes = Array.from(gamepad.axes || []).filter((axis) => Math.abs(Number(axis) || 0) > deadzone);
    if (!hasButtonInput && movingAxes.length) {
      if (gamepadTool.driftSince === null) gamepadTool.driftSince = performance.now();
      const elapsed = performance.now() - gamepadTool.driftSince;
      const message = elapsed >= GAMEPAD_DRIFT_DELAY
        ? `Possível drift / movimento em repouso acima de ${formatGamepadValue(deadzone)}.`
        : `Movimento acima de ${formatGamepadValue(deadzone)} observado; aguardando confirmação.`;
      setGamepadDrift(message, elapsed >= GAMEPAD_DRIFT_DELAY ? 'warning' : 'default');
    } else {
      gamepadTool.driftSince = null;
      setGamepadDrift('Sem movimento acima da deadzone.', 'success');
    }
  }

  function renderGamepad(gamepad) {
    if (!gamepad) return;
    const toolElements = gamepadTool.elements;
    setText(toolElements.name, gamepad.id || 'Sem nome informado pelo navegador');
    setText(toolElements.index, String(gamepad.index));
    setText(toolElements.buttonCount, String((gamepad.buttons || []).length));
    setText(toolElements.axisCount, String((gamepad.axes || []).length));
    setText(toolElements.mapping, gamepad.mapping || 'não informado');
    toolElements.vibrate.hidden = !getHapticActuator(gamepad);

    ensureGamepadRawData(gamepad);
    gamepadTool.buttonNodes.forEach((node, index) => {
      const button = getGamepadButton(gamepad, index);
      node.item.dataset.pressed = String(button.pressed);
      setText(node.stateLabel, `${button.pressed ? 'Pressionado' : 'Solto'} · ${formatGamepadValue(button.value)}`);
    });
    gamepadTool.axisNodes.forEach((node, index) => setText(node.value, formatGamepadValue(getGamepadAxis(gamepad, index))));
    gamepadTool.visualControls.forEach((control, index) => {
      const button = getGamepadButton(gamepad, index);
      control.dataset.pressed = String(button.pressed);
    });
    updateGamepadStick('left', getGamepadAxis(gamepad, 0), getGamepadAxis(gamepad, 1));
    updateGamepadStick('right', getGamepadAxis(gamepad, 2), getGamepadAxis(gamepad, 3));
    updateGamepadDrift(gamepad);
  }

  function stopGamepadLoop() {
    cancelFrame(gamepadTool.rafId);
    gamepadTool.rafId = null;
  }

  function gamepadFrame() {
    gamepadTool.rafId = null;
    if (document.hidden || !gamepadTool.initialized) return;
    const currentGamepad = updateGamepadSelector(getConnectedGamepads());
    if (!currentGamepad) return;
    renderGamepad(currentGamepad);
    gamepadTool.rafId = window.requestAnimationFrame(gamepadFrame);
  }

  function ensureGamepadLoop() {
    if (!gamepadTool.initialized || document.hidden || gamepadTool.rafId !== null || !getConnectedGamepads().length) return;
    gamepadTool.rafId = window.requestAnimationFrame(gamepadFrame);
  }

  function refreshGamepads(preferredIndex) {
    if (!gamepadTool.initialized) return;
    const currentGamepad = updateGamepadSelector(getConnectedGamepads(), preferredIndex);
    if (currentGamepad) {
      renderGamepad(currentGamepad);
      ensureGamepadLoop();
    } else {
      stopGamepadLoop();
    }
  }

  async function testGamepadVibration() {
    const gamepad = getLiveGamepad(gamepadTool.selectedIndex);
    const actuator = getHapticActuator(gamepad);
    if (!actuator) {
      setGamepadStatus('Este controle não disponibiliza vibração neste navegador.', 'default');
      return;
    }
    try {
      if (typeof actuator.playEffect === 'function') {
        await actuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: 160,
          strongMagnitude: 0.35,
          weakMagnitude: 0.35,
        });
      } else if (typeof actuator.pulse === 'function') {
        await actuator.pulse(0.4, 160);
      }
      setGamepadStatus('Vibração de teste enviada ao controle selecionado.', 'success');
    } catch (error) {
      setGamepadStatus('Não foi possível acionar a vibração deste controle neste navegador.', 'default');
    }
  }

  function initGamepadTool() {
    const toolElements = gamepadTool.elements;
    toolElements.status = query('[data-gamepad-status]');
    toolElements.selectorWrap = query('[data-gamepad-selector-wrap]');
    toolElements.select = query('[data-gamepad-select]');
    toolElements.vibrate = query('[data-gamepad-vibrate]');
    toolElements.details = query('[data-gamepad-details]');
    toolElements.name = query('[data-gamepad-name]');
    toolElements.index = query('[data-gamepad-index]');
    toolElements.buttonCount = query('[data-gamepad-button-count]');
    toolElements.axisCount = query('[data-gamepad-axis-count]');
    toolElements.mapping = query('[data-gamepad-mapping]');
    toolElements.deadzone = query('[data-gamepad-deadzone]');
    toolElements.deadzoneValue = query('[data-gamepad-deadzone-value]');
    toolElements.drift = query('[data-gamepad-drift]');
    toolElements.leftThumb = query('[data-gamepad-stick-thumb="left"]');
    toolElements.rightThumb = query('[data-gamepad-stick-thumb="right"]');
    toolElements.leftAxis = query('[data-gamepad-left-axis]');
    toolElements.rightAxis = query('[data-gamepad-right-axis]');
    toolElements.rawButtons = query('[data-gamepad-raw-buttons]');
    toolElements.axisList = query('[data-gamepad-axis-list]');
    if (Object.values(toolElements).some((element) => !element)) return;

    gamepadTool.initialized = true;
    document.querySelectorAll('[data-gamepad-control]').forEach((control) => {
      gamepadTool.visualControls.set(Number(control.dataset.gamepadControl), control);
    });
    toolElements.deadzoneValue.textContent = formatGamepadValue(toolElements.deadzone.value);
    toolElements.deadzone.addEventListener('input', () => {
      toolElements.deadzoneValue.textContent = formatGamepadValue(toolElements.deadzone.value);
      const gamepad = getLiveGamepad(gamepadTool.selectedIndex);
      if (gamepad) updateGamepadDrift(gamepad);
    });
    toolElements.select.addEventListener('change', () => {
      gamepadTool.selectedIndex = Number(toolElements.select.value);
      refreshGamepads(gamepadTool.selectedIndex);
    });
    toolElements.vibrate.addEventListener('click', testGamepadVibration);
    window.addEventListener('gamepadconnected', (event) => refreshGamepads(event.gamepad && event.gamepad.index));
    window.addEventListener('gamepaddisconnected', () => refreshGamepads());

    if (!navigator.getGamepads) {
      setGamepadStatus('Este navegador não disponibiliza a Gamepad API.', 'error');
      return;
    }
    refreshGamepads();
  }

  function isEditableElement(target) {
    if (!(target instanceof Element)) return false;
    return target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable]'));
  }

  function renderKeyboardTool() {
    if (!keyboardTool.initialized) return;
    keyboardTool.visualKeys.forEach((key, code) => {
      const pressed = keyboardTool.pressed.has(code);
      key.dataset.pressed = String(pressed);
    });
    const pressedCodes = Array.from(keyboardTool.pressed);
    setText(keyboardTool.elements.current, pressedCodes.length ? pressedCodes.join(' + ') : 'Nenhuma');
    setText(keyboardTool.elements.count, String(pressedCodes.length));
    setText(keyboardTool.elements.last, keyboardTool.lastCode || '—');
  }

  function clearKeyboardState() {
    if (!keyboardTool.initialized || !keyboardTool.pressed.size) return;
    keyboardTool.pressed.clear();
    renderKeyboardTool();
  }

  function initKeyboardTool() {
    const toolElements = keyboardTool.elements;
    toolElements.current = query('[data-keyboard-current]');
    toolElements.last = query('[data-keyboard-last]');
    toolElements.count = query('[data-keyboard-count]');
    toolElements.status = query('[data-keyboard-status]');
    if (Object.values(toolElements).some((element) => !element)) return;

    document.querySelectorAll('[data-key-code]').forEach((key) => keyboardTool.visualKeys.set(key.dataset.keyCode, key));
    keyboardTool.initialized = true;
    renderKeyboardTool();
    window.addEventListener('keydown', (event) => {
      if (isEditableElement(event.target) || !event.code) return;
      keyboardTool.pressed.add(event.code);
      keyboardTool.lastCode = event.code;
      setStatus(toolElements.status, 'Teclas exibidas apenas em tempo real nesta página.', 'default');
      renderKeyboardTool();
    });
    window.addEventListener('keyup', (event) => {
      if (!event.code || !keyboardTool.pressed.delete(event.code)) return;
      renderKeyboardTool();
    });
    window.addEventListener('blur', clearKeyboardState);
    document.addEventListener('focusin', (event) => {
      if (isEditableElement(event.target)) clearKeyboardState();
    });
  }

  function mouseButtonName(button) {
    return ({ 0: 'esquerdo', 1: 'meio', 2: 'direito', 3: 'Mouse 4', 4: 'Mouse 5' })[button] || `Botão ${button}`;
  }

  function renderMouseTool() {
    if (!mouseTool.initialized) return;
    [0, 1, 2, 3, 4].forEach((button) => {
      const pressed = mouseTool.pressed.has(button);
      const stateElement = mouseTool.elements.states.get(button);
      const countElement = mouseTool.elements.counts.get(button);
      if (stateElement) {
        stateElement.textContent = pressed ? 'Pressionado' : 'Solto';
        stateElement.parentElement.dataset.active = String(pressed);
      }
      if (countElement) countElement.textContent = String(mouseTool.counts[button]);
    });
  }

  function clearMouseState() {
    if (!mouseTool.initialized || !mouseTool.pressed.size) return;
    mouseTool.pressed.clear();
    renderMouseTool();
  }

  function updateMousePosition(event) {
    const area = mouseTool.elements.area;
    const rect = area.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    area.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
    area.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
    area.dataset.hasCursor = 'true';
    setText(mouseTool.elements.position, `X: ${Math.round(x)} · Y: ${Math.round(y)}`);
    setText(mouseTool.elements.movement, `X: ${Math.round(event.movementX || 0)} · Y: ${Math.round(event.movementY || 0)}`);
  }

  function initMouseTool() {
    const toolElements = mouseTool.elements;
    toolElements.area = query('[data-mouse-area]');
    toolElements.position = query('[data-mouse-position]');
    toolElements.movement = query('[data-mouse-movement]');
    toolElements.wheel = query('[data-mouse-wheel]');
    toolElements.status = query('[data-mouse-status]');
    if (Object.values(toolElements).some((element) => !element)) return;
    toolElements.states = new Map();
    toolElements.counts = new Map();
    document.querySelectorAll('[data-mouse-button-state]').forEach((element) => toolElements.states.set(Number(element.dataset.mouseButtonState), element));
    document.querySelectorAll('[data-mouse-count]').forEach((element) => toolElements.counts.set(Number(element.dataset.mouseCount), element));
    mouseTool.initialized = true;
    renderMouseTool();

    toolElements.area.addEventListener('mousemove', updateMousePosition);
    toolElements.area.addEventListener('mousedown', (event) => {
      if (!(event.button in mouseTool.counts)) return;
      mouseTool.pressed.add(event.button);
      mouseTool.counts[event.button] += 1;
      setStatus(toolElements.status, `Botão ${mouseButtonName(event.button)} detectado na área de teste.`, 'success');
      renderMouseTool();
    });
    toolElements.area.addEventListener('mouseup', (event) => {
      if (!mouseTool.pressed.delete(event.button)) return;
      renderMouseTool();
    });
    toolElements.area.addEventListener('wheel', (event) => {
      const direction = event.deltaY < 0 ? 'para cima' : event.deltaY > 0 ? 'para baixo' : 'horizontal';
      setText(toolElements.wheel, `${direction} · ΔY: ${Math.round(event.deltaY)} · ΔX: ${Math.round(event.deltaX)}`);
    });
    toolElements.area.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      setStatus(toolElements.status, 'Clique direito detectado dentro da área de teste.', 'success');
    });
    toolElements.area.addEventListener('auxclick', (event) => {
      if (event.button > 0) event.preventDefault();
    });
    window.addEventListener('mouseup', clearMouseState);
    window.addEventListener('blur', clearMouseState);
  }

  function cleanup() {
    if (state.stopwatch.startedAt !== null) pauseStopwatch();
    else cancelFrame(state.stopwatch.rafId);
    if (state.countdown.mode === 'running') pauseCountdown();
    else cancelFrame(state.countdown.rafId);
    stopCountdownAlarm();
    stopGamepadLoop();
    clearKeyboardState();
    clearMouseState();
  }

  function init() {
    elements.stopwatchDisplay = query('[data-stopwatch-display]');
    elements.stopwatchStart = query('[data-stopwatch-start]');
    elements.stopwatchPause = query('[data-stopwatch-pause]');
    elements.stopwatchReset = query('[data-stopwatch-reset]');
    elements.stopwatchLap = query('[data-stopwatch-lap]');
    elements.stopwatchStatus = query('[data-stopwatch-status]');
    elements.stopwatchLaps = query('[data-stopwatch-laps]');
    elements.countdownHours = query('[data-countdown-hours]');
    elements.countdownMinutes = query('[data-countdown-minutes]');
    elements.countdownSeconds = query('[data-countdown-seconds]');
    elements.countdownDisplay = query('[data-countdown-display]');
    elements.countdownStart = query('[data-countdown-start]');
    elements.countdownPause = query('[data-countdown-pause]');
    elements.countdownResume = query('[data-countdown-resume]');
    elements.countdownCancel = query('[data-countdown-cancel]');
    elements.countdownStatus = query('[data-countdown-status]');
    elements.countdownAlarm = query('[data-countdown-alarm]');

    if (Object.values(elements).some((element) => !element)) return;

    state.stopwatch.laps = [];
    renderStopwatch();
    renderLaps();
    updateStopwatchControls();
    syncCountdownDisplayFromInputs();
    updateCountdownControls();
    initGamepadTool();
    initKeyboardTool();
    initMouseTool();

    elements.stopwatchStart.addEventListener('click', startStopwatch);
    elements.stopwatchPause.addEventListener('click', pauseStopwatch);
    elements.stopwatchReset.addEventListener('click', resetStopwatch);
    elements.stopwatchLap.addEventListener('click', addStopwatchLap);
    [elements.countdownHours, elements.countdownMinutes, elements.countdownSeconds].forEach((input) => {
      input.addEventListener('input', syncCountdownDisplayFromInputs);
    });
    document.querySelectorAll('[data-countdown-preset]').forEach((button) => {
      button.addEventListener('click', () => applyCountdownPreset(Number(button.dataset.countdownPreset)));
    });
    elements.countdownStart.addEventListener('click', startCountdown);
    elements.countdownPause.addEventListener('click', pauseCountdown);
    elements.countdownResume.addEventListener('click', resumeCountdown);
    elements.countdownCancel.addEventListener('click', cancelCountdown);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopGamepadLoop();
        clearKeyboardState();
        clearMouseState();
        return;
      }
      refreshGamepads();
    });
    window.addEventListener('pagehide', cleanup);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
