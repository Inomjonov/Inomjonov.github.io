import { renderCard, renderUpdate, byNewest, isPost, isUpdate } from './post.js';

const postsContainer = document.querySelector('#posts');
const updatesContainer = document.querySelector('#updates-list');

function note(container, text) {
  container.replaceChildren();
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = text;
  container.append(p);
}

try {
  const response = await fetch('../data/posts.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('load');
  const entries = await response.json();
  if (!Array.isArray(entries)) throw new Error('format');
  const sorted = [...entries].sort(byNewest);

  const posts = sorted.filter(isPost);
  if (posts.length) postsContainer.replaceChildren(...posts.map(renderCard));
  else note(postsContainer, 'No posts yet. Check back soon.');

  const updates = sorted.filter(isUpdate);
  if (updates.length) updatesContainer.replaceChildren(...updates.map(renderUpdate));
  else note(updatesContainer, 'No updates yet.');
} catch {
  note(postsContainer, 'Posts could not be loaded. Please refresh to try again.');
  note(updatesContainer, 'Updates could not be loaded.');
}
