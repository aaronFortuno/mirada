import { fonts } from './settings.js?v=0.3.1';
import { element } from './ui.js';

function brandMark() {
  return element('img', { class: 'brand-mark', src: './assets/mirada.svg', width: 24, height: 24, alt: '' });
}

function paperHeading(title, type) {
  return element('header', { class: 'paper-heading' },
    element('div', {},
      element('p', { class: 'paper-brand' }, brandMark(), 'mirada.'),
      element('h2', {}, title)
    ),
    element('p', { class: 'paper-kind' }, type)
  );
}

function printable(activity, layout, ...contents) {
  const paper = element('article', { class: 'paper formatted-paper', lang: activity.language }, ...contents);
  const properties = {
    '--paper-font': fonts[layout.font],
    '--answer-font': fonts[layout.font === 'sans' ? 'verdana' : 'sans'],
    '--paper-size': layout.size + 'pt',
    '--paper-leading': layout.leading,
    '--paper-question-gap': layout.questionGap + 'mm',
    '--paper-line-gap': layout.lineGap + 'mm',
    '--paper-margin-top': layout.marginTop,
    '--paper-margin-right': layout.marginRight,
    '--paper-margin-bottom': layout.marginBottom,
    '--paper-margin-left': layout.marginLeft
  };
  for (const [key, value] of Object.entries(properties)) paper.style.setProperty(key, value);
  return paper;
}

function selectedQuestions(activity, layout) {
  return activity.questions.filter(question => layout.questions[question.numero].visible);
}

export function renderWorksheet(activity, t, url, layout, kind = 'worksheet') {
  const withAnswers = kind === 'answers';
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
  const questions = element('ol', { class: 'questions' }, ...selectedQuestions(activity, layout).map(question => {
    const item = element('li', { value: question.numero }, element('p', {}, question.enunciat));
    if (question.opcions) {
      item.append(element('ul', { class: 'options' },
        ...question.opcions.map(value => element('li', {}, '□ ', value))));
    }
    const { lines } = layout.questions[question.numero];
    if (withAnswers) {
      const answer = element('div', { class: 'solution' }, element('p', { class: 'solution-answer' }, question.resposta));
      if (question.pista) {
        answer.append(element('p', { class: 'answer-evidence' }, element('strong', {}, t.evidence + ' · '), question.pista));
      }
      item.append(answer);
    } else if (lines) {
      item.append(element('div', { class: 'response-lines', 'aria-hidden': 'true' },
        ...Array.from({ length: lines }, () => element('span'))));
    }
    return item;
  }));
  const paper = printable(activity, layout,
    paperHeading(activity.title, t[kind]), identity,
    element('div', { class: 'paper-intro' }, element('p', {}, activity.context),
      element('div', { class: 'paper-listening' }, qr, element('a', { href: url }, t.listen),
        element('small', { class: 'print-url' }, url.replace(/^https?:\/\//, '')))),
    questions);
  if (withAnswers && activity.transcript) {
    paper.append(element('section', { class: 'transcription' },
      element('h3', {}, t.transcription), element('p', {}, activity.transcript)));
  }
  return paper;
}

export function renderSources(activity, t) {
  return element('div', { class: 'source-documents' }, ...activity.sources.map(source =>
    element('article', { class: 'paper source-sheet' + (source.type === 'map' ? ' landscape' : '') },
      element('div', { class: 'source-heading' },
        brandMark(), element('h2', {}, t.sourceLabels[source.type]),
        element('a', { href: source.path, target: '_blank', rel: 'noopener' }, t.fullSize),
        element('a', { href: source.original, target: '_blank', rel: 'noopener' }, t.original)
      ),
      element('img', { src: source.path, alt: source.description, lang: activity.language })
    )));
}
