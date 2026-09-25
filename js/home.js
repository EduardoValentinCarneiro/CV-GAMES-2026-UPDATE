(function () {
  'use strict';

  const catalog = Array.isArray(window.CV_GAMES_CATALOG) ? window.CV_GAMES_CATALOG : [];
  const stats = window.CV_GAMES_STATS;
  const favoriteStorageKey = 'cv-games-favorites';
  const themeStorageKey = 'cv-games-theme';
  const filters = { query: '', category: 'todos', favoritesOnly: false };

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
      // O portal continua utilizável se o navegador bloquear armazenamento local.
    }
  };

  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

  const ratingStars = (rating) => `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;

  const createCard = (game, options = {}) => {
    const isFavorite = favorites.has(game.id);
    const localStats = options.showLocalStats && typeof stats?.getGameStats === 'function'
      ? stats.getGameStats(game.id)
      : { visits: 0 };
    const localVisits = Number(localStats.visits) || 0;
    const localStatsLabel = localVisits === 1 ? 'acesso neste dispositivo' : 'acessos neste dispositivo';
    const card = document.createElement('article');
    card.className = 'game-card';
    card.dataset.gameId = game.id;
    card.dataset.category = game.categoryKey;
    card.innerHTML = `
      <div class="card-cover">
        <img src="${game.image}" alt="Capa de ${game.title}" loading="lazy">
        <span class="type-badge">${game.type}</span>
        ${game.exclusivo === true ? '<span class="exclusive-badge">⭐ Exclusivo CV GAMES</span>' : ''}
        <button class="card-favorite" type="button" data-favorite-id="${game.id}" aria-label="${isFavorite ? 'Remover' : 'Adicionar'} ${game.title} ${isFavorite ? 'dos' : 'aos'} favoritos" aria-pressed="${isFavorite}">${isFavorite ? '♥' : '♡'}</button>
      </div>
      <div class="card-body">
        <h3>${game.title}</h3>
        <p class="card-meta">${game.category}</p>
        <div class="stars" aria-label="Avaliação visual: ${game.rating} de 5 estrelas">${ratingStars(game.rating)}</div>
        ${localVisits > 0 ? `<p class="card-local-stats">🎮 ${localVisits} ${localStatsLabel}</p>` : ''}
        <a class="button button-primary" href="${game.href}" data-play-game-id="${game.id}">Jogar</a>
      </div>
    `;

    const image = card.querySelector('img');
    image.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'cover-fallback';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', `Capa indisponível de ${game.title}`);
      fallback.textContent = game.fallback;
      image.replaceWith(fallback);
    }, { once: true });

    return card;
  };

  const createEmptyState = () => {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <span aria-hidden="true">😕</span>
      <div>
        <strong>Nenhum jogo encontrado</strong>
        <p>Tente pesquisar outro nome ou categoria.</p>
      </div>
      <button class="button button-secondary" type="button" data-clear-filters>Limpar filtros</button>
    `;
    return empty;
  };

  const renderGames = (targetId, games, options = {}) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (!games.length) {
      target.replaceChildren(createEmptyState());
      return;
    }

    const fragment = document.createDocumentFragment();
    games.forEach((game) => fragment.appendChild(createCard(game, options)));
    target.replaceChildren(fragment);
  };

  // A seleção editorial mantém a seção útil antes do primeiro acesso local.
  const fallbackPopularGames = catalog.filter((game) => game.popular);

  const renderStatisticsSections = () => {
    const recentlyPlayed = typeof stats?.getRecentlyPlayed === 'function'
      ? stats.getRecentlyPlayed(catalog, 6)
      : [];
    const continueSection = document.querySelector('[data-continue-section]');
    const continueGrid = document.getElementById('continue-games');

    if (continueSection) continueSection.hidden = recentlyPlayed.length === 0;
    if (recentlyPlayed.length) {
      renderGames('continue-games', recentlyPlayed, { showLocalStats: true });
      const continueDescription = document.querySelector('[data-continue-description]');
      if (continueDescription) continueDescription.textContent = 'Seus últimos jogos acessados neste dispositivo.';
    } else if (continueGrid) {
      continueGrid.replaceChildren();
    }

    const mostPlayed = typeof stats?.getMostPlayed === 'function'
      ? stats.getMostPlayed(catalog, fallbackPopularGames.length)
      : [];
    const usesLocalStats = mostPlayed.length > 0;
    renderGames('popular-games', usesLocalStats ? mostPlayed : fallbackPopularGames, { showLocalStats: usesLocalStats });

    const popularDescription = document.querySelector('[data-popular-description]');
    if (popularDescription) {
      popularDescription.textContent = usesLocalStats
        ? 'Ranking local ordenado por acessos neste dispositivo.'
        : 'Sem histórico local, exibimos uma seleção inicial do CV GAMES.';
    }
  };

  const getSearchableText = (game) => [
    game.title,
    game.category,
    game.description,
    ...(Array.isArray(game.tags) ? game.tags : [])
  ].join(' ');

  const matchesCategory = (game) => {
    if (filters.category === 'todos') return true;
    if (filters.category === 'pc-fraco') return game.pcFraco === true;
    return game.categoryKey === filters.category;
  };

  const getFilteredGames = () => {
    const normalizedQuery = normalizeText(filters.query);
    return catalog.filter((game) => {
      const matchesSearch = !normalizedQuery || normalizeText(getSearchableText(game)).includes(normalizedQuery);
      const matchesFavorite = !filters.favoritesOnly || favorites.has(game.id);
      return matchesSearch && matchesCategory(game) && matchesFavorite;
    });
  };

  const hasActiveFilters = () => Boolean(normalizeText(filters.query) || filters.category !== 'todos' || filters.favoritesOnly);

  const refreshFavoriteControls = () => {
    document.querySelectorAll('[data-favorite-id]').forEach((button) => {
      const isFavorite = favorites.has(button.dataset.favoriteId);
      button.setAttribute('aria-pressed', String(isFavorite));
      button.textContent = isFavorite ? '♥' : '♡';
      button.setAttribute('aria-label', isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    });

    const count = document.querySelector('[data-favorite-count]');
    if (count) count.textContent = String(favorites.size);
  };

  const updateFilterInterface = (resultCount) => {
    const active = hasActiveFilters();
    document.body.classList.toggle('is-filtering', active);

    document.querySelectorAll('[data-category-filter]').forEach((button) => {
      const selected = button.dataset.categoryFilter === filters.category;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    const favoriteToggle = document.querySelector('[data-favorites-toggle]');
    if (favoriteToggle) {
      favoriteToggle.classList.toggle('is-active', filters.favoritesOnly);
      favoriteToggle.setAttribute('aria-pressed', String(filters.favoritesOnly));
      favoriteToggle.setAttribute('aria-label', filters.favoritesOnly ? 'Mostrar todos os jogos' : 'Mostrar somente favoritos');
      favoriteToggle.setAttribute('title', filters.favoritesOnly ? 'Mostrar todos os jogos' : 'Mostrar somente favoritos');
    }

    const resultLabel = document.querySelector('[data-results-count]');
    if (resultLabel) resultLabel.textContent = `${resultCount} ${resultCount === 1 ? 'jogo encontrado' : 'jogos encontrados'}`;

    const title = document.querySelector('[data-catalog-title]');
    if (title) title.textContent = filters.favoritesOnly ? '❤️ Favoritos' : '🎮 Todos os jogos';

    const resetButton = document.querySelector('[data-clear-filters]');
    if (resetButton && resetButton.parentElement?.classList.contains('catalog-summary')) {
      resetButton.hidden = !active;
    }

    const status = document.querySelector('[data-search-status]');
    if (status) {
      status.textContent = active
        ? 'Filtros ativos. Os resultados são atualizados automaticamente.'
        : 'Pesquise por nome, categoria, descrição ou tags.';
    }
  };

  const applyFilters = () => {
    const games = getFilteredGames();
    renderGames('all-games', games);
    refreshFavoriteControls();
    updateFilterInterface(games.length);
  };

  const clearFilters = () => {
    filters.query = '';
    filters.category = 'todos';
    filters.favoritesOnly = false;
    const input = document.querySelector('[data-game-search]');
    if (input) input.value = '';
    applyFilters();
  };

  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Sem persistência, a alternância continua válida durante a visita atual.
    }

    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      const isLight = theme === 'light';
      toggle.textContent = isLight ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
      toggle.setAttribute('title', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
    }
  };

  const prepareSearch = () => {
    const input = document.querySelector('[data-game-search]');
    if (!input) return;
    input.addEventListener('input', () => {
      filters.query = input.value;
      applyFilters();
    });
  };

  const prepareCategories = () => {
    document.querySelectorAll('[data-category-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const category = button.dataset.categoryFilter;
        filters.category = filters.category === category ? 'todos' : category;
        applyFilters();
        document.getElementById('jogos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  const prepareFavorites = () => {
    const toggle = document.querySelector('[data-favorites-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      filters.favoritesOnly = !filters.favoritesOnly;
      applyFilters();
      document.getElementById('jogos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const clearLocalStats = async () => {
    if (typeof stats?.clearStats !== 'function') return;
    const confirmed = await window.CV_GAMES_DIALOG.confirm({
      title:'Limpar histórico de jogos?',
      message:'Isso apagará somente o histórico e as estatísticas salvas neste dispositivo. Favoritos e tema serão mantidos.',
      confirmText:'Limpar histórico', cancelText:'Manter dados', tone:'danger'
    });
    if (!confirmed) return;
    stats.clearStats();
  };

  const scheduleStatisticsRender = () => {
    window.setTimeout(renderStatisticsSections, 0);
  };

  const init = () => {
    const initialParams = new URLSearchParams(window.location.search);
    if (initialParams.get('favoritos') === '1') filters.favoritesOnly = true;

    renderGames('featured-games', catalog.filter((game) => game.featured));
    renderGames('recent-games', catalog.filter((game) => game.recent));
    renderStatisticsSections();

    document.addEventListener('click', (event) => {
      const favoriteButton = event.target.closest('[data-favorite-id]');
      if (favoriteButton) {
        const { favoriteId } = favoriteButton.dataset;
        if (favorites.has(favoriteId)) favorites.delete(favoriteId);
        else favorites.add(favoriteId);
        saveFavorites();
        applyFilters();
        return;
      }

      const playLink = event.target.closest('[data-play-game-id]');
      if (playLink) {
        if (typeof stats?.registerAccess === 'function'
          && typeof stats?.isExternalDestination === 'function'
          && stats.isExternalDestination(playLink.href)) {
          stats.registerAccess(playLink.dataset.playGameId);
        }
        return;
      }

      if (event.target.closest('[data-clear-stats]')) {
        clearLocalStats();
        return;
      }

      if (event.target.closest('[data-clear-filters]')) clearFilters();
    });

    if (typeof stats?.storageKey === 'string') {
      window.addEventListener('cv-games-stats-change', scheduleStatisticsRender);
      window.addEventListener('storage', (event) => {
        if (event.key === stats.storageKey) scheduleStatisticsRender();
      });
    }

    const menuButton = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-primary-nav]');
    if (menuButton && menu) {
      menuButton.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('is-open');
        menuButton.setAttribute('aria-expanded', String(isOpen));
      });
      menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
        menu.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
      }));
    }

    const themeButton = document.querySelector('[data-theme-toggle]');
    if (themeButton) {
      setTheme(document.documentElement.dataset.theme || 'dark');
      themeButton.addEventListener('click', () => {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    }

    prepareSearch();
    prepareCategories();
    prepareFavorites();
    applyFilters();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
