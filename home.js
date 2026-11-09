import { renderHomeEntry, renderUpdate, byNewest, isPost, isUpdate } from './blog/post.js';

const RECENT_POSTS = 3;
const RECENT_UPDATES = 5;

const postsColumn = document.querySelector('#home-posts');
const updatesColumn = document.querySelector('#home-updates');

function note(container, text) {
  container.replaceChildren();
  const p = document.createElement('p');
  p.className = 'home-empty';
  p.textContent = text;
  container.append(p);
}

try {
  const response = await fetch('data/posts.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('load');
  const entries = await response.json();
  if (!Array.isArray(entries)) throw new Error('format');
  const sorted = [...entries].sort(byNewest);

  const posts = sorted.filter(isPost).slice(0, RECENT_POSTS);
  if (posts.length) postsColumn.replaceChildren(...posts.map(post => renderHomeEntry(post, 'blog/')));
  else note(postsColumn, 'No posts yet.');

  const updates = sorted.filter(isUpdate).slice(0, RECENT_UPDATES);
  if (updates.length) updatesColumn.replaceChildren(...updates.map(renderUpdate));
  else note(updatesColumn, 'No updates yet.');
} catch {
  note(postsColumn, 'Posts could not be loaded.');
  note(updatesColumn, 'Updates could not be loaded.');
}
