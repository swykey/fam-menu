const channel = 'https://t.me/sergeylisowsky';
const hype = 'https://t.me/famhype';
const manager = 'https://t.me/fam_assistant';
const discordInvite = '';
const instagramNotice = '* Деятельность Meta Platforms Inc. по реализации Instagram и Facebook запрещена в РФ.';

const platforms = [
  { title: 'Каналы и соцсети', links: [
    ['Telegram', 'Авторский канал', channel],
    ['Группа VK', 'Сообщество', 'https://vk.ru/sergeylisowsky'],
    ['ВКонтакте', 'Личная страница', 'https://vk.ru/sergey_lisowsky'],
    ['Threads', '@sergeylisowsky', 'https://threads.com/@sergeylisowsky'],
    ['X (Twitter)', '@sergeylisowsky', 'https://twitter.com/sergeylisowsky'],
    ['Instagram*', '@sergeylisowsky', 'https://instagram.com/sergeylisowsky'],
  ] },
  { title: 'Видео', links: [
    ['YouTube', '@sergeylisowsky', 'https://www.youtube.com/@sergeylisowsky'],
    ['Rutube', 'Канал', 'https://rutube.ru/channel/61420515'],
  ] },
  { title: 'Сообщества FAM', links: [
    ['Steam', 'Группа FAMultiverse', 'https://steamcommunity.com/groups/FAMultiverse'],
    ['Discord FAM', discordInvite ? 'Сервер сообщества' : 'Получить приглашение', '#discord'],
  ] },
];

const directions = [
  { id: 'cs2', title: 'FAM CS2', subtitle: 'Игра и команда', description: 'Поиск тиммейтов для FACEIT, практика командной игры и материалы по картам, гранатам и позициям.', telegramGroup: '', avatar: 'assets/fam-cs2-avatar.png' },
  { id: 'dota2', title: 'FAM Dota 2', subtitle: 'Пати и командная игра', description: 'Сообщество для игроков Dota 2.', telegramGroup: '', avatar: 'assets/fam-dota2-avatar.png' },
  { id: 'famind', title: 'FAMIND', subtitle: 'Идеи и обсуждения', description: 'Направление для вопросов, идей и предложений о развитии FAM.', avatar: 'assets/fam-mind-avatar.png' },
  { id: 'hype', title: 'FAM HYPE', subtitle: 'Медиа', description: 'Медийное направление FAM. Публикации выходят в отдельном канале.', link: hype, avatar: 'assets/fam-hype-avatar.png' },
  { id: 'edits', title: 'FAM EDITS', subtitle: 'Видеомонтаж', description: 'Направление FAM, связанное с видеомонтажом.', avatar: 'assets/fam-edits-avatar.png' },
  { id: 'projects', title: 'FAM PROJECTS', subtitle: 'Совместные инициативы', description: 'Направление для идей, которые можно превратить в совместный проект.', avatar: 'assets/fam-projects-avatar.png' },
  { id: 'agency', title: 'FAM AGENCY', subtitle: 'Услуги и сотрудничество', description: 'Клиентское направление FAM. Форматы услуг уточняются.', avatar: 'assets/fam-agency-avatar.png' },
];

const routes = [
  {
    id: 'practice',
    title: 'Узнать новое',
    description: 'От двух коротких постов к своей практике.',
    next: { label: 'К сообществу', href: '#community' },
    steps: [
      { title: 'Понять, куда уходит энергия', type: 'Материал', href: '#materials/13' },
      { title: 'Разобраться с регулярностью', type: 'Материал', href: '#materials/107' },
      { id: 'repeatable-action', title: 'Выбрать одно повторяемое действие', type: 'Практика', text: 'Возьмите занятие, которое хотите делать регулярно. Определите, что сможете повторить завтра и в какой момент дня.' },
    ],
  },
  {
    id: 'community',
    title: 'Познакомиться с FAM',
    description: 'Узнать, чем занимаются направления и где выходят публикации.',
    next: { label: 'Открыть площадки FAM', href: '#platforms' },
    steps: [
      { title: 'Посмотреть карту направлений', type: 'Направления', href: '#directions' },
      { title: 'Выбрать, где участвовать', type: 'Сообщество', href: '#community' },
      { title: 'Заглянуть в FAM HYPE', type: 'Telegram', href: hype },
    ],
  },
  {
    id: 'project',
    title: 'Сделать что-то вместе',
    description: 'От идеи к первому шагу в совместном проекте.',
    next: { label: 'К сообществу', href: '#community' },
    steps: [
      { title: 'Прочитать заметку о том, как создавать своё', type: 'Материал', href: '#materials/47' },
      { title: 'Разобраться, что такое FAM PROJECTS', type: 'Направление', href: '#directions/projects' },
      { id: 'first-step', title: 'Сформулировать свой первый шаг', type: 'Практика', text: 'В одном предложении опишите, что хотите сделать. Отдельно запишите, что можете начать сами и какая помощь пригодится.' },
    ],
  },
];
