// Editor for data/profile.json — the homepage content. Saving writes the
// JSON and the index.html generated from it in a single commit.
import { readJSON, commitFiles } from './github.js';
import { renderIndexHTML } from './template.js';

const PROFILE_PATH = 'data/profile.json';
const INDEX_PATH = 'index.html';
const $ = id => document.getElementById(id);

const TEXT = 'text';
const AREA = 'area';
const CHECK = 'check';
const PAIRS = 'pairs';

// Each list section: the array key, a singular noun, and its fields.
const SECTIONS = [
  { key: 'bio', label: 'Bio paragraph', plain: true,
    fields: [['text', 'Paragraph', AREA]] },
  { key: 'links', label: 'Link',
    fields: [['label', 'Label', TEXT], ['url', 'URL', TEXT]] },
  { key: 'research', label: 'Publication',
    fields: [['title', 'Title', TEXT], ['titleUrl', 'Title link', TEXT],
             ['authors', 'Authors', TEXT], ['venue', 'Venue and year', TEXT],
             ['image', 'Thumbnail path', TEXT], ['imageAlt', 'Thumbnail description', TEXT],
             ['links', 'Links', PAIRS], ['description', 'Description', AREA]] },
  { key: 'projects', label: 'Project',
    fields: [['title', 'Name', TEXT], ['titleUrl', 'Name link', TEXT],
             ['authors', 'Authors', TEXT], ['venue', 'Language and year', TEXT],
             ['image', 'Thumbnail path', TEXT], ['imageAlt', 'Thumbnail description', TEXT],
             ['links', 'Links', PAIRS], ['description', 'Description', AREA]] },
  { key: 'experience', label: 'Role',
    fields: [['role', 'Role', TEXT], ['org', 'Organisation', TEXT], ['orgUrl', 'Organisation link', TEXT],
             ['logo', 'Logo path', TEXT], ['logoWide', 'Wide wordmark logo', CHECK],
             ['dates', 'Dates', TEXT], ['location', 'Location', TEXT],
             ['description', 'Description', AREA]] },
  { key: 'education', label: 'Qualification',
    fields: [['role', 'Degree', TEXT], ['org', 'Institution', TEXT], ['orgUrl', 'Institution link', TEXT],
             ['logo', 'Logo path', TEXT], ['logoWide', 'Wide wordmark logo', CHECK],
             ['dates', 'Dates', TEXT], ['location', 'Location', TEXT],
             ['description', 'Description', AREA]] },
];

let profile = null;
let onRun = null;
let setStatus = () => {};

// "label|url" per line, which is far easier to edit than nested rows.
function pairsToText(pairs) {
  return (pairs || []).map(pair => `${pair.label || ''}|${pair.url || ''}`).join('\n');
}

function textToPairs(text) {
  return String(text || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const divider = line.indexOf('|');
    if (divider === -1) return { label: line, url: '' };
    return { label: line.slice(0, divider).trim(), url: line.slice(divider + 1).trim() };
  }).filter(pair => pair.label || pair.url);
}

function field(container, item, [name, label, type], onChange) {
  const id = `profile-${Math.random().toString(36).slice(2, 9)}`;
  if (type === CHECK) {
    const wrapper = document.createElement('label');
    wrapper.className = 'choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = Boolean(item[name]);
    input.addEventListener('change', () => { item[name] = input.checked; onChange(); });
    wrapper.append(input, label);
    container.append(wrapper);
    return;
  }
  const tag = document.createElement('label');
  tag.htmlFor = id;
  tag.textContent = label;
  const control = document.createElement(type === AREA ? 'textarea' : 'input');
  control.id = id;
  if (type === AREA) control.rows = 4;
  if (type === PAIRS) {
    const area = document.createElement('textarea');
    area.id = id;
    area.rows = 3;
    area.value = pairsToText(item[name]);
    area.placeholder = 'paper|https://example.com';
    area.addEventListener('input', () => { item[name] = textToPairs(area.value); onChange(); });
    container.append(tag, area);
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'One per line, as label|url.';
    container.append(hint);
    return;
  }
  control.value = item[name] == null ? '' : String(item[name]);
  control.addEventListener('input', () => { item[name] = control.value; onChange(); });
  container.append(tag, control);
}

function renderSection(section) {
  const host = $(`section-${section.key}`);
  if (!host) return;
  host.replaceChildren();
  const items = profile[section.key] || (profile[section.key] = []);

  items.forEach((item, index) => {
    const block = document.createElement('section');
    block.className = 'content-block';
    const heading = document.createElement('h3');
    heading.textContent = `${index + 1}. ${section.label}`;
    block.append(heading);

    // Bio paragraphs are bare strings in the JSON; edit them through a shim.
    const target = section.plain ? { text: item } : item;
    const sync = () => { if (section.plain) items[index] = target.text; };

    for (const spec of section.fields) field(block, target, spec, sync);

    const actions = document.createElement('div');
    actions.className = 'actions block-actions';
    for (const [text, name, action] of [
      ['↑', 'Move up', () => move(section, index, -1)],
      ['↓', 'Move down', () => move(section, index, 1)],
      ['Remove', 'Remove', () => {
        if (!confirm(`Remove this ${section.label.toLowerCase()}?`)) return;
        items.splice(index, 1);
        renderSection(section);
      }],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.setAttribute('aria-label', `${name} — ${section.label.toLowerCase()}`);
      if ((text === '↑' && index === 0) || (text === '↓' && index === items.length - 1)) {
        button.dataset.boundary = 'true';
        button.disabled = true;
      }
      button.addEventListener('click', action);
      actions.append(button);
    }
    block.append(actions);
    host.append(block);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.textContent = `+ ${section.label}`;
  add.addEventListener('click', () => {
    items.push(section.plain ? '' : Object.fromEntries(
      section.fields.map(([name, , type]) => [name, type === CHECK ? false : type === PAIRS ? [] : ''])));
    renderSection(section);
  });
  host.append(add);
}

function move(section, index, direction) {
  const items = profile[section.key];
  const target = index + direction;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  renderSection(section);
}

function renderAll() {
  $('profile-name').value = profile.name || '';
  $('profile-photo').value = profile.photo || '';
  $('profile-description').value = profile.description || '';
  $('profile-research-intro').value = profile.researchIntro || '';
  for (const section of SECTIONS) renderSection(section);
}

export async function loadProfile() {
  const { data } = await readJSON(PROFILE_PATH);
  profile = data;
  $('profile-panel').hidden = false;
  renderAll();
}

export function resetProfileEditor() {
  profile = null;
  $('profile-panel').hidden = true;
  for (const section of SECTIONS) {
    const host = $(`section-${section.key}`);
    if (host) host.replaceChildren();
  }
}

export function initProfileEditor({ run, status }) {
  onRun = run;
  setStatus = status;

  for (const [id, key] of [['profile-name', 'name'], ['profile-photo', 'photo'],
                           ['profile-description', 'description'], ['profile-research-intro', 'researchIntro']]) {
    $(id).addEventListener('input', () => { if (profile) profile[key] = $(id).value; });
  }

  $('profile-save').addEventListener('click', () => onRun(async () => {
    if (!profile) throw new Error('Sign in before saving site content.');
    if (!profile.name?.trim()) throw new Error('Add your name.');
    profile.bio = (profile.bio || []).map(part => String(part).trim()).filter(Boolean);
    setStatus('Saving site content…');
    const json = JSON.stringify(profile, null, 2) + '\n';
    const html = renderIndexHTML(profile);
    await commitFiles([
      { path: PROFILE_PATH, content: json },
      { path: INDEX_PATH, content: html },
    ], 'Update site content');
    setStatus('Site content saved. The homepage updates when GitHub Pages finishes deploying.');
  }));

  $('profile-preview').addEventListener('click', () => {
    if (!profile) return;
    const frame = $('profile-preview-frame');
    frame.srcdoc = renderIndexHTML(profile).replace('<link rel="stylesheet" type="text/css" href="stylesheet.css">',
      '<link rel="stylesheet" type="text/css" href="../stylesheet.css">');
    $('profile-preview-panel').hidden = false;
  });
}
