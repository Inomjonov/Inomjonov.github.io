// Renders data/profile.json into the static index.html the site serves.
// The homepage is generated, so its content needs no JavaScript at runtime;
// only the posts/updates widget is dynamic.

export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Relative paths, http(s) and mailto only. Anything else becomes '#'.
export function safeHref(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';
  if (/^(https?:|mailto:)/i.test(value)) return escapeHTML(value);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '#';
  return escapeHTML(value);
}

const INLINE = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;

// [label](url), **bold**, *italic* and `code`, over already-escaped text.
export function inlineHTML(text) {
  return escapeHTML(text).replace(INLINE, (match, label, url, bold, italic, code) => {
    if (label !== undefined) {
      const href = safeHref(url.replace(/&amp;/g, '&'));
      return href ? `<a href="${href}">${label}</a>` : match;
    }
    if (bold !== undefined) return `<strong>${bold}</strong>`;
    if (italic !== undefined) return `<em>${italic}</em>`;
    return `<code>${code}</code>`;
  });
}

const TABLE = 'width:100%;border:0px;border-spacing:0px;border-collapse:separate;margin-right:auto;margin-left:auto;';
const ROWS = 'width:100%;border:0px;border-spacing:0px 10px;border-collapse:separate;margin-right:auto;margin-left:auto;';

function heading(id, title) {
  return `          <table style="${TABLE}"><tbody>
            <tr>
              <td style="padding:16px;width:100%;vertical-align:middle">
                <h2 id="${id}">${escapeHTML(title)}</h2>
              </td>
            </tr>
          </tbody></table>
`;
}

function linkRow(links) {
  return (links || [])
    .filter(link => link.label && link.url)
    .map(link => `<a href="${safeHref(link.url)}">${escapeHTML(link.label)}</a>`)
    .join('\n                /\n                ');
}

// A publication or project: thumbnail on the left, details on the right.
function workEntry(item) {
  const title = item.titleUrl
    ? `<a href="${safeHref(item.titleUrl)}">\n                  <span class="papertitle">${escapeHTML(item.title)}</span>\n                </a>`
    : `<span class="papertitle">${escapeHTML(item.title)}</span>`;
  const image = item.image
    ? `<img src="${safeHref(item.image)}" width="100%" alt="${escapeHTML(item.imageAlt || '')}">`
    : '';
  const parts = [`                ${title}`];
  if (item.authors) parts.push(`                <br>\n                ${inlineHTML(item.authors)}`);
  if (item.venue) parts.push(`                <br>\n                ${inlineHTML(item.venue)}`);
  const links = linkRow(item.links);
  if (links) parts.push(`                <br>\n                ${links}`);
  if (item.description) parts.push(`                <p></p>\n                <p>\n                  ${inlineHTML(item.description)}\n                </p>`);
  return `
            <tr>
              <td style="padding:16px;width:20%;vertical-align:middle">
                ${image}
              </td>
              <td style="padding:8px;width:80%;vertical-align:middle">
${parts.join('\n')}
              </td>
            </tr>
`;
}

// A job or a degree: logo on the left, role and dates on the right.
function historyEntry(item) {
  const logoClass = item.logoWide ? 'logo logo-wide' : 'logo';
  const logo = item.logo
    ? `<img class="${logoClass}" src="${safeHref(item.logo)}" alt="${escapeHTML(item.org || '')}">`
    : '';
  const logoCell = item.orgUrl && logo ? `<a href="${safeHref(item.orgUrl)}">${logo}</a>` : logo;
  const org = item.orgUrl
    ? `<a href="${safeHref(item.orgUrl)}">${escapeHTML(item.org)}</a>`
    : escapeHTML(item.org);
  const place = [org, item.location ? escapeHTML(item.location) : '']
    .filter(Boolean).join(' &mdash; ');
  const parts = [
    `                <strong>${escapeHTML(item.role)}</strong> &nbsp;<span class="date">${escapeHTML(item.dates || '')}</span><br>`,
    `                <em>${place}</em>`,
  ];
  if (item.description) parts.push(`                <p></p>\n                <p>\n                  ${inlineHTML(item.description)}\n                </p>`);
  return `
            <tr>
              <td align="center" style="padding:16px;width:20%;vertical-align:middle">
                ${logoCell}
              </td>
              <td style="padding:8px;width:80%;vertical-align:middle">
${parts.join('\n')}
              </td>
            </tr>
`;
}

function section(id, title, items, render) {
  if (!items || !items.length) return '';
  return `          <!-- ===== ${title} ===== -->
${heading(id, title)}
          <table style="${ROWS}"><tbody>
${items.map(render).join('')}
          </tbody></table>

`;
}

export function renderIndexHTML(profile) {
  const bio = (profile.bio || [])
    .filter(part => part && part.trim())
    .map(part => `                <p>\n                  ${inlineHTML(part)}\n                </p>`)
    .join('\n');

  const links = (profile.links || [])
    .filter(link => link.label && link.url)
    .map(link => `<a href="${safeHref(link.url)}">${escapeHTML(link.label)}</a>`)
    .join(' /\n            ');

  const research = profile.research && profile.research.length
    ? `          <!-- ===== Research ===== -->
          <table style="${TABLE}"><tbody>
            <tr>
              <td style="padding:16px;width:100%;vertical-align:middle">
                <h2 id="research">Research</h2>
${profile.researchIntro ? `                <p>\n                  ${inlineHTML(profile.researchIntro)}\n                </p>\n` : ''}              </td>
            </tr>
          </tbody></table>

          <table style="${ROWS}"><tbody>
${profile.research.map(workEntry).join('')}
          </tbody></table>

`
    : '';

  return `<!DOCTYPE HTML>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">

    <title>${escapeHTML(profile.name)}</title>

    <meta name="author" content="${escapeHTML(profile.name)}">
    <meta name="description" content="${escapeHTML(profile.description || '')}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vollkorn:ital,wght@0,400..700;1,400..700&family=Vollkorn+SC:wght@400;600&display=swap">
    <link rel="stylesheet" type="text/css" href="stylesheet.css">

    <!-- Generated from data/profile.json by the editor at /admin/.
         Edit the content there; changes made here are overwritten. -->
  </head>

  <body>
    <table style="width:100%;max-width:800px;border:0px;border-spacing:0px;border-collapse:separate;margin-right:auto;margin-left:auto;"><tbody>
      <tr style="padding:0px">
        <td style="padding:0px">

          <!-- ===== Intro ===== -->
          <table style="width:100%;border:0px;border-spacing:0px;border-collapse:separate;margin-right:auto;margin-left:auto;"><tbody>
            <tr style="padding:0px">
              <td style="padding:2.5%;width:63%;vertical-align:middle">
                <p class="name" id="top" style="text-align: center;">
                  ${escapeHTML(profile.name)}
                </p>
${bio}
              </td>
              <td style="padding:2.5%;width:37%;max-width:37%">
                <img style="width:100%;max-width:100%;object-fit: cover; border-radius: 50%; aspect-ratio: 1 / 1;"
                     alt="${escapeHTML(profile.photoAlt || profile.name)}" src="${safeHref(profile.photo)}"
                     onerror="this.onerror=null;this.src='images/profile.svg';">
              </td>
            </tr>
          </tbody></table>

          <!-- Full width, so all the links fit on one line. -->
          <p class="links">
            ${links}
          </p>

          <!-- ===== Recent posts and updates ===== -->
          <table style="${TABLE}"><tbody>
            <tr>
              <td style="padding:16px;width:100%;vertical-align:top">
                <hr class="section-rule">
                <div class="home-sections">
                  <div class="column">
                    <h2 class="home-heading"><a href="blog/">Recent posts</a></h2>
                    <ul id="home-posts" class="home-post-list" aria-live="polite">
                      <li class="home-empty">Loading&hellip;</li>
                    </ul>
                  </div>
                  <div class="column">
                    <h2 class="home-heading"><a href="blog/#updates">What&rsquo;s new?</a></h2>
                    <div id="home-updates" aria-live="polite">
                      <p class="home-empty">Loading&hellip;</p>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody></table>

${research}${section('projects', 'Projects', profile.projects, workEntry)}${section('experience', 'Experience', profile.experience, historyEntry)}${section('education', 'Education', profile.education, historyEntry)}          <table style="${TABLE}"><tbody>
            <tr>
              <td style="padding:0px"><br></td>
            </tr>
          </tbody></table>

        </td>
      </tr>
    </table>
    <script type="module" src="home.js"></script>
  </body>
</html>
`;
}
