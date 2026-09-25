(function () {
  'use strict';

  const catalog = Array.isArray(window.CV_GAMES_CATALOG) ? window.CV_GAMES_CATALOG : [];
  const stats = window.CV_GAMES_STATS;
  const achievements = window.CV_GAMES_ACHIEVEMENTS;
  const profileStore = window.CV_GAMES_PROFILE;
  const favoriteStorageKey = 'cv-games-favorites';
  const themeStorageKey = 'cv-games-theme';
  let selectedAvatar = profileStore?.getProfile?.().avatar || '🎮';

  const createElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const getFavoriteIds = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(favoriteStorageKey) || '[]');
      return Array.isArray(saved) ? [...new Set(saved.filter((id) => typeof id === 'string'))] : [];
    } catch {
      return [];
    }
  };

  const getFavoriteGames = () => {
    const byId = catalog.reduce((index, game) => {
      index[game.id] = game;
      return index;
    }, {});
    return getFavoriteIds().map((id) => byId[id]).filter(Boolean).slice(0, 6);
  };

  const getAchievementState = () => {
    if (typeof achievements?.getState === 'function') return achievements.getState(catalog);
    return {
      metrics: { totalAccesses: 0, uniqueGames: 0, favoriteCount: 0, isAfterReset: false },
      achievements: [],
      unlockedCount: 0
    };
  };

  const getMostPlayedGame = () => (typeof stats?.getMostPlayed === 'function'
    ? stats.getMostPlayed(catalog, 1)[0] || null
    : null);

  const getRecentGames = () => (typeof stats?.getRecentlyPlayed === 'function'
    ? stats.getRecentlyPlayed(catalog, 6)
    : []);

  const getVisits = (gameId) => (typeof stats?.getGameStats === 'function'
    ? Number(stats.getGameStats(gameId).visits) || 0
    : 0);

  const accessLabel = (visits) => `${visits} ${visits === 1 ? 'acesso local' : 'acessos locais'}`;

  const createEmptyState = (icon, title, description) => {
    const state = createElement('div', 'profile-empty');
    const emoji = createElement('span', '', icon);
    emoji.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div');
    copy.append(createElement('strong', '', title), createElement('p', '', description));
    state.append(emoji, copy);
    return state;
  };

  const createGameCard = (game) => {
    const card = createElement('article', 'profile-game-card');
    const cover = createElement('div', 'profile-game-cover');
    const image = document.createElement('img');
    image.src = game.image;
    image.alt = `Capa de ${game.title}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      const fallback = createElement('div', 'profile-game-fallback', game.fallback);
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', `Capa indisponível de ${game.title}`);
      image.replaceWith(fallback);
    }, { once: true });
    cover.appendChild(image);
    if (game.exclusivo === true) {
      const exclusive = createElement('span', 'profile-exclusive-badge', '⭐ Exclusivo CV GAMES');
      cover.appendChild(exclusive);
    }

    const body = createElement('div', 'profile-game-body');
    const title = createElement('h3', '', game.title);
    const category = createElement('p', '', game.category);
    const visits = getVisits(game.id);
    const meta = createElement('p', 'profile-game-meta', visits ? `🎮 ${accessLabel(visits)}` : '🎮 Ainda não jogado neste dispositivo');
    const link = createElement('a', 'button button-primary', 'Jogar');
    link.href = game.href;
    link.dataset.profileGameId = game.id;
    body.append(title, category, meta, link);
    card.append(cover, body);
    return card;
  };

  const renderGameList = (selector, games, emptyCopy) => {
    const target = document.querySelector(selector);
    if (!target) return;
    if (!games.length) {
      target.replaceChildren(createEmptyState(emptyCopy.icon, emptyCopy.title, emptyCopy.description));
      return;
    }
    const fragment = document.createDocumentFragment();
    games.forEach((game) => fragment.appendChild(createGameCard(game)));
    target.replaceChildren(fragment);
  };

  const renderProfileIdentity = () => {
    const profile = typeof profileStore?.getProfile === 'function'
      ? profileStore.getProfile()
      : { nickname: 'Jogador', avatar: '🎮' };
    setText('[data-profile-name]', profile.nickname);
    setText('[data-profile-avatar]', profile.avatar);
    selectedAvatar = profile.avatar;
    return profile;
  };

  const renderEditor = (profile) => {
    const currentProfile = profile || (typeof profileStore?.getProfile === 'function'
      ? profileStore.getProfile()
      : { nickname: 'Jogador', avatar: '🎮' });
    const input = document.querySelector('[data-profile-nickname]');
    if (input) input.value = currentProfile.nickname;
    renderAvatarSelection();
  };

  const renderAvatarSelection = () => {
    document.querySelectorAll('[data-avatar-option]').forEach((button) => {
      const selected = button.dataset.avatarOption === selectedAvatar;
      button.setAttribute('aria-pressed', String(selected));
    });
  };

  const renderAchievements = (achievementState) => {
    const target = document.querySelector('[data-achievement-grid]');
    if (!target) return;
    const fragment = document.createDocumentFragment();

    achievementState.achievements.forEach((achievement) => {
      const card = createElement('article', 'achievement-card');
      if (achievement.unlocked) card.classList.add('is-unlocked');
      const icon = createElement('span', 'achievement-card-icon', achievement.icon);
      icon.setAttribute('aria-hidden', 'true');
      const title = createElement('h3', '', achievement.title);
      const description = createElement('p', '', achievement.description);
      const footer = createElement('div', 'achievement-card-footer');
      const status = createElement('span', 'achievement-status', achievement.unlocked ? 'Desbloqueada' : 'Bloqueada');
      const progress = createElement('span', 'achievement-progress', `${achievement.progress.current} / ${achievement.progress.target} ${achievement.progress.label}`);
      footer.append(status, progress);
      card.append(icon, title, description, footer);
      fragment.appendChild(card);
    });

    target.replaceChildren(fragment);
    setText('[data-achievements-note]', achievementState.metrics.isAfterReset
      ? 'O progresso das conquistas considera as ações desde a última redefinição de perfil.'
      : 'Conquistas calculadas com suas ações locais confirmadas.');
  };

  const renderDashboard = () => {
    const achievementState = getAchievementState();
    const metrics = achievementState.metrics;
    const mostPlayed = getMostPlayedGame();
    const recent = getRecentGames();
    const favorites = getFavoriteGames();
    const definitionCount = Array.isArray(achievements?.definitions) ? achievements.definitions.length : 0;

    setText('[data-stat-unique]', String(metrics.uniqueGames));
    setText('[data-stat-accesses]', String(metrics.totalAccesses));
    setText('[data-stat-favorites]', String(metrics.favoriteCount));
    setText('[data-stat-achievements]', `${achievementState.unlockedCount}/${definitionCount}`);
    setText('[data-stat-most-played]', mostPlayed ? mostPlayed.title : '—');
    setText('[data-stat-last-played]', recent[0] ? recent[0].title : '—');
    setText('[data-favorite-count]', String(metrics.favoriteCount));

    renderAchievements(achievementState);
    renderGameList('[data-most-played]', mostPlayed ? [mostPlayed] : [], {
      icon: '🏆',
      title: 'Ainda não há jogo mais jogado',
      description: 'Jogue alguns títulos para descobrir seu favorito.'
    });
    renderGameList('[data-recent-games]', recent, {
      icon: '🕹️',
      title: 'Nenhum jogo recente',
      description: 'Abra um jogo pelo portal para formar seu histórico local.'
    });
    renderGameList('[data-favorite-games]', favorites, {
      icon: '❤️',
      title: 'Nenhum favorito ainda',
      description: 'Marque jogos com o coração no catálogo para vê-los aqui.'
    });
  };

  const setEditorOpen = (isOpen) => {
    const editor = document.querySelector('[data-profile-editor]');
    const button = document.querySelector('[data-edit-profile]');
    if (!editor || !button) return;
    editor.hidden = !isOpen;
    button.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      renderEditor(renderProfileIdentity());
      window.setTimeout(() => document.querySelector('[data-profile-nickname]')?.focus(), 0);
    }
  };

  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // A alternância continua válida durante a visita atual.
    }
    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      const isLight = theme === 'light';
      toggle.textContent = isLight ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
      toggle.setAttribute('title', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
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
    renderProfileIdentity();
    renderDashboard();
    prepareMenu();

    const themeButton = document.querySelector('[data-theme-toggle]');
    setTheme(document.documentElement.dataset.theme || 'dark');
    themeButton?.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    document.querySelector('[data-edit-profile]')?.addEventListener('click', () => setEditorOpen(true));
    document.querySelector('[data-cancel-profile]')?.addEventListener('click', () => setEditorOpen(false));

    document.querySelectorAll('[data-avatar-option]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedAvatar = button.dataset.avatarOption;
        renderAvatarSelection();
      });
    });

    document.querySelector('[data-profile-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.querySelector('[data-profile-nickname]');
      const profile = typeof profileStore?.saveProfile === 'function'
        ? profileStore.saveProfile({ nickname: input?.value, avatar: selectedAvatar })
        : { nickname: 'Jogador', avatar: '🎮' };
      renderProfileIdentity();
      setEditorOpen(false);
      setText('[data-profile-status]', `Perfil salvo localmente como ${profile.nickname}.`);
    });

    document.querySelector('[data-reset-profile]')?.addEventListener('click', async () => {
      const confirmed = await window.CV_GAMES_DIALOG.confirm({
        title:'Redefinir perfil e conquistas?',
        message:'O apelido, o avatar e as conquistas locais serão redefinidos. Estatísticas, favoritos e tema serão mantidos.',
        confirmText:'Redefinir', cancelText:'Manter perfil', tone:'danger'
      });
      if (!confirmed) return;
      profileStore?.resetProfile?.();
      achievements?.reset?.(catalog);
      renderProfileIdentity();
      setEditorOpen(false);
      renderDashboard();
      setText('[data-profile-status]', 'Perfil e conquistas locais foram redefinidos.');
    });

    document.addEventListener('click', (event) => {
      const gameLink = event.target.closest('[data-profile-game-id]');
      if (!gameLink) return;
      if (typeof stats?.registerAccess === 'function'
        && typeof stats?.isExternalDestination === 'function'
        && stats.isExternalDestination(gameLink.href)) {
        stats.registerAccess(gameLink.dataset.profileGameId);
      }
    });

    window.addEventListener('cv-games-stats-change', renderDashboard);
    window.addEventListener('cv-games-favorites-change', renderDashboard);
    window.addEventListener('cv-games-achievements-change', renderDashboard);
    window.addEventListener('cv-games-profile-change', renderProfileIdentity);
    window.addEventListener('storage', (event) => {
      if ([favoriteStorageKey, 'cv-games-stats', 'cv-games-achievements'].includes(event.key)) renderDashboard();
      if (event.key === 'cv-games-profile') renderProfileIdentity();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
