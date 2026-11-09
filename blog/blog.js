import { renderCard, byNewest } from './post.js';

const container = document.querySelector('#posts');
try {
  const response = await fetch('../data/posts.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('load');
  const posts = await response.json();
  if (!Array.isArray(posts)) throw new Error('format');
  if (!posts.length) {
    container.replaceChildren();
    container.textContent = 'No posts yet. Check back soon.';
    container.classList.add('muted');
  } else {
    container.replaceChildren(...[...posts].sort(byNewest).map(renderCard));
  }
} catch {
  container.replaceChildren();
  container.textContent = 'Posts could not be loaded. Please refresh to try again.';
  container.classList.add('muted');
}
