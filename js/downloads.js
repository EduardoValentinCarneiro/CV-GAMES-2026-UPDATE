(function () {
  'use strict';

  const downloads = Array.isArray(window.CV_GAMES_DOWNLOADS) ? window.CV_GAMES_DOWNLOADS : [];
  const themeStorageKey = 'cv-games-theme';
  const filters = { query: '', category: 'todos' };

  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(themeStorageKey, theme); } catch { /* A visita atual mantém o tema aplicado. */ }
    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      const isLight = theme === 'light';
      toggle.textContent = isLight ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
      toggle.setAttribute('title', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
    }
  };

  const getSearchableText = (item) => [item.title, item.description, item.category, ...(item.tags || [])].join(' ');

  const getFilteredDownloads = () => {
    const query = normalizeText(filters.query);
    return downloads.filter((item) => {
      const matchesQuery = !query || normalizeText(getSearchableText(item)).includes(query);
      const matchesCategory = filters.category === 'todos' || item.categoryKey === filters.category;
      return matchesQuery && matchesCategory;
    });
  };

  const createCard = (item) => {
    const card = document.createElement('article');
    card.className = 'download-card';
    card.dataset.downloadId = item.id;
    card.innerHTML = `
      <div class="download-cover">
        <img src="${item.image}" alt="Capa de ${item.title}" loading="lazy">
        ${item.newItem ? '<span class="download-new">NOVO</span>' : ''}
      </div>
      <div class="download-card-body">
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div class="download-meta">
          <span>🎮 ${item.category}</span>
          ${item.version ? `<span>🏷️ ${item.version}</span>` : ''}
          ${item.platform ? `<span>🖥️ ${item.platform}</span>` : ''}
        </div>
        <a class="button button-primary" href="${item.href}" target="_blank" rel="noopener noreferrer">⬇️ Baixar</a>
      </div>
    `;
    const image = card.querySelector('img');
    image.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'download-cover-fallback';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', `Capa indisponível de ${item.title}`);
      fallback.textContent = item.fallback;
      image.replaceWith(fallback);
    }, { once: true });
    return card;
  };

  const createEmptyState = () => {
    const state = document.createElement('div');
    state.className = 'download-empty';
    state.innerHTML = '<span aria-hidden="true">😕</span><div><strong>Nenhum download encontrado</strong><p>Tente pesquisar outro termo ou limpar os filtros.</p></div><button class="button button-secondary" type="button" data-clear-download-filters>Limpar filtros</button>';
    return state;
  };

  const renderDownloads = () => {
    const grid = document.getElementById('download-grid');
    if (!grid) return;
    const items = getFilteredDownloads();
    if (!items.length) grid.replaceChildren(createEmptyState());
    else {
      const fragment = document.createDocumentFragment();
      items.forEach((item) => fragment.appendChild(createCard(item)));
      grid.replaceChildren(fragment);
    }

    const count = document.querySelector('[data-download-count]');
    if (count) count.textContent = `${items.length} ${items.length === 1 ? 'download encontrado' : 'downloads encontrados'}`;

    document.querySelectorAll('[data-download-category]').forEach((button) => {
      const selected = button.dataset.downloadCategory === filters.category;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    const active = Boolean(normalizeText(filters.query) || filters.category !== 'todos');
    const clear = document.querySelector('[data-clear-download-filters]');
    if (clear && clear.parentElement?.classList.contains('download-catalog-bar')) clear.hidden = !active;

    const status = document.querySelector('[data-download-search-status]');
    if (status) status.textContent = active ? 'Filtros ativos. A lista foi atualizada.' : 'Pesquise por nome, descrição, categoria ou tags.';
  };

  const clearFilters = () => {
    filters.query = '';
    filters.category = 'todos';
    const input = document.querySelector('[data-download-search]');
    if (input) input.value = '';
    renderDownloads();
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
    const themeButton = document.querySelector('[data-theme-toggle]');
    setTheme(document.documentElement.dataset.theme || 'dark');
    themeButton?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

    const input = document.querySelector('[data-download-search]');
    input?.addEventListener('input', () => { filters.query = input.value; renderDownloads(); });

    document.querySelectorAll('[data-download-category]').forEach((button) => {
      button.addEventListener('click', () => {
        const category = button.dataset.downloadCategory;
        filters.category = filters.category === category ? 'todos' : category;
        renderDownloads();
      });
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-clear-download-filters]')) clearFilters();
    });

    prepareMenu();
    renderDownloads();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
