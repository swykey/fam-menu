const screen = document.querySelector('#screen');
const progressPercent = document.querySelector('#progress-percent');
const navigationLinks = document.querySelectorAll('[data-nav]');
let telegram = window.Telegram?.WebApp;
let inTelegram = Boolean(telegram?.platform && telegram.platform !== 'unknown');
const storageKey = 'fam-atlas:v1';
const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeOptions = { auto: 'Авто', dark: 'Тёмная', light: 'Светлая' };
const startOptions = { home: 'Главная', materials: 'Материалы', saved: 'Сохранённое' };

function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

const saved = readState();
const completed = new Set(Array.isArray(saved.completed) ? saved.completed : []);
const bookmarks = new Set(Array.isArray(saved.bookmarks) ? saved.bookmarks : []);
const notes = new Map(posts.flatMap(post => {
  const items = saved.notes?.[post.id];
  const ids = new Set();
  return Array.isArray(items) ? [[post.id, items.filter(note => note &&
    typeof note.text === 'string' && typeof note.id === 'string' && /^[\w-]{1,100}$/.test(note.id) &&
    !ids.has(note.id) && ids.add(note.id))]] : [];
}));
let largeText = saved.largeText === true;
let theme = typeof saved.theme === 'string' && Object.hasOwn(themeOptions, saved.theme) ? saved.theme : 'dark';
let startScreen = typeof saved.startScreen === 'string' && Object.hasOwn(startOptions, saved.startScreen) ? saved.startScreen : 'home';
let editingNote = null;
let undo = null;
let lastRoute = saved.lastRoute;
const collections = {
  materials: { query: '', topic: '' },
  saved: { query: '', topic: '' },
};

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      ...saved,
      completed: [...completed], bookmarks: [...bookmarks],
      notes: Object.fromEntries(notes), largeText, lastRoute, theme, startScreen,
    }));
    document.querySelector('#storage-status').hidden = true;
    return true;
  } catch {
    const status = document.querySelector('#storage-status');
    status.textContent = 'Изменения доступны только до закрытия страницы: браузер не сохранил данные.';
    status.hidden = false;
    return false;
  }
}

function launchPage() {
  const launchQuery = new URLSearchParams(location.search);
  const param = launchQuery.get('tgWebAppStartParam') || telegram?.initDataUnsafe?.start_param;
  const route = routes.find(item => param === 'route-' + item.id);
  const post = posts.find(item => param === 'post-' + item.id);
  if (route) return 'routes/' + route.id;
  if (post) return 'materials/' + post.id;
  if (param === 'season0') return 'season';
  return startScreen;
}

function applyTheme() {
  const systemDark = inTelegram ? telegram.colorScheme === 'dark' : deviceTheme.matches;
  document.documentElement.dataset.theme = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
  const background = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]').content = background;
  if (!inTelegram) return;
  telegramCall(() => { if (telegram.isVersionAtLeast?.('6.1')) telegram.setBackgroundColor(background); });
  telegramCall(() => { if (telegram.isVersionAtLeast?.('6.9')) telegram.setHeaderColor(background); });
}

let initialPage = launchPage();
const rootPages = ['home', 'materials', 'saved', 'community', 'directions', 'routes', 'cabinet', 'season',
  'notes', 'settings', 'platforms', 'progress', 'discord', 'support', 'faq'];

function currentPage() {
  const hash = location.hash.slice(1);
  const [path, search] = (hash && !hash.startsWith('tgWebApp') ? hash : initialPage).split('?');
  const [section, id] = path.split('/');
  const params = new URLSearchParams(search);
  const from = params.get('from');
  const sourceRoute = routes.find(route => 'route-' + route.id === from &&
    (route.next.href === '#' + path || route.steps.some(step => step.href === '#' + path)));
  const routeBack = sourceRoute && 'routes/' + sourceRoute.id;
  const directionBack = routeBack || (from === 'community' ? 'community' : 'directions');

  if (section === 'materials' && id) {
    const post = posts.find(item => String(item.id) === id);
    const source = ['saved', 'notes', 'progress'].includes(from) ? from : 'materials';
    if (post) return { section: 'post', item: post, back: routeBack || source };
  }
  if (section === 'directions' && id) {
    const direction = directions.find(item => item.id === id);
    if (direction) return { section: 'direction', item: direction, back: directionBack };
  }
  if (section === 'routes' && id) {
    const route = routes.find(item => item.id === id);
    if (route) return { section: 'route', item: route, back: 'routes' };
  }
  if (section === 'directions' || section === 'community' || section === 'platforms') {
    return { section, back: routeBack || 'home' };
  }
  if (section === 'discord') {
    return { section, back: from === 'platforms' ? 'platforms' : from === 'community' ? 'community' : 'home' };
  }
  if (section === 'faq') return { section, back: from === 'support' ? 'support' : 'home' };
  if (section === 'notes' || section === 'settings') return { section, back: 'cabinet' };
  return { section: rootPages.includes(section) ? section : 'home', back: 'home' };
}

function arrow(symbol = '›') {
  return `<span class="arrow" aria-hidden="true">${symbol}</span>`;
}

function backLink(path) {
  if (path === 'home') return '';
  const labels = {
    materials: 'К материалам', community: 'К сообществу', directions: 'К направлениям',
    platforms: 'К площадкам', routes: 'К маршрутам', saved: 'К сохранённому',
    notes: 'К заметкам', progress: 'К прогрессу', cabinet: 'В кабинет', support: 'К поддержке',
  };
  const text = path.startsWith('routes/') ? 'К маршруту' : labels[path] || 'Назад';
  return `<a class="back" href="#${path}">←&nbsp; ${text}</a>`;
}

function outbound(href) {
  return ' target="_blank" rel="noopener noreferrer"' + (href.startsWith('https://t.me/') ? ' data-telegram' : ' data-external');
}

function safeHref(value) {
  if (typeof value !== 'string') return '#home';
  if (value.startsWith('#')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '#home';
  } catch { return '#home'; }
}

function directionAvatar(src, size) {
  return src ? `<img class="direction-avatar" src="${escapeHtml(src)}" width="${size}" height="${size}" alt="">` : '';
}

function row(title, subtitle, href, external = false, { descriptionId, avatar } = {}) {
  href = safeHref(href);
  return `<a class="row${avatar ? ' row-avatar' : ''}" href="${escapeHtml(href)}"${external ? outbound(href) : ''}${descriptionId ? ' aria-describedby="' + escapeHtml(descriptionId) + '"' : ''}>
    ${directionAvatar(avatar, 36)}
    <span class="row-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></span>
    ${arrow(external ? '↗' : '→')}
  </a>`;
}

function directionRow(item, fromCommunity = false) {
  const external = fromCommunity && (item.telegramGroup || item.link);
  const href = external || '#directions/' + item.id + (fromCommunity ? '?from=community' : '');
  const subtitle = external && item.telegramGroup ? 'Группа в Telegram'
    : external ? item.subtitle + ' FAM в Telegram' : item.subtitle;
  return row(item.title, subtitle, href, Boolean(external), { avatar: item.avatar });
}

function stepKey(route, step) {
  // Отметка материала общая в библиотеке и маршрутах.
  if (step.href?.startsWith('#materials/')) return step.href.slice(1);
  return route.id + ':' + (step.id || step.href);
}

function completedCount(route) {
  return route.steps.filter(step => completed.has(stepKey(route, step))).length;
}

function nextStepIndex(route) {
  return route.steps.findIndex(step => !completed.has(stepKey(route, step)));
}

function home() {
  const active = routes.find(item => item.id === lastRoute && nextStepIndex(item) >= 0);
  const startLink = active ? '#routes/' + active.id : '#routes';
  const next = active?.steps[nextStepIndex(active)].title;
  return `<section class="intro" aria-labelledby="menu-title">
    <h1 id="menu-title">Меню FAM</h1>
    <p class="byline">Сергей Лисовский</p>
    <form id="home-search" class="home-search" role="search">
      <span class="magnifier" aria-hidden="true"></span>
      <input name="query" type="search" aria-label="Поиск по материалам" placeholder="Поиск по материалам" enterkeyhint="search">
      <button type="submit" aria-label="Найти">→</button>
    </form>
  </section>
  <nav class="card-grid home-shortcuts" aria-label="Площадки и закладки">
    ${row('Площадки', 'Соцсети и группы', '#platforms')}
    ${row('Сохранённое', 'Ваши закладки', '#saved')}
  </nav>
  <section class="feature" aria-labelledby="route-feature">
    <h2 id="route-feature">${active ? escapeHtml(active.title) : 'С чего начать'}</h2>
    <p>${next ? `Дальше — ${escapeHtml(next[0].toLocaleLowerCase('ru') + next.slice(1))}` : 'Три маршрута по материалам и направлениям FAM.'}</p>
    <div class="feature-actions">
      <a class="pill pill-solid" href="${startLink}">${active ? 'Продолжить маршрут' : 'Выбрать маршрут'} ${arrow('→')}</a>
      ${active ? '<a class="quiet-action" href="#routes">Все маршруты</a>' : ''}
    </div>
  </section>`;
}

function page(title, back, content, avatar) {
  title = escapeHtml(title);
  const heading = avatar ? `<h1 class="direction-heading">${directionAvatar(avatar, 54)}${title}</h1>` : `<h1>${title}</h1>`;
  return `<section class="page">${backLink(back)}${heading}${content}</section>`;
}

function materials({ section }) {
  const isSaved = section === 'saved';
  const filters = ['', ...new Set(posts.map(post => post.topic))];
  return page(isSaved ? 'Сохранённое' : 'Материалы', 'home', `
    ${isSaved ? '<p class="lead">Материалы, к которым Вы хотите вернуться.</p>' : ''}
    <input id="search" class="search" type="search" aria-label="Найти материал" placeholder="Найти материал">
    <div class="filters" role="group" aria-label="Темы">
      ${filters.map(topic => `<button type="button" class="filter" data-topic="${escapeHtml(topic)}" aria-pressed="${topic === collections[section].topic}">${escapeHtml(topic || 'Все')}</button>`).join('')}
    </div>
    <div class="list" id="results" aria-live="polite"></div>`);
}

function normalize(text) {
  return text.toLocaleLowerCase('ru').replaceAll('ё', 'е');
}

function fillMaterials() {
  const section = currentPage().section;
  const { query, topic } = collections[section];
  const isSaved = section === 'saved';
  const words = normalize(query.trim()).split(/\s+/);
  const matches = posts.filter(post => {
    const text = normalize(`${post.title} ${post.topic} ${post.summary}`);
    return (!isSaved || bookmarks.has(post.id)) &&
      (!topic || post.topic === topic) && words.every(word => text.includes(word));
  });
  document.querySelector('#results').innerHTML = matches.length
    ? matches.map(post => {
      const path = 'materials/' + post.id;
      const status = completed.has(path) ? ' · Прочитано' : '';
      const noteStatus = getNotes(post.id).length ? ' · Есть заметки' : '';
      return row(post.title, post.topic + ' · ' + post.date + status + noteStatus, '#' + path + (isSaved ? '?from=saved' : ''));
    }).join('')
    : isSaved && bookmarks.size === 0
      ? '<div class="empty"><p>Здесь появятся посты, которые Вы сохраните.</p><a class="pill" href="#materials">Открыть материалы</a></div>'
      : '<p class="empty">Материалы не найдены. Попробуйте другой запрос или тему.</p>';
}

function materialDetails(post, back) {
  const read = completed.has('materials/' + post.id);
  const bookmarked = bookmarks.has(post.id);
  return `<article class="page post">
    ${backLink(back)}
    <p class="eyebrow">${escapeHtml(post.topic)} · ${escapeHtml(post.date)}</p>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="lead">${escapeHtml(post.summary)}</p>
    <div class="actions">
      <a class="pill pill-solid" href="${channel}/${post.id}"${outbound(channel)}>Открыть пост ↗</a>
      <button class="pill" type="button" data-bookmark="${post.id}" aria-pressed="${bookmarked}">${bookmarked ? '✓ Сохранено' : 'Сохранить'}</button>
      <button class="pill" type="button" data-read="${post.id}" aria-pressed="${read}">${read ? '✓ Прочитано' : 'Отметить прочитанным'}</button>
    </div>
    ${notePanel(post)}
  </article>`;
}

function community({ back }) {
  const channelDirections = directions.filter(item => item.id === 'hype');
  const teamDirections = directions.filter(item => Object.hasOwn(item, 'telegramGroup'));
  return page('Сообщество', back, `
    <div class="section">
      <h2>Где читать</h2>
      <div class="card-grid">
        ${row('Сергей Лисовский', 'Авторский канал', channel, true)}
        ${channelDirections.map(item => directionRow(item, true)).join('')}
      </div>
    </div>
    <div class="section">
      <h2>Где участвовать</h2>
      <div class="card-grid">
        ${directions.filter(item => item.id === 'famind').map(item => directionRow(item, true)).join('')}
        ${teamDirections.map(item => directionRow(item, true)).join('')}
        ${row('Discord FAM', discordInvite ? 'Сервер сообщества' : 'Как получить приглашение', '#discord?from=community')}
      </div>
    </div>
    <div class="actions"><a class="quiet-action" href="#platforms">Все площадки FAM ›</a></div>`);
}

function directionIndex({ back }) {
  return page('Направления', back, `
    <div class="section card-grid">
      ${directions.map(item => directionRow(item)).join('')}
    </div>`);
}

function directionDetails(direction, back) {
  const link = direction.telegramGroup || direction.link;
  const action = link
    ? `<a class="pill pill-solid" href="${escapeHtml(safeHref(link))}"${outbound(safeHref(link))}>${direction.telegramGroup ? 'Открыть группу' : 'Открыть канал'} ↗</a>`
    : direction.id === 'projects' && back !== 'routes/project'
      ? '<a class="pill pill-solid" href="#routes/project">К маршруту проекта →</a>'
      : '';
  return page(direction.title, back, `
    <p class="lead">${escapeHtml(direction.description)}</p>
    ${action ? '<div class="actions">' + action + '</div>' : ''}`, direction.avatar);
}

function starSummary() {
  const stars = routes.filter(route => nextStepIndex(route) < 0).length;
  return `<section class="route-stars">
    <div><h2>Звёзды маршрутов</h2><p>По одной за все отметки в каждом маршруте.</p></div>
    <span class="star-count"><span aria-hidden="true">✦</span> ${stars} из ${routes.length}</span>
  </section>`;
}

function routeIndex() {
  return page('Маршруты', 'home', `
    ${starSummary()}
    <div class="list route-list">
      ${routes.map(item => {
        const done = completedCount(item);
        const status = done === item.steps.length ? ' · Завершён' : done ? ` · ${done} из ${item.steps.length}` : '';
        return row(item.title, item.description + status, '#routes/' + item.id);
      }).join('')}
    </div>`);
}

function routeDetails(route, back) {
  if (lastRoute !== route.id) {
    lastRoute = route.id;
    saveState();
  }
  return page(route.title, back, `
    <p class="lead">${escapeHtml(route.description)}</p>
    <div class="route-state">
      <p class="route-progress" id="route-progress" role="status">${progressText(route)}</p>
      <progress id="route-meter" value="${completedCount(route)}" max="${route.steps.length}" aria-label="Отмеченные шаги"></progress>
    </div>
    <ol class="route-steps">
      ${route.steps.map((step, index) => {
        const marked = completed.has(stepKey(route, step));
        const link = step.href?.startsWith('#') ? step.href + '?from=route-' + route.id : step.href;
        const external = link?.startsWith('https:');
        const title = link
          ? `<a href="${escapeHtml(safeHref(link))}"${external ? outbound(safeHref(link)) : ''}>${escapeHtml(step.title)}${external ? ' ↗' : ''}</a>`
          : escapeHtml(step.title);
        return `<li class="route-step"${index === nextStepIndex(route) ? ' data-next' : ''}>
          <span class="step-no" aria-hidden="true">${index + 1}</span>
          <div class="step-copy"><h2>${title}</h2><p>${escapeHtml(step.text || step.type)}</p></div>
          <button class="step-check" type="button" data-step="${index}" aria-label="Отметить шаг ${index + 1}: ${escapeHtml(step.title)}" aria-pressed="${marked}"></button>
        </li>`;
      }).join('')}
    </ol>
    <div class="actions">
      <a class="quiet-action" href="${escapeHtml(safeHref(route.next.href + '?from=route-' + route.id))}">${escapeHtml(route.next.label)} ›</a>
    </div>`);
}

function progressText(route) {
  const done = completedCount(route);
  return done === route.steps.length ? '✦ Звезда получена' : `${done} из ${route.steps.length} шагов · Отметьте все, чтобы получить звезду`;
}

function readingProgress() {
  const read = posts.filter(post => completed.has('materials/' + post.id)).length;
  return { read, percent: posts.length ? Math.floor(100 * read / posts.length) : 0 };
}

function progressPage({ back }) {
  const { read, percent } = readingProgress();
  const next = posts.find(post => !completed.has('materials/' + post.id));
  return page('Прогресс', back, `
    <div class="reading-progress route-state">
      <strong>${percent}%</strong>
      <p>Прочитано ${read} из ${posts.length} материалов</p>
      <progress value="${read}" max="${posts.length || 1}" aria-label="Прочитанные материалы"></progress>
    </div>
    ${next ? `<section class="section"><h2>Следующий материал</h2><div class="list">
      ${row(next.title, next.topic, '#materials/' + next.id + '?from=progress')}
    </div></section>` : ''}
    <div class="actions"><a class="quiet-action" href="#materials">Все материалы ›</a></div>`);
}

function cabinet() {
  const noteTotal = [...notes.values()].reduce((total, items) => total + items.length, 0);
  return page('Кабинет', 'home', `
    ${starSummary()}
    <div class="section list">
      ${row('Прогресс', 'Отметки по материалам', '#progress')}
      ${row('Заметки', 'Всего ' + noteTotal, '#notes')}
      ${row('Настройки', 'Тема, размер текста и экран при открытии', '#settings')}
    </div>
    <p class="fine-print">Прогресс и настройки хранятся в этом браузере.</p>`);
}

function settings({ back }) {
  return page('Настройки', back, `
    <div class="settings-list">
      <fieldset class="setting">
        <legend>Тема</legend>
        <div class="theme-options">
          ${Object.entries(themeOptions).map(([value, label]) => `
            <label class="theme-option"><input type="radio" name="fam-theme" value="${value}"${theme === value ? ' checked' : ''}><span>${label}</span></label>
          `).join('')}
        </div>
        <p>«Авто» подстраивается под тему Telegram или устройства.</p>
      </fieldset>
      <label class="setting setting-switch">
        <span><strong>Крупный текст</strong><small>Увеличивает текст в материалах и списках.</small></span>
        <input name="fam-large-text" type="checkbox" role="switch"${largeText ? ' checked' : ''}>
      </label>
      <div class="setting">
        <label for="start-screen">При открытии</label>
        <select id="start-screen" name="fam-start-screen">
          ${Object.entries(startOptions).map(([value, label]) => `<option value="${value}"${startScreen === value ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
        <p>Прямые ссылки по-прежнему открывают нужный раздел.</p>
      </div>
    </div>
    <p class="fine-print">Настройки сохраняются на этом устройстве.</p>
    <p id="settings-status" class="form-status" role="status"></p>`);
}

function platformIndex({ back }) {
  return page('FAM на площадках', back, `
    <div class="platform-groups">
    ${platforms.map(group => `<section class="section">
      <h2>${escapeHtml(group.title)}</h2>
      <div class="card-grid">${group.links.map(([name, detail, href]) =>
        row(name, detail, href === '#discord' ? '#discord?from=platforms' : href,
          href.startsWith('https://'), { descriptionId: name === 'Instagram*' ? 'instagram-notice' : '' })).join('')}</div>
    </section>`).join('')}
    </div>
    <p class="platform-notice" id="instagram-notice">${escapeHtml(instagramNotice)}</p>`);
}

function discordPage({ back }) {
  const action = discordInvite
    ? `<a class="pill pill-solid" href="${discordInvite}"${outbound(discordInvite)}>Открыть Discord ↗</a>`
    : `<a class="pill pill-solid" href="${manager}"${outbound(manager)}>Попросить приглашение ↗</a>`;
  return page('Discord FAM', back, `
    <p class="lead">${discordInvite ? 'Сервер сообщества FAM.' : 'Актуальное приглашение можно попросить у менеджера FAM.'}</p>
    <div class="actions">${action}</div>`);
}

function support() {
  return page('Поддержка', 'home', `
    <p class="lead">Если возник вопрос по FAM или что-то не открывается, напишите менеджеру в Telegram.</p>
    <div class="actions">
      <a class="pill pill-solid" href="${manager}"${outbound(manager)}>Написать менеджеру ↗</a>
    </div>`);
}

function faq({ back }) {
  const items = [
    ['Как считается прогресс?', 'Процент показывает, какую часть каталога Вы отметили прочитанной. Список закладок открывается через «Сохранённое» на главной.'],
    ['Где найти свои заметки?', 'Откройте материал и прокрутите к заметкам под кнопками. Все записи по материалам также собраны в разделе «Заметки» в кабинете.'],
    ['Когда начисляется звезда?', 'За маршрут начисляется одна звезда после отметки всех его шагов. Счёт виден в кабинете.'],
  ];
  return page('Вопросы и ответы', back, `
    <div class="section faq-list">${items.map(([question, answer]) =>
      `<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}</div>`);
}

function season(back) {
  return page('Сезон 0', back, '<p class="lead">Скоро</p>');
}

const renderers = {
  home,
  materials,
  saved: materials,
  notes: notesIndex,
  post: ({ item, back }) => materialDetails(item, back),
  community,
  directions: directionIndex,
  direction: ({ item, back }) => directionDetails(item, back),
  routes: routeIndex,
  route: ({ item, back }) => routeDetails(item, back),
  cabinet,
  settings,
  platforms: platformIndex,
  progress: progressPage,
  discord: discordPage,
  support,
  faq,
  season: ({ back }) => season(back),
};

function render() {
  const page = currentPage();
  document.documentElement.toggleAttribute('data-large-text', largeText);
  screen.innerHTML = renderers[page.section](page);
  if (Object.hasOwn(collections, page.section)) {
    screen.querySelector('#search').value = collections[page.section].query;
    fillMaterials();
  }
  const activeSection = {
    post: 'materials',
    direction: page.back === 'community' ? 'community' : 'directions',
    discord: page.back === 'community' ? 'community' : 'discord',
    notes: 'cabinet',
    settings: 'cabinet',
  }[page.section] || page.section;
  for (const link of navigationLinks) {
    if (link.dataset.nav === activeSection) link.setAttribute('aria-current', activeSection === page.section ? 'page' : 'location');
    else link.removeAttribute('aria-current');
  }
  progressPercent.textContent = readingProgress().percent + '%';
  if (inTelegram) {
    telegramCall(() => { if (page.section === 'home') telegram.BackButton?.hide(); else telegram.BackButton?.show(); });
  }
}

function toggleStored(set, key) {
  const marked = !set.has(key);
  if (marked) set.add(key);
  else set.delete(key);
  saveState();
  if (set === completed) progressPercent.textContent = readingProgress().percent + '%';
  return marked;
}

function openInTelegram(link) {
  const telegramLink = link.hasAttribute('data-telegram');
  const method = telegramLink ? 'openTelegramLink' : 'openLink';
  if (inTelegram && typeof telegram[method] === 'function' && telegramCall(() => telegram[method](link.href))) return true;
  const proxy = window.TelegramWebviewProxy;
  if (!telegramLink || typeof proxy?.postEvent !== 'function' || !link.href.startsWith('https://t.me/')) return false;
  const url = new URL(link.href);
  return telegramCall(() => proxy.postEvent('web_app_open_tg_link', JSON.stringify({ path_full: url.pathname + url.search })));
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-telegram], a[data-external]');
  if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && openInTelegram(link)) {
    event.preventDefault();
    return;
  }

  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-topic')) {
    collections[currentPage().section].topic = button.dataset.topic;
    for (const option of screen.querySelectorAll('[data-topic]')) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    fillMaterials();
  } else if (button.dataset.bookmark) {
    const marked = toggleStored(bookmarks, Number(button.dataset.bookmark));
    button.setAttribute('aria-pressed', String(marked));
    button.textContent = marked ? '✓ Сохранено' : 'Сохранить';
  } else if (button.dataset.read) {
    const marked = toggleStored(completed, 'materials/' + button.dataset.read);
    button.setAttribute('aria-pressed', String(marked));
    button.textContent = marked ? '✓ Прочитано' : 'Отметить прочитанным';
  } else if (button.hasAttribute('data-step')) {
    const route = currentPage().item;
    const step = route.steps[Number(button.dataset.step)];
    const marked = toggleStored(completed, stepKey(route, step));
    button.setAttribute('aria-pressed', String(marked));
    screen.querySelector('#route-progress').textContent = progressText(route);
    screen.querySelector('#route-meter').value = completedCount(route);
    const next = nextStepIndex(route);
    screen.querySelectorAll('.route-step').forEach((row, index) => row.toggleAttribute('data-next', next === index));
  } else {
    handleNoteButton(button, currentPage());
  }
});

screen.addEventListener('input', event => {
  if (event.target.id === 'note-text') { rememberNoteDraft(); return; }
  if (event.target.id !== 'search') return;
  collections[currentPage().section].query = event.target.value;
  fillMaterials();
});

screen.addEventListener('change', ({ target }) => {
  if (target.name === 'fam-theme') {
    theme = target.value;
    applyTheme();
  } else if (target.name === 'fam-large-text') {
    largeText = target.checked;
    document.documentElement.toggleAttribute('data-large-text', largeText);
  } else if (target.name === 'fam-start-screen') {
    startScreen = target.value;
  } else return;
  screen.querySelector('#settings-status').textContent = saveState() ? '' : 'Не удалось сохранить настройки на этом устройстве.';
});

screen.addEventListener('submit', event => {
  if (event.target.id === 'home-search') {
    event.preventDefault();
    collections.materials = { query: event.target.elements.query.value.trim(), topic: '' };
    location.hash = 'materials';
    return;
  }
  if (event.target.id === 'note-form') {
    event.preventDefault();
    submitNote(event.target, currentPage());
  }
});

window.addEventListener('hashchange', () => {
  editingNote = null;
  render();
  screen.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});

function telegramCall(action) {
  try { action(); return true; } catch { return false; }
}

function connectTelegram() {
  telegram = window.Telegram?.WebApp;
  inTelegram = Boolean(telegram?.platform && telegram.platform !== 'unknown');
  if (!inTelegram) return;
  telegramCall(() => telegram.onEvent?.('themeChanged', () => { if (theme === 'auto') applyTheme(); }));
  telegramCall(() => {
    if (telegram.isVersionAtLeast?.('7.0')) {
      telegram.SettingsButton?.show();
      telegram.SettingsButton?.onClick(() => { location.hash = 'settings'; });
    }
  });
  telegramCall(() => telegram.BackButton?.onClick(() => { location.hash = currentPage().back; }));
  if (!location.hash || location.hash.startsWith('#tgWebApp')) {
    initialPage = launchPage();
    render();
  }
  applyTheme();
  telegramCall(() => { if (currentPage().section === 'home') telegram.BackButton?.hide(); else telegram.BackButton?.show(); });
  telegramCall(() => telegram.ready());
}

function loadTelegramSdk() {
  const sdk = document.createElement('script');
  sdk.src = 'https://telegram.org/js/telegram-web-app.js?65';
  sdk.async = true;
  sdk.addEventListener('load', connectTelegram);
  document.head.append(sdk);
}

deviceTheme.addEventListener?.('change', () => { if (!inTelegram && theme === 'auto') applyTheme(); });
if (new URLSearchParams(location.search).get('mark') === 'stripes') document.documentElement.dataset.mark = 'stripes';
applyTheme();
render();
if (telegram) connectTelegram();
else if (document.readyState === 'complete') loadTelegramSdk();
// A pending SDK request must not keep Telegram Desktop's page loader visible.
else window.addEventListener('load', () => setTimeout(loadTelegramSdk, 0), { once: true });
