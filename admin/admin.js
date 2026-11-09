import { renderPost, safeURL, postBlocks } from '../blog/post.js';

const REPO = 'Inomjonov/Inomjonov.github.io';
const BRANCH = 'main';
const PATH = 'data/posts.json';
const DRAFT = 'inomjonov-blog-draft-v1';
let blocks = [];
const files = new Map();
let previewURLs = [];
const $ = id => document.getElementById(id);
let token = '', posts = [], sha = '', editing = null, busy = false;

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  // The status line sits above a long editor; an unseen error reads as "nothing happened".
  if (error) $('status').scrollIntoView({ block: 'center', behavior: 'smooth' });
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    cache: 'no-store',
  });
  if (!response.ok) {
    // GitHub explains the real cause in the body; without it every failure looks the same.
    let detail = '';
    try {
      const body = await response.json();
      detail = [body.message, ...(body.errors || []).map(item => item.message || item.code)].filter(Boolean).join(' — ');
    } catch { /* Error bodies are not always JSON. */ }
    const said = detail ? ` GitHub said: ${detail}` : '';
    if (response.status === 409 || response.status === 422) throw new Error(`The repository changed or rejected the commit. Sign out and back in to reload posts; your draft is saved.${said}`);
    if (response.status === 401) throw new Error(`Your GitHub token is invalid or expired. Sign out and sign in with a valid token.${said}`);
    if (response.status === 403) throw new Error(`GitHub denied this request (403). Check that the token grants Contents: Read and write on this repository, has not expired, and — for a fine-grained token on an organisation — has been approved.${said}`);
    if (response.status === 404) throw new Error(`GitHub returned 404. A fine-grained token that cannot see this repository reports it as missing, so check the token's repository access.${said}`);
    throw new Error(`GitHub request failed (${response.status}).${said}`);
  }
  return response.json();
}

function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function loadPosts() {
  const file = await api(`/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`);
  if (!file.content) throw new Error('The posts file is too large for this editor. Split or archive older posts before continuing.');
  const decoded = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), char => char.charCodeAt(0)));
  const loaded = JSON.parse(decoded);
  if (!Array.isArray(loaded)) throw new Error('The posts file has an invalid format.');
  posts = loaded;
  sha = file.sha;
}

async function savePosts(next, message) {
  const content = JSON.stringify(next, null, 2) + '\n';
  if (new TextEncoder().encode(content).length > 900000) throw new Error('The posts file is full. Archive older posts before publishing more.');
  const result = await api(`/repos/${REPO}/contents/${PATH}`, {
    method: 'PUT', body: JSON.stringify({ message, content: encode(content), sha, branch: BRANCH }),
  });
  sha = result.content.sha;
  posts = next;
  listPosts();
}

function draft() {
  return { title: $('title').value.trim(), blocks: blocks.map(block => ({ ...block })), id: editing };
}

function saveDraft() {
  try { localStorage.setItem(DRAFT, JSON.stringify(draft())); }
  catch { status('Browser storage is unavailable. Keep this tab open to preserve your draft.', true); }
}

function setBlocks(post) {
  files.clear();
  blocks = postBlocks(post).map(block => ({ ...block, id: block.id || crypto.randomUUID() }));
  if (!blocks.length) blocks.push({ type: 'text', text: '', id: crypto.randomUUID() });
  renderBlocks();
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    if (saved) {
      $('title').value = saved.title || '';
      editing = saved.id || null;
      setBlocks(saved);
      $('editor-heading').textContent = editing ? 'Edit post' : 'New post';
      return;
    }
  } catch { /* An invalid draft must not prevent signing in. */ }
  setBlocks({});
}

function clearPreview() {
  previewURLs.forEach(url => URL.revokeObjectURL(url));
  previewURLs = [];
  $('preview').replaceChildren();
  $('preview-panel').hidden = true;
}

function reset(clearDraft = true) {
  $('title').value = '';
  editing = null;
  $('editor-heading').textContent = 'New post';
  clearPreview();
  setBlocks({});
  if (clearDraft) {
    try { localStorage.removeItem(DRAFT); } catch { /* Storage may be disabled. */ }
  }
}

function hasDraft() {
  return $('title').value || files.size || blocks.some(block => block.text || block.image || block.link || block.imageAlt || block.linkLabel);
}

function renderBlocks() {
  $('blocks').replaceChildren();
  blocks.forEach((block, index) => {
    const section = document.createElement('section');
    section.className = 'content-block';
    const heading = document.createElement('h3');
    heading.textContent = `${index + 1}. ${block.type[0].toUpperCase() + block.type.slice(1)}`;
    section.append(heading);
    function input(key, labelText, multiline = false) {
      const id = `block-${block.id}-${key}`;
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = labelText;
      const control = document.createElement(multiline ? 'textarea' : 'input');
      control.id = id;
      control.value = block[key] || '';
      if (multiline) control.rows = 6;
      control.addEventListener('input', () => { block[key] = control.value; });
      section.append(label, control);
    }
    if (block.type === 'text') input('text', 'Text', true);
    if (block.type === 'image') {
      input('image', 'Image URL (HTTPS), or upload below');
      const label = document.createElement('label');
      const upload = document.createElement('input');
      upload.type = 'file';
      upload.id = `block-${block.id}-upload`;
      upload.accept = 'image/jpeg,image/png,image/webp,image/gif';
      label.htmlFor = upload.id;
      label.textContent = 'Upload image (up to 5 MB)';
      const note = document.createElement('p');
      note.className = 'muted';
      const file = files.get(block.id);
      note.textContent = file ? `${file.name} selected. Select it again after refreshing.` : 'JPEG, PNG, WebP, or GIF. Uploaded when you publish.';
      upload.addEventListener('change', () => {
        const selected = upload.files[0];
        if (selected && !validImage(selected)) {
          upload.value = '';
          files.delete(block.id);
          note.textContent = 'No file selected.';
          status('Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.', true);
          return;
        }
        if (selected) files.set(block.id, selected);
        else files.delete(block.id);
        note.textContent = selected ? `${selected.name} selected. Select it again after refreshing.` : 'No file selected.';
      });
      section.append(label, upload, note);
      input('imageAlt', 'Image description / caption');
    }
    if (block.type === 'link') {
      input('link', 'Link URL (HTTP or HTTPS)');
      input('linkLabel', 'Link text');
    }
    const actions = document.createElement('div');
    actions.className = 'actions block-actions';
    for (const [text, name, action] of [
      ['↑', 'Move block up', () => moveBlock(index, -1)],
      ['↓', 'Move block down', () => moveBlock(index, 1)],
      ['Remove', 'Remove block', () => {
        if (!confirm('Remove this content block?')) return;
        files.delete(block.id);
        blocks.splice(index, 1);
        renderBlocks();
        saveDraft();
      }],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.setAttribute('aria-label', name);
      if ((text === '↑' && index === 0) || (text === '↓' && index === blocks.length - 1)) button.dataset.boundary = 'true';
      button.disabled = busy || button.dataset.boundary === 'true';
      button.addEventListener('click', action);
      actions.append(button);
    }
    section.append(actions);
    $('blocks').append(section);
  });
}

function moveBlock(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return;
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
  renderBlocks();
  saveDraft();
}

for (const type of ['text', 'image', 'link']) {
  $(`add-${type}`).addEventListener('click', () => {
    blocks.push({ type, id: crypto.randomUUID() });
    renderBlocks();
    saveDraft();
    $('blocks').lastElementChild.querySelector('input, textarea')?.focus();
  });
}

async function run(action) {
  if (busy) { status('Still working on the previous action. Please wait.', true); return; }
  busy = true;
  document.querySelectorAll('button, input, textarea').forEach(control => { control.disabled = true; });
  try { await action(); }
  catch (error) { status(error.message || 'Something went wrong. Please try again.', true); }
  finally {
    busy = false;
    document.querySelectorAll('button, input, textarea').forEach(control => { control.disabled = control.dataset.boundary === 'true'; });
  }
}

$('login-form').addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    status('Signing in…');
    token = $('token').value.trim();
    $('token').value = '';
    try {
      const user = await api('/user');
      const repo = await api(`/repos/${REPO}`);
      if (!repo.permissions?.push) throw new Error('This GitHub account does not have write access to the site repository.');
      await loadPosts();
      $('identity').textContent = `Signed in as ${user.login}`;
      $('login-panel').hidden = true;
      $('workspace').hidden = false;
      restoreDraft();
      listPosts();
      status('Ready to write.');
    } catch (error) { token = ''; throw error; }
  });
});

$('logout').addEventListener('click', () => {
  saveDraft();
  token = '';
  posts = [];
  sha = '';
  reset(false);
  $('workspace').hidden = true;
  $('login-panel').hidden = false;
  $('post-list').replaceChildren();
  status('Signed out.');
});

$('editor').addEventListener('input', saveDraft);
$('new-post').addEventListener('click', () => {
  if (hasDraft() && !confirm('Discard this draft and start a new post?')) return;
  reset();
  status('New post.');
});

$('preview-button').addEventListener('click', () => {
  clearPreview();
  const images = new Map();
  for (const [id, file] of files) {
    const url = URL.createObjectURL(file);
    previewURLs.push(url);
    images.set(id, url);
  }
  const post = { ...draft(), createdAt: posts.find(p => p.id === editing)?.createdAt || new Date().toISOString() };
  $('preview').replaceChildren(renderPost(post, images));
  $('preview-panel').hidden = false;
});

function validImage(file) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024;
}

async function uploadImage(file) {
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const path = `images/blog/${crypto.randomUUID()}.${extensions[file.type]}`;
  const content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('The image could not be read. Please select it again.'));
    reader.readAsDataURL(file);
  });
  await api(`/repos/${REPO}/contents/${path}`, {
    method: 'PUT', body: JSON.stringify({ message: `Upload blog image: ${file.name}`, content, branch: BRANCH }),
  });
  // Both the editor and blog live one directory below the site root.
  return `../${path}`;
}

$('editor').addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    saveDraft();
    const value = draft();
    if (!value.title || !value.blocks.length) throw new Error('Add a title and at least one content block.');
    for (const block of value.blocks) {
      if (block.type === 'text' && !block.text?.trim()) throw new Error('Write something in each text block, or remove empty blocks.');
      if (block.type === 'link' && (!block.link?.trim() || !safeURL(block.link))) throw new Error('Add an HTTP or HTTPS URL to each link block.');
      if (block.type === 'image') {
        const file = files.get(block.id);
        if (!file && (!block.image || !safeURL(block.image, true))) throw new Error('Add an HTTPS URL or upload to each image block.');
        if (file && !validImage(file)) throw new Error('Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.');
        if (!block.imageAlt?.trim()) throw new Error('Add a description to each image block.');
      }
    }
    status('Publishing… Keep this tab open.');
    if (editing && !posts.some(p => p.id === editing)) throw new Error('This post no longer exists. Use Clear / new post to start again.');
    for (const block of value.blocks) {
      const file = files.get(block.id);
      if (!file) continue;
      block.image = await uploadImage(file);
      // Preserve each successful upload if a later upload or post commit fails.
      blocks.find(item => item.id === block.id).image = block.image;
      files.delete(block.id);
      renderBlocks();
      document.querySelectorAll('button, input, textarea').forEach(control => { control.disabled = true; });
      saveDraft();
    }
    const existing = posts.find(post => post.id === editing);
    const post = { ...value, id: editing || crypto.randomUUID(), createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = existing ? posts.map(item => item.id === editing ? post : item) : [post, ...posts];
    await savePosts(next, `${existing ? 'Update' : 'Publish'} blog post: ${post.title}`);
    reset();
    status('Published to GitHub. The blog will update when GitHub Pages finishes deploying.');
  });
});

function listPosts() {
  $('post-list').replaceChildren();
  if (!posts.length) { $('post-list').textContent = 'No published posts yet.'; return; }
  for (const post of [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
    const row = document.createElement('div');
    row.className = 'post-row';
    const title = document.createElement('span');
    title.textContent = post.title;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      if (hasDraft() && !confirm('Replace your current draft with this post?')) return;
      reset();
      editing = post.id;
      $('title').value = post.title || '';
      setBlocks(post);
      $('editor-heading').textContent = 'Edit post';
      saveDraft();
      $('title').focus();
    });
    const remove = document.createElement('button');
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      if (!confirm(`Delete “${post.title}” from the public blog?`)) return;
      run(async () => {
        status('Deleting…');
        await savePosts(posts.filter(item => item.id !== post.id), `Delete blog post: ${post.title}`);
        if (editing === post.id) reset();
        status('Post deleted. GitHub Pages will update shortly.');
      });
    });
    actions.append(edit, remove);
    row.append(title, actions);
    $('post-list').append(row);
  }
}

window.addEventListener('beforeunload', event => {
  if (busy) { event.preventDefault(); event.returnValue = ''; }
});
