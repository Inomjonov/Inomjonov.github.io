// Content is rendered as text, never HTML, including in the admin preview.
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

export function renderPost(post, previewImages = new Map()) {
  const article = document.createElement('article');
  article.className = 'post';
  article.id = `post-${post.id}`;
  const date = document.createElement('time');
  date.dateTime = post.createdAt;
  date.textContent = new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const title = document.createElement('h2');
  title.textContent = post.title;
  article.append(date, title);
  for (const block of postBlocks(post)) {
    if (block.type === 'text') {
      for (const paragraph of (block.text || '').split(/\n\s*\n/)) {
        const p = document.createElement('p');
        p.textContent = paragraph;
        article.append(p);
      }
    } else if (block.type === 'image') {
      // Blob URLs are supplied only by the editor for locally selected files.
      const imageURL = previewImages.get(block.id) || safeURL(block.image, true);
      if (!imageURL) continue;
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = imageURL;
      img.alt = block.imageAlt || '';
      img.loading = 'lazy';
      figure.append(img);
      if (block.imageAlt) {
        const caption = document.createElement('figcaption');
        caption.textContent = block.imageAlt;
        figure.append(caption);
      }
      article.append(figure);
    } else if (block.type === 'link') {
      const linkURL = safeURL(block.link);
      if (!linkURL) continue;
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = linkURL;
      a.textContent = block.linkLabel || block.link;
      a.rel = 'noopener noreferrer';
      p.append(a);
      article.append(p);
    }
  }
  return article;
}
