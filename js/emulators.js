(function () {
  'use strict';

  const MAX_NES_ROM_BYTES = 8 * 1024 * 1024;
  const ENABLED_SYSTEM_IDS = new Set(['nes']);
  const SUPPORTED_NES_MAPPERS = new Set([
    0, 1, 2, 3, 4, 5, 7, 9, 11, 34, 38, 66, 71, 79, 94, 118, 119, 140, 180, 240, 241,
  ]);
  const HOME_BREW_ROM_DIRECTORY = new URL('roms/homebrew/', document.baseURI);
  const HOME_BREW_GAMES = Object.freeze([
    Object.freeze({ id: 'nes-ball-demo', title: 'NES Ball Demo', system: 'nes', fileName: 'nes-ball-demo.nes', bytes: 40976, sha256: 'bc43a96bc2e3d052079f1f46ae3205e4c7899afbd9c3f3ce66b32313ecbefbfe' }),
    Object.freeze({ id: 'table-tennis', title: '8-Bit Table Tennis', system: 'nes', fileName: '8bit-table-tennis.nes', bytes: 40976, sha256: '05122457672f95fcf2ee518c3f37e506617725c2d031100b1b1c8b7785068ea3' }),
    Object.freeze({ id: 'falling', title: 'Falling', system: 'nes', fileName: 'falling.nes', bytes: 40976, sha256: 'e22b947542c2d7e595bf84725b333be7af8189c5965b9c53e356a249c7d79943' }),
  ]);
  const HOME_BREW_GAMES_BY_ID = new Map(HOME_BREW_GAMES.map((game) => [game.id, game]));
  const HOME_BREW_LOG_PREFIX = '[CV GAMES][Homebrew]';

  const state = {
    activeAdapter: null,
    gamepadFrame: null,
    gamepadPressed: new Set(),
    homebrewAbortController: null,
    isPaused: false,
    romData: null,
    selectionId: 0,
    source: 'none',
    systemId: 'nes',
    virtualButtons: new Map(),
  };
  const elements = {};

  function getElement(selector) { return document.querySelector(selector); }
  function getAdapters() { return window.CVGamesEmulatorAdapters || {}; }
  function getSystem(systemId) { return ENABLED_SYSTEM_IDS.has(systemId) ? SYSTEMS[systemId] || null : null; }

  const SYSTEMS = Object.freeze({
    nes: Object.freeze({
      id: 'nes', label: 'NES', playerLabel: 'NES', fileLabel: 'jogo NES', extensionLabel: '.nes',
      extensions: Object.freeze(['.nes']), accept: '.nes,application/x-nes-rom', maxBytes: MAX_NES_ROM_BYTES, maxLabel: '8 MiB', screenWidth: 256, screenHeight: 240,
      createAdapter(options) { return new (getAdapters().NESAdapter)(options); },
      getCompatibilityError() {
        const Adapter = getAdapters().NESAdapter;
        return typeof Adapter?.getCompatibilityError === 'function'
          ? Adapter.getCompatibilityError()
          : 'O núcleo NES não foi carregado. Atualize a página e tente novamente.';
      },
      validate(buffer) { return validateNesRom(buffer); },
    }),
  });

  function setStatus(message, tone) {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone || 'default';
  }

  function setScreenMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.className = 'emulator-screen-message';
    messageElement.textContent = message;
    elements.screen.replaceChildren(messageElement);
  }

  function setSelectedFileName(fileName, source) {
    elements.fileName.textContent = !fileName
      ? 'Nenhum arquivo selecionado.'
      : source === 'homebrew' ? `Homebrew do CV GAMES: ${fileName}` : `Arquivo selecionado: ${fileName}`;
  }

  function updatePlayerControls() {
    const hasFile = Boolean(state.romData);
    const hasAdapter = Boolean(state.activeAdapter);
    elements.start.disabled = !hasFile || hasAdapter;
    elements.pause.disabled = !hasAdapter;
    elements.reset.disabled = !hasAdapter;
    elements.fullscreen.disabled = !hasAdapter;
    elements.pause.textContent = state.isPaused ? '▶ Retomar' : '⏸ Pausar';
    elements.player.dataset.running = String(hasAdapter && !state.isPaused);
  }

  function updateSystemInterface() {
    const system = getSystem(state.systemId);
    if (!system) return;
    elements.systemOptions.forEach((option) => {
      const selected = option.dataset.systemOption === state.systemId;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-pressed', String(selected));
      if (selected) option.setAttribute('aria-current', 'true');
      else option.removeAttribute('aria-current');
    });
    elements.input.accept = system.accept;
    elements.filePickerLabel.textContent = `Selecionar ${system.fileLabel}`;
    elements.romHelp.textContent = `Aceita arquivos ${system.extensionLabel} compatíveis, com até ${system.maxLabel}. O arquivo não é enviado para o CV GAMES.`;
    elements.playerTitle.textContent = `🎮 Emulador ${system.playerLabel}`;
    elements.touchLayout.setAttribute('aria-label', `Controles de toque ${system.playerLabel}`);
    elements.screen.dataset.system = system.id;
    elements.keyboardB.textContent = 'Z ou Y';
    elements.keyboardSelect.textContent = 'Ctrl direito';
    elements.keyboardTurbo.hidden = false;
    elements.keyboardNote.textContent = 'Um controle físico com layout padrão também pode ser usado: A, B, Select, Start e direcional seguem os botões equivalentes do controle.';
  }

  function validateNesRom(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 16) return { error: 'O arquivo selecionado não contém um cabeçalho NES válido.' };
    if (bytes[0] !== 0x4e || bytes[1] !== 0x45 || bytes[2] !== 0x53 || bytes[3] !== 0x1a) return { error: 'Este arquivo não é uma ROM NES compatível no formato iNES.' };
    if ((bytes[7] & 0x0c) === 0x08) return { error: 'Arquivos NES 2.0 ainda não são aceitos nesta versão.' };
    if ((bytes[7] & 0x03) !== 0) return { error: 'Este arquivo é destinado a uma variação de console NES que ainda não é aceita.' };
    const prgBanks = bytes[4];
    const chrBanks = bytes[5];
    const mapper = (bytes[6] >> 4) | (bytes[7] & 0xf0);
    const trainerSize = bytes[6] & 0x04 ? 512 : 0;
    const declaredSize = 16 + trainerSize + (prgBanks * 16384) + (chrBanks * 8192);
    if (prgBanks === 0 || declaredSize > MAX_NES_ROM_BYTES || declaredSize > bytes.length) return { error: 'O tamanho declarado no cabeçalho do arquivo é inválido ou incompatível com esta versão.' };
    if (!SUPPORTED_NES_MAPPERS.has(mapper)) return { error: 'Este cartucho utiliza um mapper NES que ainda não é compatível com esta versão do emulador.' };
    return { error: '', warning: '' };
  }

  function abortHomebrewLoad() {
    if (state.homebrewAbortController) {
      state.homebrewAbortController.abort();
      state.homebrewAbortController = null;
    }
  }

  function hasExpectedExtension(fileName, system) {
    if (!fileName || !system) return false;
    const lowerCaseName = fileName.toLowerCase();
    return system.extensions.some((extension) => lowerCaseName.endsWith(extension));
  }

  function getHomebrewRomUrl(game) {
    const system = getSystem(game?.system);
    if (!system || !hasExpectedExtension(game.fileName, system)) return null;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.nes$/i.test(game.fileName)) return null;
    const url = new URL(game.fileName, HOME_BREW_ROM_DIRECTORY);
    const expectedPathname = `${HOME_BREW_ROM_DIRECTORY.pathname}${game.fileName}`;
    if (url.origin !== window.location.origin || url.pathname !== expectedPathname) return null;
    return url;
  }

  function bufferToHex(buffer) { return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join(''); }

  function logHomebrewStep(stage, details) {
    console.info(`${HOME_BREW_LOG_PREFIX} ${JSON.stringify({ stage, ...details })}`);
  }

  function logHomebrewFailure(stage, details, error) {
    console.error(`${HOME_BREW_LOG_PREFIX} ${JSON.stringify({
      stage,
      ...details,
      errorName: error?.name || 'Error',
      errorMessage: error?.message || 'erro desconhecido',
    })}`, error);
  }

  async function verifyHomebrewIntegrity(romData, game) {
    if (romData.byteLength !== game.bytes) return { checked: true, matches: false, actualHash: '' };
    if (!window.crypto?.subtle || typeof window.crypto.subtle.digest !== 'function') {
      return { checked: false, matches: true, actualHash: '' };
    }
    try {
      const actualHash = bufferToHex(await window.crypto.subtle.digest('SHA-256', romData));
      return { checked: true, matches: actualHash === game.sha256, actualHash };
    } catch (error) {
      const integrityError = new Error('homebrew-integrity-error');
      integrityError.cause = error;
      throw integrityError;
    }
  }

  function getGamepads() {
    if (!navigator.getGamepads && !navigator.webkitGetGamepads) return [];
    try { return Array.from((navigator.getGamepads ? navigator.getGamepads() : navigator.webkitGetGamepads()) || []).filter(Boolean); } catch { return []; }
  }

  function updateGamepadIndicator() {
    if (!navigator.getGamepads && !navigator.webkitGetGamepads) {
      elements.gamepad.textContent = 'Controle não disponível neste navegador.';
      return [];
    }
    const pads = getGamepads();
    elements.gamepad.textContent = pads.length ? '🎮 Controle detectado' : '🎮 Nenhum controle detectado';
    return pads;
  }

  function setVirtualButton(action, source, isPressed) {
    if (!state.activeAdapter) return;
    const sources = state.virtualButtons.get(action) || new Set();
    const wasPressed = sources.size > 0;
    if (isPressed) {
      sources.add(source);
      state.virtualButtons.set(action, sources);
    } else {
      sources.delete(source);
      if (sources.size) state.virtualButtons.set(action, sources);
      else state.virtualButtons.delete(action);
    }
    const isNowPressed = sources.size > 0;
    if (state.isPaused || wasPressed === isNowPressed) return;
    if (isNowPressed) state.activeAdapter.press(action);
    else state.activeAdapter.release(action);
  }

  function releaseVirtualButtons() {
    if (state.activeAdapter && !state.isPaused) state.activeAdapter.releaseAll();
    state.virtualButtons.clear();
    state.gamepadPressed.clear();
  }

  function stopGamepadPolling() {
    if (state.gamepadFrame !== null) {
      window.cancelAnimationFrame(state.gamepadFrame);
      state.gamepadFrame = null;
    }
    releaseVirtualButtons();
  }

  function getGamepadButtons(gamepad) {
    const pressed = new Set();
    const primaryButtons = [[0, 'a'], [1, 'b']];
    [...primaryButtons, [8, 'select'], [9, 'start'], [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']].forEach(([index, action]) => {
      if (gamepad.buttons[index]?.pressed) pressed.add(action);
    });
    if (gamepad.axes[0] <= -0.5) pressed.add('left');
    if (gamepad.axes[0] >= 0.5) pressed.add('right');
    if (gamepad.axes[1] <= -0.5) pressed.add('up');
    if (gamepad.axes[1] >= 0.5) pressed.add('down');
    return pressed;
  }

  function activeAdapterUsesNativeGamepadMapping() {
    return Boolean(state.activeAdapter?.instance?.gamepad?.gamepadConfig);
  }

  function pollGamepad() {
    if (!state.activeAdapter) return;
    const pads = updateGamepadIndicator();
    const currentPressed = !activeAdapterUsesNativeGamepadMapping() && pads.length ? getGamepadButtons(pads[0]) : new Set();
    state.gamepadPressed.forEach((action) => { if (!currentPressed.has(action)) setVirtualButton(action, 'gamepad', false); });
    currentPressed.forEach((action) => { if (!state.gamepadPressed.has(action)) setVirtualButton(action, 'gamepad', true); });
    state.gamepadPressed = currentPressed;
    state.gamepadFrame = window.requestAnimationFrame(pollGamepad);
  }

  function startGamepadPolling() {
    stopGamepadPolling();
    updateGamepadIndicator();
    state.gamepadFrame = window.requestAnimationFrame(pollGamepad);
  }

  function destroyEmulator() {
    stopGamepadPolling();
    if (state.activeAdapter) {
      try { state.activeAdapter.destroy(); } catch { /* A troca de sistema continua com segurança. */ }
      state.activeAdapter = null;
    }
    state.isPaused = false;
    elements.screen.replaceChildren();
    updatePlayerControls();
  }

  function resetSelectionForSystem(systemId) {
    const system = getSystem(systemId);
    if (!system) return false;
    state.selectionId += 1;
    abortHomebrewLoad();
    destroyEmulator();
    state.romData = null;
    state.source = 'none';
    state.systemId = systemId;
    elements.input.value = '';
    elements.player.hidden = true;
    setSelectedFileName('');
    updateSystemInterface();
    updatePlayerControls();
    return true;
  }

  function selectSystem(systemId) {
    const system = getSystem(systemId);
    if (!system || systemId === state.systemId) return;
    resetSelectionForSystem(systemId);
    setStatus(`Sistema ${system.label} selecionado. Escolha um arquivo ${system.extensionLabel} compatível.`, 'default');
  }

  function showError(message) {
    abortHomebrewLoad();
    destroyEmulator();
    state.romData = null;
    state.source = 'none';
    elements.input.value = '';
    elements.player.hidden = true;
    setStatus(message, 'error');
    setSelectedFileName('');
    updatePlayerControls();
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('file-read-error'));
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }

  function prepareLoadedRom(romData, fileName, source, system, warning) {
    state.romData = romData;
    state.source = source;
    elements.player.hidden = false;
    setSelectedFileName(fileName, source);
    if (source === 'homebrew') {
      setScreenMessage('Homebrew validado. Iniciando o emulador NES…');
      setStatus(`Homebrew legal carregado e validado. Iniciando automaticamente…${warning ? ` ${warning}` : ''}`, 'loading');
    } else {
      setScreenMessage('Arquivo pronto. Clique em “Iniciar jogo” para abrir o emulador.');
      setStatus(`Arquivo ${system.label} compatível selecionado. Ele permanece apenas na memória deste navegador. Clique em “Iniciar jogo” para começar.${warning ? ` ${warning}` : ''}`, 'success');
    }
    updateGamepadIndicator();
    updatePlayerControls();
  }

  async function handleFileSelection(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const system = getSystem(state.systemId);
    if (!system) return;
    const selectionId = ++state.selectionId;
    abortHomebrewLoad();
    destroyEmulator();
    state.romData = null;
    state.source = 'user';
    elements.player.hidden = true;
    setSelectedFileName('');
    if (!hasExpectedExtension(file.name, system)) {
      showError(`Este arquivo não corresponde ao sistema selecionado. Selecione um arquivo ${system.extensionLabel} para ${system.label}.`);
      return;
    }
    if (file.size === 0 || file.size > system.maxBytes) {
      showError(`Este arquivo é grande demais ou está vazio. O limite para ${system.label} nesta versão é de ${system.maxLabel}.`);
      return;
    }
    const compatibilityError = system.getCompatibilityError();
    if (compatibilityError) { showError(compatibilityError); return; }
    setStatus('Lendo o arquivo localmente no seu navegador…', 'loading');
    try {
      const romData = await readFileAsArrayBuffer(file);
      if (selectionId !== state.selectionId || system.id !== state.systemId) return;
      const validation = system.validate(romData);
      if (validation.error) { showError(validation.error); return; }
      prepareLoadedRom(romData, file.name, 'user', system, validation.warning);
    } catch {
      if (selectionId === state.selectionId) showError(`Não foi possível ler o arquivo selecionado. Escolha outro arquivo ${system.extensionLabel} e tente novamente.`);
    }
  }

  async function loadHomebrew(gameId) {
    let stage = 'catálogo';
    const requestedId = typeof gameId === 'string' && /^[a-z0-9-]{1,64}$/i.test(gameId) ? gameId : '';
    const game = HOME_BREW_GAMES_BY_ID.get(requestedId);
    const system = getSystem(game?.system);
    if (!game || !system) {
      logHomebrewFailure(stage, { id: requestedId || '(rejeitado)' }, new Error('homebrew-not-allowed'));
      showError('O jogo gratuito solicitado não foi encontrado nesta biblioteca. Escolha um título na página de jogos legais.');
      return;
    }

    const romUrl = getHomebrewRomUrl(game);
    if (!romUrl || !window.fetch) {
      logHomebrewFailure('URL local', { id: game.id, fileName: game.fileName }, new Error('homebrew-url-error'));
      showError('Este homebrew não pôde ser preparado com segurança neste navegador. Tente escolher outro título na biblioteca.');
      return;
    }

    const context = { id: game.id, fileName: game.fileName, url: romUrl.href };
    logHomebrewStep('URL local validada', context);
    const compatibilityError = system.getCompatibilityError();
    if (compatibilityError) {
      logHomebrewFailure('compatibilidade do NES', context, new Error(compatibilityError));
      showError(compatibilityError);
      return;
    }

    resetSelectionForSystem(system.id);
    const selectionId = state.selectionId;
    state.source = 'homebrew';
    const controller = new AbortController();
    state.homebrewAbortController = controller;
    setStatus('Preparando o homebrew legal selecionado…', 'loading');

    let responseStatus = null;
    let receivedBytes = 0;
    try {
      stage = 'requisição HTTP';
      logHomebrewStep(stage, context);
      const response = await window.fetch(romUrl.href, {
        method: 'GET',
        credentials: 'same-origin',
        mode: 'same-origin',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
      });
      if (selectionId !== state.selectionId || controller.signal.aborted) return;
      responseStatus = response.status;
      const responseUrl = new URL(response.url || romUrl.href, window.location.href);
      const relativeResponsePath = responseUrl.pathname.startsWith(HOME_BREW_ROM_DIRECTORY.pathname)
        ? decodeURIComponent(responseUrl.pathname.slice(HOME_BREW_ROM_DIRECTORY.pathname.length))
        : '';
      logHomebrewStep('resposta HTTP', {
        ...context,
        status: response.status,
        redirected: response.redirected,
        finalUrl: responseUrl.href,
        declaredBytes: response.headers.get('content-length') || 'não informado',
      });
      if (!response.ok) throw new Error(response.status === 404 ? 'homebrew-not-found' : 'homebrew-request-error');
      if (responseUrl.origin !== window.location.origin || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.nes$/i.test(relativeResponsePath)) {
        throw new Error('homebrew-security-error');
      }
      const contentType = response.headers.get('content-type') || '';
      if (/text\/html/i.test(contentType)) throw new Error('homebrew-not-found');

      stage = 'leitura do ArrayBuffer';
      const romData = await response.arrayBuffer();
      if (selectionId !== state.selectionId || controller.signal.aborted) return;
      receivedBytes = romData.byteLength;
      logHomebrewStep('conteúdo recebido', { ...context, status: responseStatus, bytes: receivedBytes, contentType });

      stage = 'validação de tamanho';
      if (!receivedBytes || receivedBytes > system.maxBytes) throw new Error('homebrew-size-error');
      if (receivedBytes !== game.bytes) throw new Error('homebrew-integrity-error');

      stage = 'validação NES';
      const validation = system.validate(romData);
      if (validation.error) throw new Error('homebrew-format-error');
      logHomebrewStep(stage, { ...context, bytes: receivedBytes });

      stage = 'verificação SHA-256';
      const integrity = await verifyHomebrewIntegrity(romData, game);
      if (!integrity.matches) throw new Error('homebrew-integrity-error');
      logHomebrewStep(stage, {
        ...context,
        bytes: receivedBytes,
        hash: integrity.checked ? 'correspondente ao catálogo' : 'API indisponível; tamanho e formato verificados',
      });
      if (selectionId !== state.selectionId || controller.signal.aborted) return;

      stage = 'preparação da ROM';
      prepareLoadedRom(romData, game.title, 'homebrew', system, validation.warning);
      logHomebrewStep(stage, { ...context, bytes: receivedBytes });

      stage = 'inicialização do JSNES';
      const started = await startEmulator({ homebrewContext: { ...context, bytes: receivedBytes } });
      if (started) logHomebrewStep('jogo em execução', { ...context, bytes: receivedBytes });
    } catch (error) {
      if (selectionId === state.selectionId && !controller.signal.aborted && error?.name !== 'AbortError') {
        const messages = {
          'homebrew-not-found': 'O arquivo deste homebrew não foi encontrado no CV GAMES.',
          'homebrew-request-error': 'Não foi possível baixar este homebrew do CV GAMES. Verifique a conexão e tente novamente.',
          'homebrew-security-error': 'A resposta recebida não corresponde a um arquivo NES permitido do CV GAMES.',
          'homebrew-size-error': 'O arquivo deste homebrew tem um tamanho inválido e não foi iniciado.',
          'homebrew-format-error': 'O arquivo deste homebrew não é uma ROM NES válida ou compatível.',
          'homebrew-integrity-error': 'A verificação de integridade deste homebrew falhou. O arquivo não foi iniciado.',
        };
        const stageMessages = {
          'requisição HTTP': 'Não foi possível requisitar o arquivo local deste homebrew.',
          'leitura do ArrayBuffer': 'O navegador não conseguiu ler o conteúdo recebido deste homebrew.',
          'preparação da ROM': 'A ROM foi validada, mas não pôde ser preparada para o emulador NES.',
          'inicialização do JSNES': 'A ROM foi validada, mas o emulador NES não conseguiu iniciar.',
        };
        logHomebrewFailure(stage, { ...context, status: responseStatus, bytes: receivedBytes }, error);
        showError(messages[error?.message] || stageMessages[stage] || 'Não foi possível carregar este homebrew do CV GAMES. Tente novamente.');
      }
    } finally {
      if (state.homebrewAbortController === controller) state.homebrewAbortController = null;
    }
  }

  function handleRuntimeError() {
    const system = getSystem(state.systemId);
    destroyEmulator();
    setScreenMessage('O emulador encontrou um erro durante a execução deste arquivo.');
    setStatus(`Não foi possível executar este arquivo ${system?.label || ''} neste navegador. Tente outro arquivo compatível.`, 'error');
  }

  async function startEmulator(options) {
    const homebrewContext = options?.homebrewContext || null;
    const system = getSystem(state.systemId);
    if (!system || !state.romData) {
      const error = new Error('Nenhuma ROM NES foi preparada para iniciar.');
      if (homebrewContext) logHomebrewFailure('inicialização do JSNES', homebrewContext, error);
      setStatus(`Selecione primeiro um arquivo ${system?.extensionLabel || 'compatível'}.`, 'error');
      return false;
    }
    const compatibilityError = system.getCompatibilityError();
    if (compatibilityError) {
      if (homebrewContext) logHomebrewFailure('compatibilidade do JSNES', homebrewContext, new Error(compatibilityError));
      setStatus(compatibilityError, 'error');
      return false;
    }
    destroyEmulator();
    elements.player.hidden = false;
    setStatus('Iniciando o emulador local…', 'loading');
    let adapter = null;
    try {
      adapter = system.createAdapter({ container: elements.screen, romData: state.romData, systemId: system.id, onRuntimeError: handleRuntimeError });
      state.activeAdapter = adapter;
      await adapter.start();
      if (state.activeAdapter !== adapter) { adapter.destroy(); return false; }
      state.isPaused = false;
      setStatus('Jogo em execução localmente. Use teclado, controle ou os botões de toque.', 'success');
      startGamepadPolling();
      updatePlayerControls();
      return true;
    } catch (error) {
      if (homebrewContext) logHomebrewFailure('inicialização do JSNES', homebrewContext, error);
      if (adapter && state.activeAdapter !== adapter) return false;
      if (error?.message && /^(?:O arquivo|O núcleo|Seu navegador|Não foi possível)/.test(error.message)) {
        destroyEmulator();
        setScreenMessage('O emulador não pôde iniciar este arquivo.');
        setStatus(error.message, 'error');
      } else handleRuntimeError();
      return false;
    }
  }

  function togglePause() {
    if (!state.activeAdapter) return;
    try {
      if (state.isPaused) {
        state.activeAdapter.resume();
        state.isPaused = false;
        setStatus('Jogo retomado.', 'success');
      } else {
        releaseVirtualButtons();
        state.activeAdapter.pause();
        state.isPaused = true;
        setStatus('Jogo pausado.', 'default');
      }
      updatePlayerControls();
    } catch { handleRuntimeError(); }
  }

  function resetEmulator() {
    if (!state.activeAdapter) return;
    try {
      const wasPaused = state.isPaused;
      releaseVirtualButtons();
      state.activeAdapter.reset();
      state.isPaused = wasPaused;
      setStatus('Jogo reiniciado.', 'success');
      updatePlayerControls();
    } catch { handleRuntimeError(); }
  }

  async function toggleFullscreen() {
    if (!state.activeAdapter) return;
    if (!document.fullscreenEnabled) { setStatus('A tela cheia não é suportada por este navegador.', 'error'); return; }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await elements.screen.requestFullscreen();
      state.activeAdapter.resize?.();
    } catch { setStatus('A tela cheia não pôde ser ativada neste navegador.', 'error'); }
  }

  function bindTouchControls() {
    document.querySelectorAll('[data-touch-button]').forEach((buttonElement) => {
      const action = buttonElement.dataset.touchButton;
      if (!['up', 'down', 'left', 'right', 'a', 'b', 'select', 'start'].includes(action)) return;
      const source = `touch-${action}`;
      const release = (event) => { event.preventDefault(); setVirtualButton(action, source, false); };
      buttonElement.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        buttonElement.setPointerCapture?.(event.pointerId);
        setVirtualButton(action, source, true);
      });
      buttonElement.addEventListener('pointerup', release);
      buttonElement.addEventListener('pointercancel', release);
      buttonElement.addEventListener('lostpointercapture', release);
      buttonElement.addEventListener('pointerleave', (event) => { if (event.buttons === 0) release(event); });
    });
  }

  function init() {
    elements.input = getElement('[data-rom-input]');
    elements.fileName = getElement('[data-rom-file-name]');
    elements.status = getElement('[data-emulator-status]');
    elements.player = getElement('[data-emulator-player]');
    elements.screen = getElement('[data-emulator-screen]');
    elements.start = getElement('[data-emulator-start]');
    elements.pause = getElement('[data-emulator-pause]');
    elements.reset = getElement('[data-emulator-reset]');
    elements.fullscreen = getElement('[data-emulator-fullscreen]');
    elements.change = getElement('[data-emulator-change]');
    elements.gamepad = getElement('[data-gamepad-status]');
    elements.filePickerLabel = getElement('[data-rom-picker-label]');
    elements.romHelp = getElement('[data-rom-help]');
    elements.playerTitle = getElement('[data-emulator-player-title]');
    elements.touchLayout = getElement('[data-touch-layout]');
    elements.keyboardB = getElement('[data-keyboard-b]');
    elements.keyboardSelect = getElement('[data-keyboard-select]');
    elements.keyboardTurbo = getElement('[data-keyboard-turbo]');
    elements.keyboardNote = getElement('[data-keyboard-note]');
    elements.systemOptions = Array.from(document.querySelectorAll('[data-system-option]'));
    const required = [elements.input, elements.fileName, elements.status, elements.player, elements.screen, elements.start, elements.pause, elements.reset, elements.fullscreen, elements.change, elements.gamepad, elements.filePickerLabel, elements.romHelp, elements.playerTitle, elements.touchLayout, elements.keyboardB, elements.keyboardSelect, elements.keyboardTurbo, elements.keyboardNote];
    if (required.some((element) => !element)) return;
    elements.input.addEventListener('change', handleFileSelection);
    elements.start.addEventListener('click', startEmulator);
    elements.pause.addEventListener('click', togglePause);
    elements.reset.addEventListener('click', resetEmulator);
    elements.fullscreen.addEventListener('click', toggleFullscreen);
    elements.change.addEventListener('click', () => elements.input.click());
    elements.systemOptions.forEach((option) => option.addEventListener('click', () => selectSystem(option.dataset.systemOption)));
    document.addEventListener('fullscreenchange', () => {
      elements.fullscreen.textContent = document.fullscreenElement ? '↙ Sair da tela cheia' : '⛶ Tela cheia';
      state.activeAdapter?.resize?.();
    });
    window.addEventListener('gamepadconnected', updateGamepadIndicator);
    window.addEventListener('gamepaddisconnected', updateGamepadIndicator);
    window.addEventListener('blur', releaseVirtualButtons);
    window.addEventListener('beforeunload', () => { abortHomebrewLoad(); destroyEmulator(); }, { once: true });
    bindTouchControls();
    updateSystemInterface();
    updateGamepadIndicator();
    updatePlayerControls();
    const requestedHomebrew = new URLSearchParams(window.location.search).get('homebrew');
    if (requestedHomebrew !== null) loadHomebrew(requestedHomebrew);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
