function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

function personalId() {
  return globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function getNotes(id) {
  return notes.get(id) ?? [];
}

const noteDrafts = new Map();
function noteDraftKey(id, edit = editingNote) { return id + ':' + (edit || 'new'); }
function rememberNoteDraft() {
  const page = currentPage();
  const input = screen.querySelector('#note-text');
  if (page.section === 'post' && input) noteDrafts.set(noteDraftKey(page.item.id), input.value);
}

function notePanel(post) {
  const existing = getNotes(post.id);
  const edit = existing.find(note => note.id === editingNote);
  return `<section class="section notes-panel" aria-labelledby="notes-heading">
    <h2 id="notes-heading">Заметки к материалу</h2>
    ${existing.length ? `<div class="note-list">${existing.map(note => `
      <article class="note">
        <p>${escapeHtml(note.text)}</p>
        <div class="item-links">
          <button type="button" data-note-edit="${note.id}">Изменить</button>
          <button type="button" data-note-delete="${note.id}">Удалить</button>
        </div>
      </article>`).join('')}</div>` : ''}
    ${undoNotice(post.id)}
    <form id="note-form" class="personal-form">
      <label for="note-text">${edit ? 'Изменить заметку' : 'Что хотите запомнить?'}</label>
      <textarea id="note-text" name="text" rows="3" maxlength="1000" required placeholder="Мысль из поста или свой вывод">${escapeHtml(noteDrafts.get(noteDraftKey(post.id, edit?.id)) ?? edit?.text ?? '')}</textarea>
      <div class="item-links">
        <button class="pill" type="submit">${edit ? 'Сохранить изменения' : 'Добавить заметку'}</button>
        ${edit ? '<button type="button" data-note-cancel>Отмена</button>' : ''}
      </div>
      <p id="note-status" class="form-status" role="status"></p>
    </form>
  </section>`;
}

function notesIndex() {
  const groups = posts.filter(post => getNotes(post.id).length);
  return page('Заметки', 'cabinet', groups.length
    ? `<div class="notes-index">${groups.map(post => `
      <section class="section note">
        <h2>${escapeHtml(post.title)}</h2>
        <ul>${getNotes(post.id).map(note => `<li>${escapeHtml(note.text)}</li>`).join('')}</ul>
        <a class="quiet-action" href="#materials/${post.id}?from=notes">Открыть материал ›</a>
      </section>`).join('')}</div>`
    : '<p class="lead">Здесь будут Ваши выводы по материалам.</p><div class="actions"><a class="pill" href="#materials">Открыть материалы</a></div>');
}

function undoNotice(postId) {
  if (undo?.postId !== postId) return '';
  return `<div class="undo-bar" role="status"><span>Заметка удалена</span>
    <button type="button" data-undo>Отменить удаление</button></div>`;
}

function handleNoteButton(button, page) {
  if (page.section !== 'post') return;
  if (button.dataset.noteEdit || button.hasAttribute('data-note-cancel')) {
    if (button.hasAttribute('data-note-cancel')) noteDrafts.delete(noteDraftKey(page.item.id));
    editingNote = button.dataset.noteEdit || null;
    render();
    screen.querySelector('#note-text').focus();
  } else if (button.dataset.noteDelete) {
    const items = getNotes(page.item.id);
    const index = items.findIndex(note => note.id === button.dataset.noteDelete);
    if (index < 0) return;
    undo = { value: items[index], index, postId: page.item.id };
    if (editingNote === items[index].id) editingNote = null;
    items.splice(index, 1);
    saveState();
    render();
    screen.querySelector('[data-undo]').focus({ preventScroll: true });
  } else if (button.hasAttribute('data-undo') && undo) {
    const items = getNotes(undo.postId);
    items.splice(undo.index, 0, undo.value);
    undo = null;
    saveState();
    render();
  }
}

function submitNote(form, page) {
  const text = form.elements.text.value.trim();
  if (!text || text.length > 1000) {
    screen.querySelector('#note-status').textContent = 'Введите заметку длиной от 1 до 1000 символов.';
    return;
  }
  const id = page.item.id;
  const items = getNotes(id);
  const existing = items.find(note => note.id === editingNote);
  if (existing) existing.text = text;
  else items.push({ id: personalId(), text });
  notes.set(id, items);
  noteDrafts.delete(noteDraftKey(id));
  editingNote = null;
  const persisted = saveState();
  render();
  screen.querySelector('#note-text').focus({ preventScroll: true });
  screen.querySelector('#note-status').textContent = persisted ? 'Заметка сохранена' : 'Заметка доступна до перезагрузки';
}
