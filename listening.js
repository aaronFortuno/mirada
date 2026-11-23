import { element } from './ui.js';

export const makeListeningHash = activity => '#escolta=' + encodeURIComponent(activity.id) + '&v=' + activity.version;

export function renderListening(activity, t, container) {
  const content = element('article', { class: 'listening-card' },
    element('p', { class: 'meta' }, t.audio),
    element('h1', { lang: activity.language }, activity.title),
    element('p', {}, t.listeningInstructions)
  );
  if (activity.audio) {
    const audio = element('audio', { controls: '', preload: 'metadata', src: activity.audio });
    const error = element('p', { class: 'status-box', role: 'status', hidden: '' }, t.audioError);
    audio.addEventListener('error', () => { error.hidden = false; });
    content.append(audio, error);
  } else {
    content.append(element('div', { class: 'status-box' },
      element('strong', {}, t.pending), element('p', {}, t.pendingDetail)
    ));
  }
  container.replaceChildren(content);
}
