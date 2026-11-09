// Content is rendered as text, never HTML, including in the admin preview.
export const AUTHOR = 'Mironshoh Inomjonov';
const WORDS_PER_MINUTE = 230;

export function safeURL(value, image = false) {
  if (!value) return '';
  try {
    const url = new URL(value, location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (image && url.origin !== location.origin && url.protocol !== 'https:') return '';
    return url.href;
  } catch { return ''; }
}

export function postBlocks(post) {
  if (Array.isArray(post.blocks)) return post.blocks;
  // Keep posts and drafts from the original editor editable.
  const blocks = [];
  if (post.text) blocks.push({ type: 'text', text: post.text });
  if (post.image) blocks.push({ type: 'image', image: post.image, imageAlt: post.imageAlt || '' });
  if (post.link) blocks.push({ type: 'link', link: post.link, linkLabel: post.linkLabel || '' });
  return blocks;
}

function bodyText(post) {
  return postBlocks(post).filter(block => block.type === 'text').map(block => block.text || '').join('\n\n');
}

export function postWords(post) {
  return bodyText(post).split(/\s+/).filter(Boolean).length;
}

export function postExcerpt(post, limit = 260) {
  const text = bodyText(post).replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/\s+\S*$/, '')}…`;
}

export function postURL(post) {
  return `post.html?id=${encodeURIComponent(post.id)}`;
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function byNewest(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

// "Aug 3, 2026 • MIRONSHOH INOMJONOV | 13 min read (2326 words)"
export function renderMeta(post) {
  const meta = document.createElement('p');
  meta.className = 'post-meta';
  const time = document.createElement('time');
  time.dateTime = post.createdAt || '';
  time.textContent = formatDate(post.createdAt);
  const author = document.createElement('span');
  author.className = 'author';
  author.textContent = AUTHOR;
  const words = postWords(post);
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  meta.append(time, ' • ', author, ` | ${minutes} min read (${words} ${words === 1 ? 'word' : 'words'})`);
  return meta;
}

function renderFigure(block, previewImages) {
  // Blob URLs are supplied only by the editor for locally selected files.
  const imageURL = previewImages.get(block.id) || safeURL(block.image, true);
  if (!imageURL) return null;
  const figure = document.createElement('figure');
  figure.className = 'post-figure';
  const images = document.createElement('div');
  images.className = 'figure-images';
  const img = document.createElement('img');
  img.src = imageURL;
  img.alt = block.imageAlt || '';
  img.loading = 'lazy';
  images.append(img);
  // The caption carries the "Figure N." counter, so it is always present.
  const caption = document.createElement('figcaption');
  caption.textContent = block.imageAlt || '';
  figure.append(images, caption);
  return figure;
}

function renderParagraphs(text, dropCap) {
  const paragraphs = (text || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  return paragraphs.map((paragraph, index) => {
    const p = document.createElement('p');
    if (dropCap && index === 0) {
      // Array.from keeps astral characters and combining marks intact.
      const characters = Array.from(paragraph);
      const cap = document.createElement('span');
      cap.className = 'firstcharacter';
      cap.textContent = characters[0];
      p.append(cap, characters.slice(1).join(''));
    } else {
      p.textContent = paragraph;
    }
    return p;
  });
}

export function renderContent(post, previewImages = new Map()) {
  const content = document.createElement('div');
  content.className = 'post-content';
  let dropCapPending = true;
  for (const block of postBlocks(post)) {
    if (block.type === 'text') {
      const paragraphs = renderParagraphs(block.text, dropCapPending);
      if (paragraphs.length) dropCapPending = false;
      content.append(...paragraphs);
    } else if (block.type === 'image') {
      const figure = renderFigure(block, previewImages);
      if (figure) content.append(figure);
    } else if (block.type === 'link') {
      const linkURL = safeURL(block.link);
      if (!linkURL) continue;
      const p = document.createElement('p');
      p.className = 'post-link-block';
      const a = document.createElement('a');
      a.href = linkURL;
      a.textContent = block.linkLabel || block.link;
      a.rel = 'noopener noreferrer';
      p.append(a);
      content.append(p);
    }
  }
  return content;
}

export function renderPost(post, previewImages = new Map()) {
  const article = document.createElement('article');
  article.className = 'post';
  article.id = `post-${post.id}`;
  const header = document.createElement('header');
  header.className = 'post-header';
  const title = document.createElement('h1');
  title.className = 'post-title';
  title.textContent = post.title || 'Untitled';
  header.append(title, renderMeta(post));
  article.append(header, renderContent(post, previewImages));
  return article;
}

// One entry in the blog index.
export function renderCard(post) {
  const article = document.createElement('article');
  article.className = 'post-entry';
  const heading = document.createElement('h2');
  heading.className = 'entry-title';
  const link = document.createElement('a');
  link.href = postURL(post);
  link.textContent = post.title || 'Untitled';
  heading.append(link);
  const excerpt = document.createElement('p');
  excerpt.className = 'entry-excerpt';
  excerpt.textContent = postExcerpt(post);
  article.append(heading, renderMeta(post), excerpt);
  return article;
}
