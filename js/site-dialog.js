(function () {
  'use strict';

  let layer;
  let activeResolve = null;
  let returnFocus = null;

  function buildDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'cv-site-modal-layer';
    overlay.hidden = true;
    overlay.innerHTML = '<section class="cv-site-modal" role="alertdialog" aria-modal="true" aria-labelledby="cv-site-modal-title" aria-describedby="cv-site-modal-message" tabindex="-1"><div class="cv-site-modal-content"><span class="cv-site-modal-icon" data-modal-icon aria-hidden="true">?</span><div><p class="cv-site-modal-brand">CV GAMES</p><h2 id="cv-site-modal-title"></h2><p id="cv-site-modal-message" class="cv-site-modal-message"></p></div></div><div class="cv-site-modal-actions"><button class="cv-site-modal-button cv-site-modal-cancel" type="button" data-modal-cancel>Cancelar</button><button class="cv-site-modal-button cv-site-modal-confirm" type="button" data-modal-confirm>Confirmar</button></div></section>';
    const panel = overlay.querySelector('.cv-site-modal');
    overlay.addEventListener('click',(event) => {
      if (event.target === overlay) finish(false);
    });
    panel.addEventListener('keydown',(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      } else if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('button:not([disabled])')];
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    overlay.querySelector('[data-modal-cancel]').addEventListener('click',() => finish(false));
    overlay.querySelector('[data-modal-confirm]').addEventListener('click',() => finish(true));
    return overlay;
  }

  function getLayer() {
    if (!layer) layer = buildDialog();
    return layer;
  }

  function finish(confirmed) {
    if (!activeResolve) return;
    const resolve = activeResolve;
    activeResolve = null;
    layer.hidden = true;
    layer.querySelector('.cv-site-modal').classList.remove('is-danger');
    document.body.classList.remove('cv-site-modal-open');
    const target = returnFocus;
    returnFocus = null;
    resolve(confirmed);
    if (target?.isConnected) target.focus({ preventScroll:true });
  }

  function confirm(options = {}) {
    if (activeResolve) return Promise.resolve(false);
    const settings = typeof options === 'string' ? { message:options } : options;
    const overlay = getLayer();
    const panel = overlay.querySelector('.cv-site-modal');
    const fullscreenHost = document.fullscreenElement
      || document.webkitFullscreenElement
      || document.querySelector('.is-fullscreen-fallback');
    const host = fullscreenHost || document.body;
    if (overlay.parentElement !== host) host.append(overlay);
    panel.classList.toggle('is-danger',settings.tone === 'danger');
    overlay.querySelector('#cv-site-modal-title').textContent = settings.title || 'Confirmar ação';
    overlay.querySelector('#cv-site-modal-message').textContent = settings.message || 'Deseja continuar?';
    overlay.querySelector('[data-modal-icon]').textContent = settings.icon || (settings.tone === 'danger' ? '!' : '?');
    overlay.querySelector('[data-modal-cancel]').textContent = settings.cancelText || 'Cancelar';
    overlay.querySelector('[data-modal-confirm]').textContent = settings.confirmText || 'Confirmar';
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay.hidden = false;
    document.body.classList.add('cv-site-modal-open');
    requestAnimationFrame(() => overlay.querySelector('[data-modal-cancel]').focus({ preventScroll:true }));
    return new Promise((resolve) => { activeResolve = resolve; });
  }

  window.CV_GAMES_DIALOG = Object.freeze({ confirm });
})();
