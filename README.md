# Inomjonov.github.io

Personal site, served at https://inomjonov.github.io

Plain HTML and CSS, no build step. Edit `index.html` for content and
`stylesheet.css` for design, then commit and push — GitHub Pages redeploys
automatically in about a minute.

## Blog and admin

- Public blog index: `/blog/`
- A single post: `/blog/post.html?id=<post id>`
- Editor: `/admin/`

The blog's look follows [ljvmiranda921.github.io](https://ljvmiranda921.github.io):
a serif reading column (Vollkorn, with Vollkorn SC for figure labels and Inter
for titles), a drop cap on the opening paragraph, auto-numbered `Figure N.`
captions, and a `date • author | N min read (M words)` meta line. It is
translated to this site's dark palette so the blog matches the homepage.
`blog.css` is self-contained and deliberately does *not* load `stylesheet.css`,
whose 14px Lato table styles would override the reading column. Fonts come from
Google Fonts, so the serif falls back to Georgia offline.

Deploy these files to `main` before using the editor. To sign in, create a
[fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new)
with access only to `Inomjonov/Inomjonov.github.io` and **Contents: Read and write**.
Paste it into the admin sign-in form. Tokens are held only in tab memory;
refreshing or signing out requires signing in again. Never commit a token.
GitHub enforces access; there is no password or secret embedded in the site.
Branch protection rules must allow your account to commit directly to `main`.

Write a title, then use **+ Text**, **+ Image**, and **+ Link** to build your post
in any order. For text → image → text, add those three blocks. Add as many images
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
