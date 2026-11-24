import { buildSessionPlayer, makeListeningHash, previewAudio } from './listening.js?v=0.3.0';
import { audioDefaults, audioSettings, lineLimit, paperFields, paperSettings, rates, savedAudio, savedPaper, saveSettings } from './settings.js?v=0.3.1';
import { element } from './ui.js';
import { renderSources, renderWorksheet } from './worksheet.js?v=0.3.1';

const get = id => document.getElementById(id);

function numberField(key, label, value, min, max, step = 1) {
  return element('label', { class: 'setting-field' }, label,
    element('input', { type: 'number', name: key, min, max, step, value }));
}

function selectField(key, label, options, value) {
  const select = element('select', { name: key }, ...options.map(([key, name]) => element('option', { value: key }, name)));
  select.value = value;
  return element('label', { class: 'setting-field' }, label, select);
}

function toggleField(key, label, value) {
  const checkbox = element('input', { type: 'checkbox', name: key });
  checkbox.checked = value;
  return element('label', { class: 'setting-toggle' }, checkbox, label);
}

function resetButton(label, reset) {
  const button = element('button', { type: 'button', class: 'subtle' }, label);
  button.addEventListener('click', reset);
  return button;
}

function optionsGroup(label, open, ...children) {
  return element('details', { class: 'settings-group', open: open ? '' : null },
    element('summary', {}, label), element('div', { class: 'settings-fields' }, ...children));
}

function audioPanel(activity, t, settings, onChange) {
  const listen = element('a', { class: 'subtle' }, t.listen);
  const copy = element('button', { class: 'subtle', type: 'button' }, t.copy);
  const fallback = element('input', { class: 'copy-link', type: 'text', readonly: '', hidden: '', 'aria-label': t.listen });
  const status = element('p', { class: 'meta', role: 'status' });
  const links = element('div', { class: 'settings-links' }, listen, copy, fallback, status);
  get('audio-settings').replaceChildren(links);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(listen.href);
      status.textContent = t.copied;
    } catch {
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
    }
  });
  const syncLink = url => {
    listen.href = url;
    fallback.value = url;
    status.textContent = '';
  };
  if (!activity.audio) {
    get('audio-settings').prepend(element('p', { class: 'meta' }, t.pending));
    return { syncLink, dispose() {} };
  }

  const fragment = previewAudio(activity, t, settings.rate);
  const sample = element('div', { class: 'audio-fragment' }, element('h3', {}, t.fragment), fragment.audio, fragment.error);
  const session = element('section', { class: 'audio-session' }, element('h3', {}, t.testSession));
  const player = element('div');
  session.append(player);
  let guided;
  fragment.audio.addEventListener('play', () => guided.pause());

  const form = element('form', { class: 'settings-fields' },
    element('div', { class: 'settings-grid' },
      numberField('listens', t.listens, settings.listens, 1, 5),
      numberField('reading', t.reading, settings.reading, 0, 300),
      numberField('interval', t.interval, settings.interval, 0, 300),
      selectField('rate', t.rate, rates.map(rate => [rate, '×' + new Intl.NumberFormat(document.documentElement.lang).format(rate)]), settings.rate)
    ),
    toggleField('initial', t.initial, settings.initial),
    toggleField('repeat', t.repeat, settings.repeat),
    resetButton(t.resetSettings, () => setValues(audioDefaults))
  );
  form.addEventListener('submit', event => event.preventDefault());
  const fields = form.elements;
  function setValues(values, notify = true) {
    settings = audioSettings(activity, values);
    for (const key of ['listens', 'reading', 'interval', 'rate']) fields.namedItem(key).value = settings[key];
    for (const key of ['initial', 'repeat']) fields.namedItem(key).checked = settings[key];
    fields.namedItem('initial').disabled = !activity.audioPrompts?.initial;
    fields.namedItem('interval').disabled = settings.listens < 2;
    fields.namedItem('repeat').disabled = settings.listens < 2 || !activity.audioPrompts?.repeat;
    fragment.audio.pause();
    fragment.audio.defaultPlaybackRate = settings.rate;
    fragment.audio.playbackRate = settings.rate;
    guided?.dispose();
    guided = buildSessionPlayer(activity, t, settings, () => fragment.audio.pause());
    player.replaceChildren(guided.container);
    if (notify) onChange(settings);
  }
  form.addEventListener('change', event => {
    const values = {
      listens: fields.namedItem('listens').valueAsNumber,
      reading: fields.namedItem('reading').valueAsNumber,
      interval: fields.namedItem('interval').valueAsNumber,
      rate: Number(fields.namedItem('rate').value),
      initial: fields.namedItem('initial').checked,
      repeat: fields.namedItem('repeat').checked
    };
    if (event.target.name === 'initial' && values.initial && !values.reading) values.reading = 15;
    setValues(values);
  });
  setValues(settings, false);
  get('audio-settings').prepend(sample, form, session);
  return {
    syncLink,
    dispose() {
      fragment.audio.pause();
      guided.dispose();
    }
  };
}

function printPanel(activity, t, layout, onChange) {
  const field = key => {
    const { min, max, step } = paperFields[key];
    return numberField(key, t[key], layout[key], min, max, step);
  };
  const typography = optionsGroup(t.typography, true, element('div', { class: 'settings-grid' },
    selectField('font', t.font, [['serif', 'Georgia'], ['sans', 'Arial'], ['verdana', 'Verdana']], layout.font),
    ...['size', 'leading', 'questionGap', 'lineGap'].map(field)
  ));
  const margins = optionsGroup(t.margins, false, element('div', { class: 'settings-grid' },
    ...['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].map(field)
  ));
  const questionControls = activity.questions.map(question => {
    const key = question.numero;
    const visible = toggleField('visible-' + key, key + '. ' + question.enunciat, layout.questions[key].visible);
    const label = numberField('lines-' + key, t.answerLines, layout.questions[key].lines, 0, lineLimit);
    visible.lang = activity.language;
    label.lastElementChild.disabled = !layout.questions[key].visible;
    return element('div', { class: 'question-setting' }, visible, label);
  });
  const questions = optionsGroup(t.questions, false, ...questionControls);
  const print = element('button', { class: 'button workspace-print', type: 'button' }, t.print);
  print.addEventListener('click', () => window.print());
  const form = element('form', { class: 'print-settings' }, typography, margins, questions,
    resetButton(t.resetSettings, () => update(paperSettings(activity))), print);
  form.addEventListener('submit', event => event.preventDefault());
  const fields = form.elements;
  function update(values) {
    layout = paperSettings(activity, values);
    fields.namedItem('font').value = layout.font;
    for (const key of Object.keys(paperFields)) fields.namedItem(key).value = layout[key];
    for (const [key, value] of Object.entries(layout.questions)) {
      fields.namedItem('visible-' + key).checked = value.visible;
      const lines = fields.namedItem('lines-' + key);
      lines.value = value.lines;
      lines.disabled = !value.visible;
    }
    onChange(layout);
  }
  form.addEventListener('change', () => update({
    font: fields.namedItem('font').value,
    ...Object.fromEntries(Object.keys(paperFields).map(key => [key, fields.namedItem(key).valueAsNumber])),
    questions: Object.fromEntries(activity.questions.map(({ numero }) => [numero, {
      visible: fields.namedItem('visible-' + numero).checked,
      lines: fields.namedItem('lines-' + numero).valueAsNumber
    }]))
  }));
  get('print-settings').replaceChildren(form);
  return print;
}

export function setupWorkspacePanels() {
  const workspace = get('workspace');
  const buttons = [...workspace.querySelectorAll('[data-open-panel]')];
  function show(panel, moveFocus = false) {
    workspace.dataset.panel = panel;
    for (const button of buttons) button.setAttribute('aria-expanded', String(button.dataset.openPanel === panel));
    if (moveFocus && panel) get(panel + '-panel-title').focus();
  }
  for (const button of buttons) button.addEventListener('click', () => {
    const name = button.dataset.openPanel;
    const open = workspace.dataset.panel === name ? '' : name;
    show(open, true);
  });
  workspace.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !workspace.dataset.panel) return;
    const button = buttons.find(button => button.dataset.openPanel === workspace.dataset.panel);
    if (!button.getClientRects().length) return;
    show('');
    button.focus();
  });
  return () => show('');
}

export function renderWorkspace(activity, versions, t, materialText, initialSheet) {
  const preview = get('preview');
  const pageStyle = get('worksheet-page-style');
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  let sheet = initialSheet;
  let audio = savedAudio(activity);
  let layout = savedPaper(activity);
  let url;

  const variantLinks = versions.filter(version => version.id !== activity.id).map(version =>
    element('a', { href: '#activitat=' + encodeURIComponent(version.id), lang: version.language, class: 'subtle' },
      t.languageLabels[version.language] ?? version.language));
  get('activity-info').replaceChildren(
    element('p', { class: 'meta' }, activity.id + ' · ' + t.levelLabels[activity.level]),
    element('h1', { lang: activity.language }, activity.title),
    ...variantLinks
  );

  const playback = audioPanel(activity, t, audio, settings => {
    audio = settings;
    saveSettings('audio', activity, audio);
    syncUrl();
    if (sheet !== 'sources') draw();
  });
  const print = printPanel(activity, t, layout, settings => {
    layout = settings;
    saveSettings('paper', activity, layout);
    if (sheet !== 'sources') draw();
  });

  function syncUrl() {
    url = new URL(makeListeningHash(activity, audio), new URL('./', location.href)).href;
    playback.syncLink(url);
  }
  function draw(resetScroll = false) {
    const scroll = preview.scrollTop;
    const paper = sheet === 'sources' ? renderSources(activity, materialText) :
      renderWorksheet(activity, materialText, url, layout, sheet);
    preview.replaceChildren(paper);
    preview.scrollTop = resetScroll ? 0 : scroll;
    pageStyle.textContent = sheet === 'sources' ? '' :
      '@page { margin: ' + [layout.marginTop, layout.marginRight, layout.marginBottom, layout.marginLeft].map(mm => mm + 'mm').join(' ') + '; }';
    print.textContent = t.printSelected(t[sheet]);
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === sheet));
  }
  syncUrl();
  draw(true);
  return {
    showSheet(view) {
      sheet = view;
      draw(true);
    },
    dispose() {
      playback.dispose();
      pageStyle.textContent = '';
    }
  };
}
