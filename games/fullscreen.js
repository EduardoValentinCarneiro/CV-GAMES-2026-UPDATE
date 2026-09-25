(function () {
  'use strict';

  const activeFallbackClass = 'has-fullscreen-fallback';
  const fallbackClass = 'is-fullscreen-fallback';

  function isFullscreen(target) {
    return document.fullscreenElement === target
      || document.webkitFullscreenElement === target
      || target.classList.contains(fallbackClass);
  }

  function syncButton(button, target) {
    const active = isFullscreen(target);
    const label = active ? '⛶ Sair da tela cheia' : '⛶ Tela cheia';
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = label;
  }

  function useFallback(target) {
    target.classList.add(fallbackClass);
    document.body.classList.add(activeFallbackClass);
    document.dispatchEvent(new Event('cv-games-fullscreenchange'));
  }

  function clearFallback(target) {
    target.classList.remove(fallbackClass);
    if (!document.querySelector(`.${fallbackClass}`)) document.body.classList.remove(activeFallbackClass);
    document.dispatchEvent(new Event('cv-games-fullscreenchange'));
  }

  async function enterFullscreen(target) {
    try {
      if (target.requestFullscreen) await target.requestFullscreen();
      else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
      else useFallback(target);
    } catch {
      useFallback(target);
    }
  }

  async function exitFullscreen(target) {
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
      clearFallback(target);
    } catch {
      clearFallback(target);
    }
  }

  document.querySelectorAll('[data-fullscreen-button]').forEach((button) => {
    const target = document.querySelector(button.dataset.fullscreenButton);
    if (!target) return;
    syncButton(button, target);
    button.addEventListener('click', async () => {
      if (isFullscreen(target)) await exitFullscreen(target);
      else await enterFullscreen(target);
      syncButton(button, target);
    });
    const update = () => syncButton(button, target);
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll(`.${fallbackClass}`).forEach((target) => {
      clearFallback(target);
      const button = document.querySelector(`[data-fullscreen-button="#${target.id}"]`);
      if (button) syncButton(button, target);
    });
  });

  const notifyFullscreenChange = () => document.dispatchEvent(new Event('cv-games-fullscreenchange'));
  document.addEventListener('fullscreenchange', notifyFullscreenChange);
  document.addEventListener('webkitfullscreenchange', notifyFullscreenChange);
})();
