import { renderPost } from './post.js';
const container = document.querySelector('#posts');
try {
  const response = await fetch('../data/posts.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('load');
  const posts = await response.json();
  if (!Array.isArray(posts)) throw new Error('format');
  container.replaceChildren(...posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(renderPost));
  if (!posts.length) container.textContent = 'No posts yet. Check back soon.';
} catch {
  container.textContent = 'Posts could not be loaded. Please refresh to try again.';
}
