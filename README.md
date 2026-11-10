# Inomjonov.github.io

Personal site, served at https://inomjonov.github.io

Plain HTML and CSS, no build step. Edit `index.html` for content and
`stylesheet.css` for design, then commit and push — GitHub Pages redeploys
automatically in about a minute.

## Blog and admin

- Public blog index: `/blog/`
- A single post: `/blog/post.html?id=<post id>`
- Editor: `/admin/`

The whole site follows [ljvmiranda921.github.io](https://ljvmiranda921.github.io):
`#fffff8` paper, `#111` text, `#a00000` links, a Vollkorn serif reading column
with Vollkorn SC small-caps headings, a drop cap on the opening paragraph,
auto-numbered `Figure N.` captions, and a `date • author | N min read (M words)`
meta line. Inter is reserved for a single post's title. `blog.css` is
self-contained and deliberately does *not* load `stylesheet.css`. Fonts come
from Google Fonts, so the serif falls back to Georgia offline.

## Homepage content

The homepage is **generated**. Its content lives in `data/profile.json` — name,
photo, bio, the link row, research intro, publications, projects, experience
and education — and `admin/template.js` renders it into `index.html` as plain
static HTML. Editing it is the **Site content** panel in `/admin/`; saving
writes `data/profile.json` and the regenerated `index.html` in a single commit
via the Git Data API, so the data and the page it produces can never land
separately.

Do not hand-edit `index.html`: the next save from the editor overwrites it.
Change `admin/template.js` for structure, `data/profile.json` for content.

Values are HTML-escaped, and hrefs are limited to relative paths, `http(s)`
and `mailto`, so a `javascript:` URL in the data renders as `#`. Text fields
take `[label](url)`, `**bold**`, `*italic*` and `` `code` ``. Item links are
entered one per line as `label|url`.

## Posts and updates

Each entry in `data/posts.json` carries a `kind`:

- `post` — a longread. Listed at `/blog/`, and in **Recent posts** on the
  homepage. Needs a title.
- `update` — a short dated note. Shown under **What's new?** on the homepage
  and archived at `/blog/#updates`. No title, text only.

An entry without `kind` reads as a post, so older content is unaffected.

Both kinds take an optional `date` (`yyyy-mm-dd`) for **when the thing
happened**, which is not the same as when you published it. Display and
ordering everywhere use `date` when present and the publish time otherwise,
newest first — so an update written months late still files under the right
month. The date defaults to today in the editor. A bare `yyyy-mm-dd` is parsed
as a local date on purpose: parsing it as UTC renders the previous day for
anyone behind UTC.

Inside any text block, `[label](https://example.com)` becomes a link. Links are
built as DOM nodes rather than HTML, so an unsafe URL is left as literal text,
and excerpts collapse the markup to its label.

Deploy these files to `main` before using the editor. To sign in, create a
[fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new)
with access only to `Inomjonov/Inomjonov.github.io` and **Contents: Read and write**.
Paste it into the admin sign-in form. Tokens are held only in tab memory;
refreshing or signing out requires signing in again. Never commit a token.
GitHub enforces access; there is no password or secret embedded in the site.
Branch protection rules must allow your account to commit directly to `main`.

Pick a **Type**, set the date, then write. For a long post, add a title and use
**+ Text**, **+ Image**, and **+ Link** to build it in any order; an update hides
the title and the image/link buttons, because it holds text only. For text → image → text, add those three blocks. Add as many images
as you need, using HTTPS URLs or uploads (JPEG, PNG, WebP, GIF up to 5 MB each),
and give each image a description. Use the arrow buttons to reorder blocks or
Remove to discard one. Preview shows the same order readers will see. Existing
posts and drafts from the original editor automatically open as ordered blocks.
Posts can also be edited or deleted from the admin page.
Draft text is saved in this browser's local storage; selected image files must
be selected again after a refresh. Local drafts are not private on shared devices.

If a publish fails, the reason appears in the status line at the top of the
page, which sticks to the top of the viewport and now quotes GitHub's own error
text (for example a 403 when the token lacks **Contents: Read and write**).

Publishing uses the GitHub Contents API to commit `data/posts.json` and upload
images under `images/blog/`. Images upload before the post commit; if publishing
fails, the editor retains the uploaded path for retrying. Replaced/deleted images
remain in Git history and the images directory. Posts and media are public.
The blog shows changes after the usual GitHub Pages deployment. Concurrent edits
are rejected rather than overwriting another session; sign in again to reload
the latest posts. The editor limits the posts file to 900 KB to stay within the
Contents API's inline read limit; archive older posts if the limit is reached.

For local preview, run `python3 -m http.server 8000` and open
`http://localhost:8000/`. **The editor publishes to the real GitHub repository
even when opened locally.** Previewing and saving drafts do not publish.
