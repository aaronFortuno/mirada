import { loadCatalogue, renderCatalogue } from './catalogue.js?v=0.3.0';
import { audioFromLink, renderListening } from './listening.js?v=0.3.0';
import { messages, mottos } from './locales.js?v=0.3.0';
import { chooseMotto, setupSiteControls } from './site.js';
import { element, getPreference, setPreference } from './ui.js';
import { renderWorkspace, setupWorkspacePanels } from './workspace.js';

const get = id => document.getElementById(id);
const main = get('main');
const closeWorkspacePanels = setupWorkspacePanels();
const filters = get('filters');
const search = get('search');
const searchLabel = get('catalogue-search');
const headerCount = get('header-count');
const motto = chooseMotto(mottos);
const views = ['catalogue', 'workspace', 'listening'];
const viewButtons = [...document.querySelectorAll('[data-view]')];

let activities = [];
let sheet = 'worksheet';
let currentWorkspace;
let disposeListening;
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

function route() {
  if (failed || !loaded) {
    get('loading').textContent = failed ? t.loadError : t.loading;
    return;
  }
  const params = new URLSearchParams(location.hash.slice(1));
  const listening = params.has('escolta');
  const id = params.get('escolta') ?? params.get('activitat');
  const activity = activities.find(entry => entry.id === id || entry.aliases?.includes(id));
  const revisionMatches = !params.has('v') || params.get('v') === String(activity?.version);
  const view = !id ? 'catalogue' : activity && revisionMatches ? (listening ? 'listening' : 'workspace') : null;
  for (const name of views) get(name).hidden = name !== view;
  get('loading').hidden = Boolean(view);
  get('loading').textContent = view ? t.loading : t.notFound;
  document.body.classList.toggle('listening-mode', view === 'listening');
  currentWorkspace?.dispose();
  currentWorkspace = undefined;
  disposeListening?.();
  disposeListening = undefined;
  get('listening').replaceChildren();
  searchLabel.hidden = view !== 'catalogue';
  if (view === 'catalogue') updateCatalogue();
  if (view === 'workspace') {
    const versions = activities.filter(entry => entry.code === activity.code);
    currentWorkspace = renderWorkspace(activity, versions, t, messages[activity.language] ?? t, sheet);
  }
  if (view === 'listening') {
    disposeListening = renderListening(activity, messages[activity.language] ?? t, get('listening'), audioFromLink(activity, params.get('s')));
  }
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
  currentWorkspace?.showSheet(sheet);
});
window.addEventListener('hashchange', () => {
  sheet = 'worksheet';
  closeWorkspacePanels();
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
