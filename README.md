# Inomjonov.github.io

Personal site, served at https://inomjonov.github.io

Plain HTML and CSS, no build step. Edit `index.html` for content and
`stylesheet.css` for design, then commit and push — GitHub Pages redeploys
automatically in about a minute.

## Blog and admin

- Public blog: `/blog/`
- Editor: `/admin/`

Deploy these files to `main` before using the editor. To sign in, create a
[fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new)
with access only to `Inomjonov/Inomjonov.github.io` and **Contents: Read and write**.
Paste it into the admin sign-in form. Tokens are held only in tab memory;
refreshing or signing out requires signing in again. Never commit a token.
GitHub enforces access; there is no password or secret embedded in the site.
Branch protection rules must allow your account to commit directly to `main`.

Write a title and text, optionally add an image URL or upload (JPEG, PNG, WebP,
GIF up to 5 MB), an image description, and a link with a label. Preview before
publishing. Posts can also be edited or deleted from the admin page.
Draft text is saved in this browser's local storage; selected image files must
be selected again after a refresh. Local drafts are not private on shared devices.

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
