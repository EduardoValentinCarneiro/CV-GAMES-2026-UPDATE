(function () {
  'use strict';

  /*
   * Conquistas locais do CV GAMES. A fonte das ações continua sendo
   * CV_GAMES_STATS, os favoritos existentes e marcos confirmados pelos jogos
   * próprios; este módulo guarda somente progresso e desbloqueios locais.
   */
  const storageKey = 'cv-games-achievements';
  const favoriteStorageKey = 'cv-games-favorites';
  const schemaVersion = 2;
  const neonGameId = 'cv-neon-breaker';
  const neonPhaseCount = 5;
  const neonComboTarget = 5;
  const fanExclusiveGameIds = Object.freeze(['cv-dodge', neonGameId]);

  const definitions = Object.freeze([
    {
      id: 'primeiro-jogo', icon: '🎮', title: 'Primeiro jogo',
      description: 'Registre seu primeiro acesso local a um jogo.',
      progress: (metrics) => ({ current: metrics.progress.totalAccesses, target: 1, label: 'acesso local' })
    },
    {
      id: 'explorador', icon: '🕹️', title: 'Explorador',
      description: 'Jogue 3 títulos diferentes.',
      progress: (metrics) => ({ current: metrics.progress.uniqueGames, target: 3, label: 'jogos diferentes' })
    },
    {
      id: 'gamer', icon: '🔥', title: 'Gamer',
      description: 'Registre 10 acessos locais.',
      progress: (metrics) => ({ current: metrics.progress.totalAccesses, target: 10, label: 'acessos locais' })
    },
    {
      id: 'colecionador', icon: '❤️', title: 'Colecionador',
      description: 'Tenha 3 jogos favoritos.',
      progress: (metrics) => ({ current: metrics.progress.favoriteCount, target: 3, label: 'favoritos' })
    },
    {
      id: 'fiel', icon: '⭐', title: 'Fiel',
      description: 'Abra o mesmo jogo 5 vezes.',
      progress: (metrics) => ({ current: metrics.progress.highestVisits, target: 5, label: 'acessos no mesmo jogo' })
    },
    {
      id: 'aventureiro', icon: '🧭', title: 'Aventureiro',
      description: 'Jogue 5 títulos diferentes.',
      progress: (metrics) => ({ current: metrics.progress.uniqueGames, target: 5, label: 'jogos diferentes' })
    },
    {
      id: 'veterano', icon: '🏆', title: 'Veterano',
      description: 'Registre 25 acessos locais.',
      progress: (metrics) => ({ current: metrics.progress.totalAccesses, target: 25, label: 'acessos locais' })
    },
    {
      id: 'fa-cv-games', icon: '⭐', title: 'Fã do CV GAMES',
      description: 'Jogue CV DODGE e CV NEON BREAKER.',
      progress: (metrics) => ({ current: metrics.progress.exclusiveGames, target: fanExclusiveGameIds.length, label: 'jogos exclusivos' })
    },
    {
      id: 'quebra-gelo', icon: '🧱', title: 'Quebra-gelo',
      description: 'Conclua a primeira fase do CV NEON BREAKER.',
      progress: (metrics) => ({ current: metrics.neon.highestPhase, target: 1, label: 'fase concluída' })
    },
    {
      id: 'combo-neon', icon: '🔥', title: 'Combo Neon',
      description: 'Alcance um combo x5 no CV NEON BREAKER sem perder a esfera.',
      progress: (metrics) => ({ current: metrics.neon.bestCombo, target: neonComboTarget, label: 'combo' })
    },
    {
      id: 'mestre-neon', icon: '🏆', title: 'Mestre Neon',
      description: 'Conclua as cinco fases do CV NEON BREAKER.',
      progress: (metrics) => ({ current: metrics.neon.completed ? 1 : 0, target: 1, label: 'campanha concluída' })
    }
  ]);

  const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const toNonNegativeInteger = (value) => {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number > 0 ? number : 0;
  };

  const createEmptyNeonProgress = () => ({ highestPhase: 0, bestCombo: 0, completed: false });

  const createEmptyState = () => ({
    version: schemaVersion,
    unlocked: {},
    baseline: null,
    neonProgress: createEmptyNeonProgress()
  });

  const normalizeBaseline = (value) => {
    if (!isRecord(value)) return null;
    const gameVisits = isRecord(value.gameVisits) ? value.gameVisits : {};
    const favoriteIds = Array.isArray(value.favoriteIds) ? value.favoriteIds : [];

    return {
      totalAccesses: toNonNegativeInteger(value.totalAccesses),
      gameVisits: Object.keys(gameVisits).reduce((copy, id) => {
        const visits = toNonNegativeInteger(gameVisits[id]);
        if (visits) copy[id] = visits;
        return copy;
      }, {}),
      favoriteIds: [...new Set(favoriteIds.filter((id) => typeof id === 'string'))]
    };
  };

  const normalizeNeonProgress = (value) => {
    if (!isRecord(value)) return createEmptyNeonProgress();
    const highestPhase = Math.min(neonPhaseCount, toNonNegativeInteger(value.highestPhase));
    const bestCombo = Math.min(neonComboTarget, toNonNegativeInteger(value.bestCombo));

    return {
      highestPhase,
      bestCombo,
      completed: value.completed === true && highestPhase >= neonPhaseCount
    };
  };

  const normalizeState = (value) => {
    const state = createEmptyState();
    if (!isRecord(value)) return state;

    const unlocked = isRecord(value.unlocked) ? value.unlocked : {};
    definitions.forEach((definition) => {
      const record = unlocked[definition.id];
      const unlockedAt = isRecord(record) ? Number(record.unlockedAt) : Number(record);
      if (Number.isFinite(unlockedAt) && unlockedAt > 0) {
        state.unlocked[definition.id] = { unlockedAt };
      }
    });
    state.baseline = normalizeBaseline(value.baseline);
    state.neonProgress = normalizeNeonProgress(value.neonProgress);
    return state;
  };

  const readState = () => {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(storageKey) || 'null'));
    } catch {
      return createEmptyState();
    }
  };

  const writeState = (state) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  };

  const dispatch = (name, detail) => {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      // A página continua funcional quando CustomEvent não está disponível.
    }
  };

  const getCatalog = () => Array.isArray(window.CV_GAMES_CATALOG) ? window.CV_GAMES_CATALOG : [];

  const getFavoriteIds = (availableIds) => {
    try {
      const saved = JSON.parse(localStorage.getItem(favoriteStorageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      return [...new Set(saved.filter((id) => typeof id === 'string' && availableIds.has(id)))];
    } catch {
      return [];
    }
  };

  const getRawMetrics = (catalog) => {
    const games = Array.isArray(catalog) ? catalog : [];
    const availableIds = new Set(games.map((game) => game.id));
    const stats = window.CV_GAMES_STATS;
    const snapshot = typeof stats?.getSnapshot === 'function'
      ? stats.getSnapshot()
      : { games: {}, recentIds: [] };
    const gameVisits = Object.keys(snapshot.games || {}).reduce((copy, id) => {
      if (!availableIds.has(id)) return copy;
      const visits = toNonNegativeInteger(snapshot.games[id]?.visits);
      if (visits) copy[id] = visits;
      return copy;
    }, {});
    const uniqueGameIds = Object.keys(gameVisits);
    const totalAccesses = uniqueGameIds.reduce((total, id) => total + gameVisits[id], 0);
    const highestVisits = uniqueGameIds.reduce((highest, id) => Math.max(highest, gameVisits[id]), 0);

    return {
      totalAccesses,
      uniqueGameIds,
      gameVisits,
      highestVisits,
      favoriteIds: getFavoriteIds(availableIds)
    };
  };

  const getMetrics = (catalog, state) => {
    const raw = getRawMetrics(catalog);
    const baseline = state.baseline || { totalAccesses: 0, gameVisits: {}, favoriteIds: [] };
    const progressGameIds = raw.uniqueGameIds.filter((id) => raw.gameVisits[id] > (baseline.gameVisits[id] || 0));
    const progressHighestVisits = progressGameIds.reduce((highest, id) => (
      Math.max(highest, raw.gameVisits[id] - (baseline.gameVisits[id] || 0))
    ), 0);
    const baselineFavoriteIds = new Set(baseline.favoriteIds);
    const exclusiveGames = fanExclusiveGameIds.filter((id) => raw.gameVisits[id] > (baseline.gameVisits[id] || 0));

    return {
      totalAccesses: raw.totalAccesses,
      uniqueGames: raw.uniqueGameIds.length,
      favoriteCount: raw.favoriteIds.length,
      highestVisits: raw.highestVisits,
      recentIds: raw.uniqueGameIds,
      neon: state.neonProgress,
      isAfterReset: Boolean(state.baseline),
      progress: {
        totalAccesses: Math.max(0, raw.totalAccesses - baseline.totalAccesses),
        uniqueGames: progressGameIds.length,
        favoriteCount: raw.favoriteIds.filter((id) => !baselineFavoriteIds.has(id)).length,
        highestVisits: progressHighestVisits,
        exclusiveGames: exclusiveGames.length
      }
    };
  };

  const buildAchievements = (state, metrics) => definitions.map((definition) => {
    const progress = definition.progress(metrics);
    const record = state.unlocked[definition.id];
    return {
      id: definition.id,
      icon: definition.icon,
      title: definition.title,
      description: definition.description,
      unlocked: Boolean(record),
      unlockedAt: record?.unlockedAt || null,
      progress: {
        current: Math.min(progress.current, progress.target),
        target: progress.target,
        label: progress.label
      }
    };
  });

  const createResult = (catalog, state, newlyUnlocked = []) => {
    const metrics = getMetrics(catalog, state);
    const achievements = buildAchievements(state, metrics);
    return {
      metrics,
      achievements,
      unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
      newlyUnlocked
    };
  };

  const getState = (catalog = getCatalog()) => createResult(catalog, readState());

  const sync = (catalog = getCatalog(), options = {}) => {
    const state = readState();
    const metrics = getMetrics(catalog, state);
    const newlyUnlocked = [];

    definitions.forEach((definition) => {
      const progress = definition.progress(metrics);
      if (progress.current < progress.target || state.unlocked[definition.id]) return;
      const record = { unlockedAt: Date.now() };
      state.unlocked[definition.id] = record;
      newlyUnlocked.push({ ...definition, unlockedAt: record.unlockedAt });
    });

    if (newlyUnlocked.length && writeState(state)) {
      dispatch('cv-games-achievements-change', { newlyUnlocked });
      if (options.announce !== false) {
        newlyUnlocked.forEach((achievement) => dispatch('cv-games-achievement-unlocked', achievement));
      }
    }

    return createResult(catalog, state, newlyUnlocked);
  };

  /*
   * Jogos próprios registram somente marcos que conseguem confirmar durante a
   * partida. O payload é reduzido a números limitados antes de ser salvo e
   * eventos repetidos não geram novos desbloqueios nem gravações desnecessárias.
   */
  const recordGameEvent = (gameId, eventName, value) => {
    if (gameId !== neonGameId) return getState();

    const state = readState();
    const neon = state.neonProgress;
    let changed = false;

    if (eventName === 'first-phase-complete') {
      if (toNonNegativeInteger(value) < 1) return createResult(getCatalog(), state);
      const highestPhase = Math.max(neon.highestPhase, 1);
      changed = highestPhase !== neon.highestPhase;
      neon.highestPhase = highestPhase;
    } else if (eventName === 'best-combo') {
      const combo = Math.min(neonComboTarget, toNonNegativeInteger(value));
      if (!combo) return createResult(getCatalog(), state);
      changed = combo > neon.bestCombo;
      neon.bestCombo = Math.max(neon.bestCombo, combo);
    } else if (eventName === 'all-phases-complete') {
      if (toNonNegativeInteger(value) < neonPhaseCount) return createResult(getCatalog(), state);
      changed = neon.highestPhase !== neonPhaseCount || !neon.completed;
      neon.highestPhase = neonPhaseCount;
      neon.completed = true;
    } else {
      return createResult(getCatalog(), state);
    }

    if (!changed) return createResult(getCatalog(), state);
    if (!writeState(state)) return createResult(getCatalog(), state);

    const result = sync(getCatalog());
    if (!result.newlyUnlocked.length) {
      dispatch('cv-games-achievements-change', { gameEvent: eventName });
    }
    return result;
  };

  const reset = (catalog = getCatalog()) => {
    const raw = getRawMetrics(catalog);
    const state = createEmptyState();
    state.baseline = {
      totalAccesses: raw.totalAccesses,
      gameVisits: raw.gameVisits,
      favoriteIds: raw.favoriteIds
    };
    writeState(state);
    dispatch('cv-games-achievements-change', { reset: true });
    return createResult(catalog, state);
  };

  const toastQueue = [];
  let toastVisible = false;

  const showNextToast = () => {
    if (toastVisible || !toastQueue.length || !document.body) return;
    toastVisible = true;
    const achievement = toastQueue.shift();
    let region = document.querySelector('[data-achievement-toast-region]');
    if (!region) {
      region = document.createElement('div');
      region.className = 'achievement-toast-region';
      region.dataset.achievementToastRegion = '';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      document.body.appendChild(region);
    }

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    const title = document.createElement('strong');
    const description = document.createElement('span');
    title.textContent = `🏆 Conquista desbloqueada: ${achievement.title}`;
    description.textContent = achievement.description;
    toast.append(title, description);
    region.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => {
        toast.remove();
        toastVisible = false;
        showNextToast();
      }, 220);
    }, 3800);
  };

  const init = () => {
    window.addEventListener('cv-games-achievement-unlocked', (event) => {
      if (event.detail) toastQueue.push(event.detail);
      showNextToast();
    });
    window.addEventListener('cv-games-stats-change', () => sync(getCatalog()));
    window.addEventListener('cv-games-favorites-change', () => sync(getCatalog()));
    window.addEventListener('cv-games-neon-breaker-phase-complete', (event) => {
      recordGameEvent(neonGameId, 'first-phase-complete', event.detail?.phase);
    });
    window.addEventListener('cv-games-neon-breaker-combo', (event) => {
      recordGameEvent(neonGameId, 'best-combo', event.detail?.combo);
    });
    window.addEventListener('cv-games-neon-breaker-victory', (event) => {
      recordGameEvent(neonGameId, 'all-phases-complete', event.detail?.phasesCompleted);
    });
    window.addEventListener('storage', (event) => {
      if (event.key === 'cv-games-stats' || event.key === favoriteStorageKey) {
        sync(getCatalog(), { announce: false });
      }
    });
    sync(getCatalog());
  };

  window.CV_GAMES_ACHIEVEMENTS = Object.freeze({
    storageKey,
    definitions,
    getState,
    sync,
    reset,
    recordGameEvent
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
