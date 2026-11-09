import { renderPost, byNewest, postURL } from './post.js';

const container = document.querySelector('#post');
const navigation = document.querySelector('#post-navigation');

function message(text) {
  container.replaceChildren();
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = text;
  container.append(p);
}

function navLink(post, label, className) {
  const link = document.createElement('a');
  link.className = className;
  link.href = postURL(post);
  const tag = document.createElement('strong');
  tag.className = 'nav-label';
  tag.textContent = label;
  link.append(tag, post.title || 'Untitled');
  return link;
}

const id = new URLSearchParams(location.search).get('id');
try {
  const response = await fetch('../data/posts.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('load');
  const loaded = await response.json();
  if (!Array.isArray(loaded)) throw new Error('format');
  // Newest first, so the next entry is the older post.
  const posts = [...loaded].sort(byNewest);
  const index = posts.findIndex(post => post.id === id);
  if (index === -1) {
    message('That post could not be found. It may have been removed.');
  } else {
    const post = posts[index];
    container.replaceChildren(renderPost(post));
    document.title = `${post.title || 'Untitled'} · Mironshoh Inomjonov`;
    const older = posts[index + 1];
    const newer = posts[index - 1];
    if (older) navigation.append(navLink(older, '← Previous', 'nav-prev'));
    if (newer) navigation.append(navLink(newer, 'Next →', 'nav-next'));
    navigation.hidden = !older && !newer;
  }
} catch {
  message('This post could not be loaded. Please refresh to try again.');
}
