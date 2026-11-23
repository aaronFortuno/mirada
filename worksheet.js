import { element } from './ui.js';

function paperHeading(title, type) {
  return element('header', { class: 'paper-heading' },
    element('div', {},
      element('p', { class: 'paper-brand' }, 'mirada.'),
      element('h2', {}, title)
    ),
    element('p', { class: 'paper-kind' }, type)
  );
}

export function renderWorksheet(activity, t, url) {
  const qr = element('div', { class: 'paper-qr', 'aria-hidden': 'true' });
  if (typeof globalThis.qrcode === 'function') {
    const code = globalThis.qrcode(0, 'M');
    code.addData(url);
    code.make();
    qr.innerHTML = code.createSvgTag(3, 8);
  }
  const identity = element('div', { class: 'paper-identity' },
    element('span', {}, t.name, element('i')), element('span', {}, t.date, element('i'))
  );
  const questions = element('ol', { class: 'questions' }, ...activity.questions.map(question => {
    const item = element('li', {}, element('p', {}, question.enunciat));
    if (question.opcions) {
      item.append(element('ul', { class: 'options' },
        ...question.opcions.map(value => element('li', {}, '□ ', value))));
    } else {
      const lines = question.numero === 7 ? 4 : 2;
      item.append(element('div', { class: 'response-lines', 'aria-hidden': 'true' },
        ...Array.from({ length: lines }, () => element('span'))));
    }
    return item;
  }));
  return element('article', { class: 'paper', lang: activity.language },
    paperHeading(activity.title, t.worksheet), identity,
    element('div', { class: 'paper-intro' }, element('p', {}, activity.context),
      element('div', { class: 'paper-listening' }, qr, element('a', { href: url }, t.listen),
        element('small', { class: 'print-url' }, url.replace(/^https?:\/\//, '')))),
    questions);
}

export function renderAnswers(activity, t) {
  return element('article', { class: 'paper', lang: activity.language },
    paperHeading(activity.title, t.answers),
    element('section', { class: 'transcription' },
      element('h3', {}, t.transcription), element('p', {}, activity.transcript)),
    element('ol', { class: 'questions answer-list' }, ...activity.questions.map(question =>
      element('li', {}, element('p', {}, question.resposta),
        element('p', { class: 'answer-evidence' }, element('strong', {}, t.evidence + ' · '), question.pista)
      )))
  );
}

export function renderSources(activity, t) {
  return element('div', { class: 'source-documents' }, ...activity.sources.map(source =>
    element('article', { class: 'paper source-sheet' + (source.type === 'map' ? ' landscape' : '') },
      element('div', { class: 'source-heading' },
        element('h2', {}, t.sourceLabels[source.type]),
        element('a', { href: source.path, target: '_blank', rel: 'noopener' }, t.fullSize),
        element('a', { href: source.original, target: '_blank', rel: 'noopener' }, t.original)
      ),
      element('img', { src: source.path, alt: source.description, lang: activity.language })
    )));
}
