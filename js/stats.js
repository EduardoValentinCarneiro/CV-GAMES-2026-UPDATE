(function () {
  'use strict';

  /*
   * Camada local de estatísticas do CV GAMES.
   * A Home e as páginas individuais usam somente esta API; assim, uma fonte
   * global futura poderá substituir a implementação sem espalhar localStorage.
   */
  const storageKey = 'cv-games-stats';
  const schemaVersion = 1;
  const historyLimit = 10;

  const createEmptyStats = () => ({
    version: schemaVersion,
    games: {},
    recentIds: []
  });

  const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const normalizeGameRecord = (value) => {
    if (!isRecord(value)) return null;
    const visits = Math.floor(Number(value.visits));
    if (!Number.isFinite(visits) || visits <= 0) return null;

    const lastAccess = Number(value.lastAccess);
    return {
      visits,
      lastAccess: Number.isFinite(lastAccess) && lastAccess > 0 ? lastAccess : 0
    };
  };

  const normalizeStats = (value) => {
    const stats = createEmptyStats();
    if (!isRecord(value)) return stats;

    const savedGames = isRecord(value.games) ? value.games : {};
    Object.keys(savedGames).forEach((id) => {
      const record = normalizeGameRecord(savedGames[id]);
      if (record) stats.games[id] = record;
    });

    const fallbackRecentIds = Object.keys(stats.games)
      .sort((first, second) => stats.games[second].lastAccess - stats.games[first].lastAccess);
    const savedRecentIds = Array.isArray(value.recentIds) ? value.recentIds : fallbackRecentIds;

    savedRecentIds.forEach((id) => {
      if (typeof id !== 'string' || !stats.games[id] || stats.recentIds.includes(id)) return;
      if (stats.recentIds.length < historyLimit) stats.recentIds.push(id);
    });

    return stats;
  };

  const readStats = () => {
    try {
      return normalizeStats(JSON.parse(localStorage.getItem(storageKey) || 'null'));
    } catch {
      return createEmptyStats();
    }
  };

  const writeStats = (stats) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(stats));
      return true;
    } catch {
      // O portal continua navegável caso o navegador bloqueie o armazenamento local.
      return false;
    }
  };

  const notifyStatsChange = () => {
    try {
      window.dispatchEvent(new Event('cv-games-stats-change'));
    } catch {
      // A persistência continua válida mesmo se o navegador não aceitar Event().
    }
  };

  const getSnapshot = () => {
    const stats = readStats();
    return {
      version: stats.version,
      games: Object.keys(stats.games).reduce((copy, id) => {
        copy[id] = {
          visits: stats.games[id].visits,
          lastAccess: stats.games[id].lastAccess
        };
        return copy;
      }, {}),
      recentIds: [...stats.recentIds]
    };
  };

  const getGameStats = (gameId) => {
    const record = readStats().games[gameId];
    return record
      ? { visits: record.visits, lastAccess: record.lastAccess }
      : { visits: 0, lastAccess: null };
  };

  const registerAccess = (gameId) => {
    const id = typeof gameId === 'string' ? gameId.trim() : '';
    if (!id) return { visits: 0, lastAccess: null };

    const stats = readStats();
    const previous = stats.games[id] || { visits: 0, lastAccess: 0 };
    const record = {
      visits: previous.visits + 1,
      lastAccess: Date.now()
    };

    stats.games[id] = record;
    stats.recentIds = [id, ...stats.recentIds.filter((recentId) => recentId !== id)]
      .slice(0, historyLimit);
    writeStats(stats);
    notifyStatsChange();

    return { visits: record.visits, lastAccess: record.lastAccess };
  };

  const getMostPlayed = (catalog, limit) => {
    const games = Array.isArray(catalog) ? catalog : [];
    const maxItems = Number.isFinite(Number(limit))
      ? Math.max(0, Math.floor(Number(limit)))
      : games.length;
    const records = readStats().games;

    return games
      .map((game, index) => ({ game, index, stats: records[game.id] }))
      .filter((entry) => entry.stats && entry.stats.visits > 0)
      .sort((first, second) => second.stats.visits - first.stats.visits
        || second.stats.lastAccess - first.stats.lastAccess
        || first.index - second.index)
      .slice(0, maxItems)
      .map((entry) => entry.game);
  };

  const getRecentlyPlayed = (catalog, limit) => {
    const games = Array.isArray(catalog) ? catalog : [];
    const maxItems = Number.isFinite(Number(limit))
      ? Math.max(0, Math.floor(Number(limit)))
      : 6;
    const byId = games.reduce((index, game) => {
      index[game.id] = game;
      return index;
    }, {});
    const savedStats = readStats();

    return savedStats.recentIds
      .map((id, index) => ({ game: byId[id], index, stats: savedStats.games[id] }))
      .filter((entry) => entry.game && entry.stats)
      .sort((first, second) => second.stats.lastAccess - first.stats.lastAccess || first.index - second.index)
      .slice(0, maxItems)
      .map((entry) => entry.game);
  };

  const isExternalDestination = (destination) => {
    try {
      return new URL(destination, window.location.href).origin !== window.location.origin;
    } catch {
      return /^https?:\/\//i.test(String(destination || ''));
    }
  };

  const clearStats = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Sem armazenamento local, não há histórico persistido para remover.
    }
    notifyStatsChange();
  };

  window.CV_GAMES_STATS = Object.freeze({
    storageKey,
    historyLimit,
    getSnapshot,
    registerAccess,
    getGameStats,
    getMostPlayed,
    getRecentlyPlayed,
    isExternalDestination,
    clearStats
  });
}());
