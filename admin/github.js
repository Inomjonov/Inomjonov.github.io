// Shared GitHub access for the editors on this page: one token, one API
// wrapper, and a multi-file commit so related files never land separately.

export const REPO = 'Inomjonov/Inomjonov.github.io';
export const BRANCH = 'main';

let token = '';
export function setToken(value) { token = value; }
export function hasToken() { return Boolean(token); }

export async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    cache: 'no-store',
  });
  if (!response.ok) {
    // GitHub explains the real cause in the body; without it every failure looks the same.
    let detail = '';
    try {
      const body = await response.json();
      detail = [body.message, ...(body.errors || []).map(item => item.message || item.code)].filter(Boolean).join(' — ');
    } catch { /* Error bodies are not always JSON. */ }
    const said = detail ? ` GitHub said: ${detail}` : '';
    if (response.status === 409 || response.status === 422) throw new Error(`The repository changed or rejected the commit. Sign out and back in to reload; your draft is saved.${said}`);
    if (response.status === 401) throw new Error(`Your GitHub token is invalid or expired. Sign out and sign in with a valid token.${said}`);
    if (response.status === 403) throw new Error(`GitHub denied this request (403). Check that the token grants Contents: Read and write on this repository, has not expired, and — for a fine-grained token on an organisation — has been approved.${said}`);
    if (response.status === 404) throw new Error(`GitHub returned 404. A fine-grained token that cannot see this repository reports it as missing, so check the token's repository access.${said}`);
    throw new Error(`GitHub request failed (${response.status}).${said}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decode(base64) {
  return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), char => char.charCodeAt(0)));
}

// Reads a JSON file from the branch. Returns { data, sha }.
export async function readJSON(path, fallback) {
  let file;
  try {
    file = await api(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
  } catch (error) {
    if (fallback !== undefined && /404/.test(error.message)) return { data: fallback, sha: '' };
    throw error;
  }
  if (!file.content) throw new Error(`${path} is too large for this editor to read inline.`);
  return { data: JSON.parse(decode(file.content)), sha: file.sha };
}

// Commits several files as ONE commit, so a failure cannot leave the data
// and the page it generates out of step with each other.
export async function commitFiles(files, message) {
  const ref = await api(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const parent = ref.object.sha;
  const base = await api(`/repos/${REPO}/git/commits/${parent}`);
  const tree = [];
  for (const file of files) {
    const blob = await api(`/repos/${REPO}/git/blobs`, {
      method: 'POST', body: JSON.stringify({ content: encode(file.content), encoding: 'base64' }),
    });
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const created = await api(`/repos/${REPO}/git/trees`, {
    method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }),
  });
  const commit = await api(`/repos/${REPO}/git/commits`, {
    method: 'POST', body: JSON.stringify({ message, tree: created.sha, parents: [parent] }),
  });
  await api(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH', body: JSON.stringify({ sha: commit.sha }),
  });
  return commit.sha;
}
