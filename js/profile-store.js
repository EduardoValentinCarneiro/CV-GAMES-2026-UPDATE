(function () {
  'use strict';

  const storageKey = 'cv-games-profile';
  const schemaVersion = 1;
  const avatarOptions = Object.freeze(['🎮', '👾', '🕹️', '🔥', '⚡', '🏆', '🐉', '🚀']);
  const defaultProfile = Object.freeze({ nickname: 'Jogador', avatar: '🎮' });

  const sanitizeNickname = (value) => {
    const normalized = String(value || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return Array.from(normalized).slice(0, 24).join('') || defaultProfile.nickname;
  };

  const normalizeProfile = (value) => {
    const avatar = avatarOptions.includes(value?.avatar) ? value.avatar : defaultProfile.avatar;
    return {
      nickname: sanitizeNickname(value?.nickname),
      avatar
    };
  };

  const dispatchChange = (profile) => {
    try {
      window.dispatchEvent(new CustomEvent('cv-games-profile-change', { detail: profile }));
    } catch {
      // A página permanece utilizável se CustomEvent não estiver disponível.
    }
  };

  const getProfile = () => {
    try {
      return normalizeProfile(JSON.parse(localStorage.getItem(storageKey) || 'null'));
    } catch {
      return { ...defaultProfile };
    }
  };

  const saveProfile = (value) => {
    const profile = normalizeProfile(value);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: schemaVersion, ...profile }));
    } catch {
      // A edição atual continua visível enquanto a página estiver aberta.
    }
    dispatchChange(profile);
    return profile;
  };

  const resetProfile = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Sem armazenamento local, não há perfil persistido para remover.
    }
    const profile = { ...defaultProfile };
    dispatchChange(profile);
    return profile;
  };

  window.CV_GAMES_PROFILE = Object.freeze({
    storageKey,
    avatarOptions,
    defaultProfile,
    sanitizeNickname,
    getProfile,
    saveProfile,
    resetProfile
  });
}());
