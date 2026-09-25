(function () {
  'use strict';

  const GAME_BOY_WIDTH = 160;
  const GAME_BOY_HEIGHT = 144;
  const GAME_BOY_TICKS_PER_SECOND = 4194304;
  const GAME_BOY_EVENT_NEW_FRAME = 1;
  const GAME_BOY_EVENT_AUDIO_BUFFER_FULL = 2;
  const GAME_BOY_EVENT_UNTIL_TICKS = 4;
  const GAME_BOY_MAX_UPDATE_SECONDS = 5 / 60;
  const GAME_BOY_AUDIO_FRAMES = 4096;
  const GAME_BOY_COLOR_CURVE = 2;
  const GAME_BOY_WASM_DIRECTORY = new URL('lib/binjgb-c60e138/', document.baseURI);
  const NES_BUTTONS = Object.freeze({
    up: 'BUTTON_UP',
    down: 'BUTTON_DOWN',
    left: 'BUTTON_LEFT',
    right: 'BUTTON_RIGHT',
    a: 'BUTTON_A',
    b: 'BUTTON_B',
    select: 'BUTTON_SELECT',
    start: 'BUTTON_START',
  });
  const GAME_BOY_BUTTONS = Object.freeze({
    up: '_set_joyp_up',
    down: '_set_joyp_down',
    left: '_set_joyp_left',
    right: '_set_joyp_right',
    a: '_set_joyp_A',
    b: '_set_joyp_B',
    select: '_set_joyp_select',
    start: '_set_joyp_start',
  });

  let gameBoyModulePromise = null;

  function getAudioContextConstructor() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function getGameBoyModule() {
    if (!window.Binjgb || typeof window.Binjgb !== 'function') {
      return Promise.reject(new Error('O núcleo Game Boy não foi carregado.'));
    }

    if (!gameBoyModulePromise) {
      gameBoyModulePromise = window.Binjgb({
        locateFile(fileName) {
          return new URL(fileName, GAME_BOY_WASM_DIRECTORY).href;
        },
      });
    }
    return gameBoyModulePromise;
  }

  class NESAdapter {
    constructor(options) {
      this.container = options.container;
      this.romData = options.romData;
      this.onRuntimeError = options.onRuntimeError;
      this.instance = null;
      this.destroyed = false;
    }

    static getCompatibilityError() {
      const canvas = document.createElement('canvas');
      if (!window.jsnes || typeof window.jsnes.Browser !== 'function') {
        return 'O emulador NES não foi carregado. Atualize a página e tente novamente.';
      }
      if (!window.FileReader || !window.ArrayBuffer) {
        return 'Seu navegador não oferece suporte ao carregamento local de arquivos necessário para este emulador.';
      }
      if (!canvas.getContext || !canvas.getContext('2d')) {
        return 'Seu navegador não oferece o recurso de Canvas necessário para exibir o jogo.';
      }
      if (!window.AudioContext || !window.AudioWorkletNode) {
        return 'Seu navegador não oferece os recursos de áudio necessários para esta versão do emulador NES.';
      }
      return '';
    }

    start() {
      const compatibilityError = NESAdapter.getCompatibilityError();
      if (compatibilityError) throw new Error(compatibilityError);

      this.instance = new window.jsnes.Browser({
        container: this.container,
        romData: this.romData,
        onError: (error) => {
          if (typeof this.onRuntimeError === 'function') this.onRuntimeError(error);
        },
      });
    }

    pause() {
      this.instance?.stop();
    }

    resume() {
      this.instance?.start();
    }

    reset() {
      if (!this.instance?.nes) throw new Error('A instância NES não está disponível.');
      this.instance.nes.reloadROM();
    }

    press(action) {
      const buttonName = NES_BUTTONS[action];
      const button = buttonName && window.jsnes?.Controller?.[buttonName];
      if (typeof button === 'number') this.instance?.nes?.buttonDown(1, button);
    }

    release(action) {
      const buttonName = NES_BUTTONS[action];
      const button = buttonName && window.jsnes?.Controller?.[buttonName];
      if (typeof button === 'number') this.instance?.nes?.buttonUp(1, button);
    }

    releaseAll() {
      Object.keys(NES_BUTTONS).forEach((action) => this.release(action));
    }

    resize() {
      this.instance?.fitInParent?.();
    }

    destroy() {
      this.destroyed = true;
      try {
        this.releaseAll();
        this.instance?.destroy?.();
      } finally {
        this.instance = null;
      }
    }
  }

  class GameBoyAdapter {
    constructor(options) {
      this.container = options.container;
      this.romData = options.romData.slice(0);
      this.systemId = options.systemId;
      this.onRuntimeError = options.onRuntimeError;
      this.module = null;
      this.emulator = 0;
      this.romPointer = 0;
      this.canvas = null;
      this.context = null;
      this.imageData = null;
      this.frameBuffer = null;
      this.audioContext = null;
      this.audioBuffer = null;
      this.audioSources = new Set();
      this.nextAudioTime = 0;
      this.frameId = null;
      this.lastTimestamp = 0;
      this.leftoverTicks = 0;
      this.running = false;
      this.destroyed = false;
      this.failed = false;
    }

    static getCompatibilityError() {
      const canvas = document.createElement('canvas');
      if (!window.Binjgb || typeof window.Binjgb !== 'function') {
        return 'O núcleo Game Boy não foi carregado. Atualize a página e tente novamente.';
      }
      if (!window.FileReader || !window.ArrayBuffer || !window.Uint8Array) {
        return 'Seu navegador não oferece suporte ao carregamento local de arquivos necessário para este emulador.';
      }
      if (!window.WebAssembly) {
        return 'Seu navegador não oferece WebAssembly, necessário para executar Game Boy e Game Boy Color.';
      }
      if (!canvas.getContext || !canvas.getContext('2d')) {
        return 'Seu navegador não oferece o recurso de Canvas necessário para exibir o jogo.';
      }
      if (!getAudioContextConstructor()) {
        return 'Seu navegador não oferece os recursos de áudio necessários para Game Boy e Game Boy Color.';
      }
      return '';
    }

    async start() {
      const compatibilityError = GameBoyAdapter.getCompatibilityError();
      if (compatibilityError) throw new Error(compatibilityError);

      this.module = await getGameBoyModule();
      if (this.destroyed) return;

      this.createCanvas();
      this.createAudioContext();
      this.createCore();
      this.running = true;
      this.requestFrame();
    }

    createCanvas() {
      const canvas = document.createElement('canvas');
      canvas.width = GAME_BOY_WIDTH;
      canvas.height = GAME_BOY_HEIGHT;
      canvas.className = 'emulator-canvas emulator-canvas--gameboy';
      canvas.setAttribute('aria-label', this.systemId === 'gbc' ? 'Tela do emulador Game Boy Color' : 'Tela do emulador Game Boy');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Não foi possível preparar a tela do Game Boy neste navegador.');
      context.imageSmoothingEnabled = false;

      this.canvas = canvas;
      this.context = context;
      this.imageData = context.createImageData(GAME_BOY_WIDTH, GAME_BOY_HEIGHT);
      this.container.replaceChildren(canvas);
    }

    createAudioContext() {
      const AudioContextConstructor = getAudioContextConstructor();
      if (!AudioContextConstructor) throw new Error('O áudio deste emulador não é compatível com o navegador.');
      this.audioContext = new AudioContextConstructor();
      this.nextAudioTime = 0;
      this.audioContext.resume?.().catch(() => {
        // O botão Iniciar permanece disponível para uma nova interação do usuário.
      });
    }

    createCore() {
      const module = this.module;
      const romLength = (this.romData.byteLength + 0x7fff) & ~0x7fff;
      if (!romLength) throw new Error('O arquivo Game Boy está vazio.');

      this.romPointer = module._malloc(romLength);
      if (!this.romPointer) throw new Error('Não foi possível reservar memória para este arquivo.');
      new Uint8Array(module.HEAPU8.buffer, this.romPointer, romLength)
        .fill(0)
        .set(new Uint8Array(this.romData));

      const sampleRate = this.audioContext?.sampleRate || 44100;
      this.emulator = module._emulator_new_simple(
        this.romPointer,
        romLength,
        sampleRate,
        GAME_BOY_AUDIO_FRAMES,
        GAME_BOY_COLOR_CURVE,
      );
      if (!this.emulator) throw new Error('O arquivo não pôde ser iniciado pelo núcleo Game Boy.');

      const framePointer = module._get_frame_buffer_ptr(this.emulator);
      const frameSize = module._get_frame_buffer_size(this.emulator);
      if (!framePointer || frameSize < GAME_BOY_WIDTH * GAME_BOY_HEIGHT * 4) {
        throw new Error('A tela do Game Boy não pôde ser preparada.');
      }
      this.frameBuffer = new Uint8Array(module.HEAPU8.buffer, framePointer, frameSize);

      const audioPointer = module._get_audio_buffer_ptr(this.emulator);
      const audioSize = module._get_audio_buffer_capacity(this.emulator);
      this.audioBuffer = audioPointer && audioSize
        ? new Uint8Array(module.HEAPU8.buffer, audioPointer, audioSize)
        : null;
    }

    requestFrame() {
      if (!this.running || this.destroyed || this.frameId !== null) return;
      this.frameId = window.requestAnimationFrame((timestamp) => {
        this.frameId = null;
        this.runFrame(timestamp);
      });
    }

    runFrame(timestamp) {
      if (!this.running || this.destroyed || !this.emulator) return;
      try {
        const currentSeconds = timestamp / 1000;
        const deltaSeconds = Math.max(currentSeconds - (this.lastTimestamp || currentSeconds), 0);
        const targetTicks = this.module._emulator_get_ticks_f64(this.emulator)
          + (Math.min(deltaSeconds, GAME_BOY_MAX_UPDATE_SECONDS) * GAME_BOY_TICKS_PER_SECOND)
          - this.leftoverTicks;
        let event = 0;
        let frameUpdated = false;
        let safetyCounter = 0;

        do {
          event = this.module._emulator_run_until_f64(this.emulator, targetTicks);
          if (event & GAME_BOY_EVENT_NEW_FRAME) frameUpdated = true;
          if (event & GAME_BOY_EVENT_AUDIO_BUFFER_FULL) this.pushAudio();
          safetyCounter += 1;
        } while (!(event & GAME_BOY_EVENT_UNTIL_TICKS) && safetyCounter < 10000);

        if (safetyCounter >= 10000) throw new Error('O núcleo Game Boy não respondeu como esperado.');
        this.leftoverTicks = (this.module._emulator_get_ticks_f64(this.emulator) - targetTicks) | 0;
        this.lastTimestamp = currentSeconds;
        if (frameUpdated) this.renderFrame();
        this.requestFrame();
      } catch (error) {
        this.handleFailure(error);
      }
    }

    renderFrame() {
      if (!this.context || !this.imageData || !this.frameBuffer) return;
      this.imageData.data.set(this.frameBuffer.subarray(0, this.imageData.data.length));
      this.context.putImageData(this.imageData, 0, 0);
    }

    pushAudio() {
      if (!this.audioContext || !this.audioBuffer || this.audioContext.state !== 'running') return;
      const audioFrames = Math.floor(this.audioBuffer.length / 2);
      if (!audioFrames) return;

      const buffer = this.audioContext.createBuffer(2, audioFrames, this.audioContext.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let index = 0; index < audioFrames; index += 1) {
        left[index] = (this.audioBuffer[index * 2] - 128) / 128;
        right[index] = (this.audioBuffer[(index * 2) + 1] - 128) / 128;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.onended = () => this.audioSources.delete(source);
      const now = this.audioContext.currentTime;
      if (!this.nextAudioTime || this.nextAudioTime < now) this.nextAudioTime = now + 0.04;
      source.start(this.nextAudioTime);
      this.nextAudioTime += buffer.duration;
      this.audioSources.add(source);
    }

    stopScheduledAudio() {
      this.audioSources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // A fonte pode já ter terminado naturalmente.
        }
        try {
          source.disconnect();
        } catch {
          // A desconexão é apenas limpeza preventiva.
        }
      });
      this.audioSources.clear();
      this.nextAudioTime = 0;
    }

    pause() {
      if (!this.running) return;
      this.running = false;
      if (this.frameId !== null) {
        window.cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      this.stopScheduledAudio();
      this.audioContext?.suspend?.().catch(() => {});
    }

    resume() {
      if (this.destroyed || !this.emulator || this.running) return;
      this.audioContext?.resume?.().catch(() => {});
      this.running = true;
      this.lastTimestamp = 0;
      this.leftoverTicks = 0;
      this.requestFrame();
    }

    reset() {
      const shouldResume = this.running;
      this.pause();
      this.releaseAll();
      this.disposeCore();
      this.createCore();
      if (shouldResume) this.resume();
    }

    press(action) {
      const methodName = GAME_BOY_BUTTONS[action];
      if (methodName && this.emulator && typeof this.module?.[methodName] === 'function') {
        this.module[methodName](this.emulator, true);
      }
    }

    release(action) {
      const methodName = GAME_BOY_BUTTONS[action];
      if (methodName && this.emulator && typeof this.module?.[methodName] === 'function') {
        this.module[methodName](this.emulator, false);
      }
    }

    releaseAll() {
      Object.keys(GAME_BOY_BUTTONS).forEach((action) => this.release(action));
    }

    resize() {
      // O canvas permanece na resolução nativa; a escala responsiva é aplicada pelo CSS.
    }

    disposeCore() {
      if (this.emulator && this.module) {
        try {
          this.module._emulator_delete(this.emulator);
        } catch {
          // A limpeza continua para garantir que o buffer antigo não permaneça ativo.
        }
      }
      if (this.romPointer && this.module) {
        try {
          this.module._free(this.romPointer);
        } catch {
          // A página ainda pode trocar de sistema com segurança.
        }
      }
      this.emulator = 0;
      this.romPointer = 0;
      this.frameBuffer = null;
      this.audioBuffer = null;
    }

    destroy() {
      this.destroyed = true;
      this.pause();
      this.releaseAll();
      this.disposeCore();
      this.stopScheduledAudio();
      this.audioContext?.close?.().catch(() => {});
      this.audioContext = null;
      this.canvas = null;
      this.context = null;
      this.imageData = null;
    }

    handleFailure(error) {
      if (this.failed || this.destroyed) return;
      this.failed = true;
      this.pause();
      if (typeof this.onRuntimeError === 'function') this.onRuntimeError(error);
    }
  }

  window.CVGamesEmulatorAdapters = Object.freeze({
    NESAdapter,
    GameBoyAdapter,
    getGameBoyModule,
  });
}());
