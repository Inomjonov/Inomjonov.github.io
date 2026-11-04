import { renderPost, safeURL } from '../blog/post.js';

const REPO = 'Inomjonov/Inomjonov.github.io';
const BRANCH = 'main';
const PATH = 'data/posts.json';
const DRAFT = 'inomjonov-blog-draft-v1';
const fields = ['title', 'text', 'image', 'imageAlt', 'link', 'linkLabel'];
const $ = id => document.getElementById(id);
let token = '', posts = [], sha = '', editing = null, busy = false;

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 409 || response.status === 422) throw new Error('The repository changed or rejected the commit. Sign out and back in to reload posts; your draft is saved.');
    if (response.status === 401) throw new Error('Your GitHub token is invalid or expired. Sign out and sign in with a valid token.');
    if (response.status === 403) throw new Error('GitHub denied this request. Check Contents: Read and write permission, token expiration, and API rate limits.');
    throw new Error(`GitHub request failed (${response.status}). Check repository access and branch rules, then try again.`);
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
  return { ...Object.fromEntries(fields.map(field => [field, $(field).value.trim()])), id: editing };
}

function saveDraft() {
  try { localStorage.setItem(DRAFT, JSON.stringify(draft())); }
  catch { status('Browser storage is unavailable. Keep this tab open to preserve your draft.', true); }
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    if (saved) {
      for (const field of fields) $(field).value = saved[field] || '';
      editing = saved.id || null;
      $('editor-heading').textContent = editing ? 'Edit post' : 'New post';
    }
  } catch { /* An invalid draft must not prevent signing in. */ }
}

function reset(clearDraft = true) {
  $('editor').reset();
  editing = null;
  $('editor-heading').textContent = 'New post';
  $('preview-panel').hidden = true;
  $('upload-note').textContent = '';
  if (clearDraft) {
    try { localStorage.removeItem(DRAFT); } catch { /* Storage may be disabled. */ }
  }
}

async function run(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button, input, textarea').forEach(control => { control.disabled = true; });
  try { await action(); }
  catch (error) { status(error.message || 'Something went wrong. Please try again.', true); }
  finally {
    busy = false;
    document.querySelectorAll('button, input, textarea').forEach(control => { control.disabled = false; });
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
$('upload').addEventListener('change', () => {
  const file = $('upload').files[0];
  $('upload-note').textContent = file ? `${file.name} selected. Upload happens when you publish. Select it again if you refresh.` : '';
});
$('new-post').addEventListener('click', () => {
  if ((fields.some(field => $(field).value) || $('upload').files.length) && !confirm('Discard this draft and start a new post?')) return;
  reset();
  status('New post.');
});

$('preview-button').addEventListener('click', () => {
  const post = { ...draft(), createdAt: posts.find(p => p.id === editing)?.createdAt || new Date().toISOString() };
  const article = renderPost(post);
  const file = $('upload').files[0];
  if (file && validImage(file)) {
    const image = document.createElement('img');
    const url = URL.createObjectURL(file);
    image.src = url;
    image.alt = post.imageAlt;
    image.onload = image.onerror = () => URL.revokeObjectURL(url);
    article.querySelector('figure')?.remove();
    article.append(image);
  }
  $('preview').replaceChildren(article);
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
    if (!value.title || !value.text) throw new Error('Add a title and some text before publishing.');
    if (value.link && !safeURL(value.link)) throw new Error('Use an HTTP or HTTPS link.');
    if (value.image && !safeURL(value.image, true)) throw new Error('Use an HTTPS image URL.');
    const file = $('upload').files[0];
    if (file && !validImage(file)) throw new Error('Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.');
    if ((file || value.image) && !value.imageAlt) throw new Error('Add an image description so the image is accessible.');
    status('Publishing… Keep this tab open.');
    if (editing && !posts.some(p => p.id === editing)) throw new Error('This post no longer exists. Use Clear / new post to start again.');
    if (file) {
      value.image = await uploadImage(file);
      // Keep the completed upload in the draft so a failed post commit can be retried.
      $('image').value = value.image;
      $('upload').value = '';
      $('upload-note').textContent = 'Image uploaded.';
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
      if (fields.some(field => $(field).value) && !confirm('Replace your current draft with this post?')) return;
      reset();
      editing = post.id;
      for (const field of fields) $(field).value = post[field] || '';
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
