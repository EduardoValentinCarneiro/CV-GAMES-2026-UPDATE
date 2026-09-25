(function () {
  'use strict';

  const themeStorageKey = 'cv-games-theme';

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // A preferência permanece aplicada durante a visita atual.
    }

    const toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;
    const isLight = theme === 'light';
    toggle.textContent = isLight ? '☀️' : '🌙';
    toggle.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
    toggle.setAttribute('title', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
  }

  function prepareMenu() {
    const menuButton = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-primary-nav]');
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

  function createExclusiveCard(game) {
    const link = document.createElement('a');
    link.className = 'exclusive-game-card';
    link.href = game.href;

    const image = document.createElement('img');
    image.className = 'exclusive-game-cover';
    image.src = game.image;
    image.alt = `Capa de ${game.title}`;
    image.loading = 'lazy';

    const copy = document.createElement('span');
    copy.className = 'exclusive-game-copy';
    const title = document.createElement('strong');
    title.textContent = game.title;
    const description = document.createElement('span');
    description.textContent = game.description || 'Jogo exclusivo do CV GAMES.';
    copy.append(title, description);
    link.append(image, copy);

    image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'exclusive-game-cover';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', `Capa indisponível de ${game.title}`);
      fallback.textContent = game.fallback || '🎮';
      image.replaceWith(fallback);
    }, { once: true });

    return link;
  }

  function renderExclusiveGames() {
    const container = document.querySelector('[data-exclusive-games]');
    const catalog = Array.isArray(window.CV_GAMES_CATALOG) ? window.CV_GAMES_CATALOG : [];
    if (!container || !catalog.length) return;

    const exclusives = catalog.filter((game) => game.exclusivo === true);
    if (!exclusives.length) return;
    const fragment = document.createDocumentFragment();
    exclusives.forEach((game) => fragment.appendChild(createExclusiveCard(game)));
    container.replaceChildren(fragment);
  }

  function init() {
    setTheme(document.documentElement.dataset.theme || 'dark');
    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    prepareMenu();
    renderExclusiveGames();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
