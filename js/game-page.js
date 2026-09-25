(function () {
  'use strict';

  const catalog = Array.isArray(window.CV_GAMES_CATALOG) ? window.CV_GAMES_CATALOG : [];
  const stats = window.CV_GAMES_STATS;
  const favoriteStorageKey = 'cv-games-favorites';
  const themeStorageKey = 'cv-games-theme';
  const pageId = document.body.dataset.gameId;
  const game = catalog.find((item) => item.id === pageId);

  const getFavorites = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(favoriteStorageKey) || '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  };

  let favorites = getFavorites();

  const notifyFavoritesChange = () => {
    window.dispatchEvent(new Event('cv-games-favorites-change'));
  };

  const saveFavorites = () => {
    try {
      localStorage.setItem(favoriteStorageKey, JSON.stringify([...favorites]));
      notifyFavoritesChange();
    } catch {
      // A página continua funcional se o navegador bloquear armazenamento local.
    }
  };

  const stars = (rating) => `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;

  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // O tema aplicado permanece válido durante a visita atual.
    }

    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      const isLight = theme === 'light';
      toggle.textContent = isLight ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
      toggle.setAttribute('title', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
    }
  };

  const renderHeader = () => {
    const header = document.getElementById('game-page-header');
    if (!header) return;
    header.className = 'site-header';
    header.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="index.html" aria-label="CV GAMES — Início">
          <img src="img/onconee.png" alt="">
          <span>CV GAMES</span>
        </a>
        <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu-principal" aria-label="Abrir menu">☰</button>
        <nav class="primary-nav" id="menu-principal" data-primary-nav aria-label="Navegação principal">
          <a href="index.html">Início</a>
          <a href="index.html#jogos">Jogos</a>
          <a href="baixar.html">Downloads</a>
          <a href="central.html" aria-label="Central Gamer">Central</a>
          <a href="index.html?favoritos=1#jogos">Favoritos</a>
          <a href="perfil.html">Perfil</a>
        </nav>
        <div class="header-actions">
          <a class="favorite-button" href="index.html?favoritos=1#jogos" aria-label="Ver favoritos" title="Ver favoritos"><span class="favorite-icon" aria-hidden="true">♥</span><span class="favorite-count" data-favorite-count>0</span><span>Favoritos</span></a>
          <button class="icon-button" type="button" data-theme-toggle aria-label="Ativar modo claro" title="Ativar modo claro">🌙</button>
        </div>
      </div>
    `;
  };

  const renderFooter = () => {
    const footer = document.getElementById('game-page-footer');
    if (!footer) return;
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div><p><strong>CV GAMES © 2026</strong></p><p>Jogos online e downloads</p></div>
        <nav class="footer-nav" aria-label="Navegação do rodapé"><a href="index.html">Início</a><a href="index.html#jogos">Jogos</a><a href="baixar.html">Downloads</a><a href="central.html">Central Gamer</a><a href="sobre.html">Sobre</a><a href="contato.html">Contato</a><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos</a><a href="perfil.html">Perfil</a></nav>
      </div>
    `;
  };

  const renderHero = () => {
    const intro = document.getElementById('game-intro');
    if (!intro || !game) return;
    const localStats = typeof stats?.getGameStats === 'function'
      ? stats.getGameStats(game.id)
      : { visits: 0 };
    const localVisits = Number(localStats.visits) || 0;
    const localAccessText = localVisits === 1 ? 'vez' : 'vezes';
    intro.innerHTML = `
      <a class="game-back" href="index.html#jogos">← Voltar para Jogos</a>
      <section class="game-hero" aria-labelledby="game-title">
        <div class="game-cover" data-game-cover>
          <img src="${game.image}" alt="Capa de ${game.title}">
        </div>
        <div>
          <p class="eyebrow">🎮 ${game.type}</p>
          <h1 id="game-title">${game.title}</h1>
          <p class="game-description">${game.description || 'Jogo disponível no catálogo online do CV GAMES.'}</p>
          <div class="game-badges">
            <span class="game-badge">🏷️ ${game.category}</span>
            <span class="game-badge">🎮 ${game.type}</span>
            ${game.pcFraco ? '<span class="game-badge is-low-spec">🟢 PC Fraco</span>' : ''}
            ${game.multiplayer ? '<span class="game-badge">👥 Multiplayer</span>' : ''}
          </div>
          <div class="game-rating" aria-label="Avaliação visual: ${game.rating} de 5 estrelas">${stars(game.rating)}<small>${game.rating}/5 visual</small></div>
          ${localVisits > 0 ? `<p class="game-local-stat">🎮 Você abriu este jogo ${localVisits} ${localAccessText} neste dispositivo.</p>` : ''}
          <div class="game-actions">
            <a class="button button-primary" href="#jogar">▶ JOGAR AGORA</a>
            <button class="game-favorite-button" type="button" data-game-favorite aria-pressed="false">♡ Favoritar</button>
          </div>
        </div>
      </section>
    `;

    const coverImage = intro.querySelector('[data-game-cover] img');
    coverImage.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'game-cover-fallback';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', `Capa indisponível de ${game.title}`);
      fallback.textContent = game.fallback;
      coverImage.replaceWith(fallback);
    }, { once: true });
  };

  const relatedGames = () => catalog
    .filter((item) => item.id !== game.id)
    .map((item) => ({
      item,
      score: (item.categoryKey === game.categoryKey ? 4 : 0)
        + (item.pcFraco === game.pcFraco ? 1 : 0)
        + (item.multiplayer === game.multiplayer ? 1 : 0)
        + (item.popular ? 1 : 0)
    }))
    .sort((a, b) => b.score - a.score || b.item.rating - a.item.rating)
    .slice(0, 4)
    .map(({ item }) => item);

  const renderDetails = () => {
    const details = document.getElementById('game-details');
    if (!details || !game) return;
    const info = [
      ['Categoria', game.category],
      ['Plataforma', game.platform || 'Navegador'],
      ['Tipo', game.type],
      ['Multiplayer', game.multiplayer ? 'Sim' : 'Não informado'],
      ['PC Fraco', game.pcFraco ? 'Indicado' : 'Não informado'],
      ['Avaliação', `${game.rating}/5 visual`]
    ];

    details.innerHTML = `
      <section class="game-section" aria-labelledby="sobre-title">
        <div class="game-section-heading"><h2 id="sobre-title">Sobre o jogo</h2></div>
        <div class="game-text-panel"><p>${game.description || 'Jogo disponível no catálogo online do CV GAMES.'}</p></div>
      </section>
      <section class="game-section" aria-labelledby="informacoes-title">
        <div class="game-section-heading"><h2 id="informacoes-title">Informações</h2></div>
        <div class="game-information-grid">${info.map(([label, value]) => `<div class="info-item"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
      </section>
      <section class="game-section" aria-labelledby="controles-title">
        <div class="game-section-heading"><h2 id="controles-title">🎮 Como jogar</h2></div>
        <div class="game-text-panel"><p>${game.controls || 'Os controles podem variar de acordo com o jogo.'}</p></div>
      </section>
      <section class="game-section" aria-labelledby="relacionados-title">
        <div class="game-section-heading"><h2 id="relacionados-title">🎮 Você também pode gostar</h2><p>Sugestões baseadas em categoria e características do catálogo.</p></div>
        <div class="related-grid">${relatedGames().map((item) => `<a class="related-card" href="${item.href}" data-related-game-id="${item.id}"><img src="${item.image}" alt="Capa de ${item.title}" loading="lazy"><div><strong>${item.title}</strong><span>${item.category}${item.exclusivo === true ? ' · ⭐ Exclusivo CV GAMES' : ''}</span></div></a>`).join('')}</div>
      </section>
      <div class="ad-slot ad-slot--game-page" data-ad-slot="game-after-details" aria-hidden="true"></div>
    `;
  };

  const refreshFavoriteInterface = () => {
    const isFavorite = favorites.has(game.id);
    document.querySelectorAll('[data-game-favorite]').forEach((button) => {
      button.setAttribute('aria-pressed', String(isFavorite));
      button.textContent = isFavorite ? '♥ Favoritado' : '♡ Favoritar';
    });
    const count = document.querySelector('[data-favorite-count]');
    if (count) count.textContent = String(favorites.size);
  };

  const prepareGameFrame = () => {
    const iframe = document.querySelector('[data-game-iframe]');
    const loader = document.querySelector('[data-game-loading]');
    const fullscreen = document.querySelector('[data-game-fullscreen]');
    if (!iframe) return;

    iframe.title = game.title;
    iframe.addEventListener('load', () => { if (loader) loader.hidden = true; }, { once: true });
    if (fullscreen) {
      fullscreen.addEventListener('click', () => {
        if (iframe.requestFullscreen) iframe.requestFullscreen();
        else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
        else if (iframe.msRequestFullscreen) iframe.msRequestFullscreen();
      });
    }
  };

  const prepareMenu = () => {
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
  };

  const init = () => {
    if (!game) return;
    if (typeof stats?.registerAccess === 'function') stats.registerAccess(game.id);
    renderHeader();
    renderFooter();
    renderHero();
    renderDetails();
    prepareGameFrame();
    prepareMenu();
    refreshFavoriteInterface();

    document.addEventListener('click', (event) => {
      const relatedLink = event.target.closest('[data-related-game-id]');
      if (relatedLink) {
        if (typeof stats?.registerAccess === 'function'
          && typeof stats?.isExternalDestination === 'function'
          && stats.isExternalDestination(relatedLink.href)) {
          stats.registerAccess(relatedLink.dataset.relatedGameId);
        }
        return;
      }

      if (!event.target.closest('[data-game-favorite]')) return;
      if (favorites.has(game.id)) favorites.delete(game.id);
      else favorites.add(game.id);
      saveFavorites();
      refreshFavoriteInterface();
    });

    const themeButton = document.querySelector('[data-theme-toggle]');
    setTheme(document.documentElement.dataset.theme || 'dark');
    themeButton?.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
