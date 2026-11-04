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

export function renderPost(post) {
  const article = document.createElement('article');
  article.className = 'post';
  article.id = `post-${post.id}`;
  const date = document.createElement('time');
  date.dateTime = post.createdAt;
  date.textContent = new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const title = document.createElement('h2');
  title.textContent = post.title;
  article.append(date, title);
  for (const paragraph of (post.text || '').split(/\n\s*\n/)) {
    const p = document.createElement('p');
    p.textContent = paragraph;
    article.append(p);
  }
  const imageURL = safeURL(post.image, true);
  if (imageURL) {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = imageURL;
    img.alt = post.imageAlt || '';
    img.loading = 'lazy';
    figure.append(img);
    if (post.imageAlt) {
      const caption = document.createElement('figcaption');
      caption.textContent = post.imageAlt;
      figure.append(caption);
    }
    article.append(figure);
  }
  const linkURL = safeURL(post.link);
  if (linkURL) {
    const a = document.createElement('a');
    a.href = linkURL;
    a.textContent = post.linkLabel || post.link;
    a.rel = 'noopener noreferrer';
    article.append(a);
  }
  return article;
}
