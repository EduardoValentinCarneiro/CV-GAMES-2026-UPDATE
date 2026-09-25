(function () {
  'use strict';

  const SYSTEMS = Object.freeze({
    nes: Object.freeze({ label: 'NES', extension: 'nes' }),
  });
  const FILE_NAME_PATTERNS = Object.freeze({
    nes: /^[a-z0-9][a-z0-9-]*\.nes$/i,
  });
  const state = {
    games: [],
  };

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  function getSystem(system) {
    return typeof system === 'string' && SYSTEMS[system] ? system : '';
  }

  function getSystemLabel(system) {
    return SYSTEMS[system] ? SYSTEMS[system].label : 'Sistema não identificado';
  }

  function getLocalRomPath(game) {
    const system = getSystem(game && game.system);
    const fileName = game && game.fileName;
    if (!system || typeof fileName !== 'string' || !FILE_NAME_PATTERNS[system].test(fileName)) return '';
    return `roms/homebrew/${fileName}`;
  }

  function getEmulatorPath(id) {
    const url = new URL('emuladores.html', window.location.href);
    url.searchParams.set('homebrew', id);
    return `${url.pathname.split('/').pop()}${url.search}`;
  }

  function createExternalLink(href, label, className) {
    const link = createElement('a', className, label);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function createInfoRow(label, value, href) {
    const wrapper = createElement('div', 'homebrew-card-meta-row');
    const term = createElement('dt', '', label);
    const definition = createElement('dd');
    if (href) {
      const link = createExternalLink(href, value);
      definition.append(link);
    } else {
      definition.textContent = value;
    }
    wrapper.append(term, definition);
    return wrapper;
  }

  function createCard(game) {
    const filePath = getLocalRomPath(game);
    if (!filePath) return null;

    const article = createElement('article', 'homebrew-card');
    article.dataset.homebrewSystem = game.system;
    const header = createElement('div', 'homebrew-card-header');
    const title = createElement('h3', '', game.title);
    const status = createElement('span', 'central-status', `${getSystemLabel(game.system)} · verificado`);
    header.append(title, status);

    const description = createElement('p', 'homebrew-card-description', game.description);
    const metadata = createElement('dl', 'homebrew-card-meta');
    metadata.append(
      createInfoRow('Autor', game.author),
      createInfoRow('Tipo', game.format),
      createInfoRow('Plataforma', game.platform),
      createInfoRow('Licença / permissão', game.license, game.licenseUrl),
      createInfoRow('Fonte oficial', game.officialSourceLabel, game.officialSource),
      createInfoRow('ROM oficial', 'Release / arquivo oficial', game.releaseUrl),
    );

    const notice = createElement('p', 'homebrew-card-notice', game.licenseNotice);
    const actions = createElement('div', 'homebrew-card-actions');
    const play = createElement('a', 'button button-primary', '▶ Jogar no Emulador');
    play.href = getEmulatorPath(game.id);
    actions.append(play);

    if (game.downloadAllowed) {
      const download = createElement('a', 'button button-secondary', '⬇ Baixar ROM');
      download.href = filePath;
      download.download = game.fileName;
      actions.append(download);
    }

    const source = createExternalLink(game.officialSource, '↗ Site oficial', 'button button-secondary');
    actions.append(source);
    article.append(header, description, metadata, notice, actions);
    return article;
  }

  function getCountText(count) {
    const gamesLabel = count === 1 ? 'jogo legal disponível' : 'jogos legais disponíveis';
    return `${count} ${gamesLabel} para NES.`;
  }

  function renderCatalog(catalog, count) {
    const cards = document.createDocumentFragment();
    const games = state.games;
    let renderedCount = 0;
    games.forEach((game) => {
      const card = createCard(game);
      if (!card) return;
      cards.append(card);
      renderedCount += 1;
    });

    if (!renderedCount) {
      catalog.replaceChildren(createElement('p', 'homebrew-empty', 'Nenhum jogo legal de NES disponível neste momento.'));
      count.textContent = 'Nenhum jogo NES disponível.';
      return;
    }

    catalog.replaceChildren(cards);
    count.textContent = getCountText(renderedCount);
  }

  function init() {
    const catalog = document.querySelector('[data-homebrew-catalog]');
    const count = document.querySelector('[data-homebrew-count]');
    const games = Array.isArray(window.CV_GAMES_HOMEBREW) ? window.CV_GAMES_HOMEBREW : [];
    if (!catalog || !count) return;

    state.games = games.filter((game) => (
      game
      && game.available !== false
      && typeof game.id === 'string'
      && typeof game.fileName === 'string'
      && Boolean(getSystem(game.system))
    ));

    renderCatalog(catalog, count);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
