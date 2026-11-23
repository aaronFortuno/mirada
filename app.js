import { loadCatalogue, renderCatalogue } from './catalogue.js';
import { makeListeningHash, renderListening } from './listening.js';
import { messages, mottos } from './locales.js';
import { chooseMotto, setupSiteControls } from './site.js';
import { element, getPreference, setPreference } from './ui.js';
import { renderAnswers, renderSources, renderWorksheet } from './worksheet.js';

const get = id => document.getElementById(id);
const main = get('main');
const filters = get('filters');
const search = get('search');
const searchLabel = get('catalogue-search');
const headerCount = get('header-count');
const motto = chooseMotto(mottos);
const views = ['catalogue', 'workspace', 'listening'];
const viewButtons = [...document.querySelectorAll('[data-view]')];

let activities = [];
let sheet = 'worksheet';
let loaded = false;
let failed = false;
let language = getPreference('language', 'ca') === 'es' ? 'es' : 'ca';
let t;

function translate() {
  t = messages[language];
  document.documentElement.lang = language;
  document.title = 'Mirada · ' + t.catalogue;
  for (const node of document.querySelectorAll('[data-t]')) node.textContent = t[node.dataset.t];
  for (const node of document.querySelectorAll('[data-label]')) node.setAttribute('aria-label', t[node.dataset.label]);
  get('theme').title = t.theme;
  get('header-motto').textContent = motto[language];
  search.placeholder = t.search;
  updateHeaderCount();
}

function updateHeaderCount() {
  headerCount.hidden = !loaded;
  headerCount.textContent = activities.length === 1 ? t.catalogueOne : t.catalogueMany.replace('{n}', activities.length);
}

function populateFilters() {
  const fields = [
    ['language', activities.map(activity => activity.language), t.languageLabels],
    ['level', activities.map(activity => activity.level), t.levelLabels],
    ['source', activities.flatMap(activity => activity.sources.map(source => source.type)), t.sourceLabels]
  ];
  for (const [name, values, labels] of fields) {
    const select = filters.elements.namedItem(name);
    const selected = select.value;
    select.replaceChildren(element('option', { value: '' }, t.all),
      ...[...new Set(values)].map(value => element('option', { value }, labels[value])));
    if (values.includes(selected)) select.value = selected;
  }
}

function updateCatalogue() {
  renderCatalogue(activities, Object.fromEntries(new FormData(filters)), search.value,
    t, get('activities'), get('result-count'));
}

function updateWorkspace(activity) {
  const listen = new URL(makeListeningHash(activity), location.href);
  get('activity-info').replaceChildren(
    element('div', { class: 'activity-details' },
      element('span', { class: 'pill' }, t.pilot),
      element('h1', { lang: activity.language }, activity.title),
      element('p', { class: 'meta' }, t.levelLabels[activity.level]),
      element('p', { lang: activity.language }, activity.summary),
      element('p', { class: 'meta' }, activity.audio ? t.audio : t.pending)
    )
  );
  const access = element('input', { class: 'copy-link', readonly: '', hidden: '', 'aria-label': t.listen, value: listen.href });
  const copyStatus = element('p', { class: 'meta', role: 'status' });
  const copy = element('button', { class: 'button secondary', type: 'button' }, t.copy);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(listen.href);
      copyStatus.textContent = t.copied;
    } catch {
      access.hidden = false;
      access.focus();
      access.select();
    }
  });
  const print = element('button', { class: 'button', type: 'button' }, t.print);
  print.addEventListener('click', () => window.print());

  get('workspace-actions').replaceChildren(
    element('a', { class: 'subtle', href: listen.hash }, t.listen), copy, access, copyStatus, print
  );
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === sheet));
  const panels = {
    worksheet: () => renderWorksheet(activity, t, listen.href),
    sources: () => renderSources(activity, t),
    answers: () => renderAnswers(activity, t)
  };
  get('preview').replaceChildren(panels[sheet]());
  get('preview').scrollTop = 0;
}

function route() {
  if (failed || !loaded) {
    get('loading').textContent = failed ? t.loadError : t.loading;
    return;
  }
  const params = new URLSearchParams(location.hash.slice(1));
  const listening = params.has('escolta');
  const id = params.get('escolta') ?? params.get('activitat');
  const activity = activities.find(entry => entry.id === id);
  const revisionMatches = !params.has('v') || params.get('v') === String(activity?.version);
  const view = !id ? 'catalogue' : activity && revisionMatches ? (listening ? 'listening' : 'workspace') : null;
  for (const name of views) get(name).hidden = name !== view;
  get('loading').hidden = Boolean(view);
  get('loading').textContent = view ? t.loading : t.notFound;
  document.body.classList.toggle('listening-mode', view === 'listening');
  if (view !== 'listening') get('listening').replaceChildren();
  searchLabel.hidden = view !== 'catalogue';
  if (view === 'catalogue') updateCatalogue();
  if (view === 'workspace') updateWorkspace(activity);
  if (view === 'listening') renderListening(activity, t, get('listening'));
}

translate();
setupSiteControls(language, nextLanguage => {
  language = nextLanguage;
  setPreference('language', language);
  translate();
  populateFilters();
  route();
}, () => t);
filters.addEventListener('change', updateCatalogue);
filters.addEventListener('reset', () => queueMicrotask(updateCatalogue));
search.addEventListener('input', updateCatalogue);
for (const button of viewButtons) button.addEventListener('click', () => {
  sheet = button.dataset.view;
  route();
});
window.addEventListener('hashchange', () => {
  sheet = 'worksheet';
  route();
  main.focus({ preventScroll: true });
});

try {
  activities = await loadCatalogue();
  loaded = true;
  updateHeaderCount();
  populateFilters();
} catch (error) {
  failed = true;
  console.error(error);
}
route();
