import { audioDefaults, audioSettings } from './settings.js';
import { element } from './ui.js';

export function makeListeningHash(activity, options = audioDefaults) {
  const settings = audioSettings(activity, options);
  const id = '#escolta=' + encodeURIComponent(activity.id) + '&v=' + activity.version;
  const mask = Number(settings.initial) + Number(settings.repeat) * 2;
  const interval = settings.listens > 1 ? settings.interval : 0;
  if (!settings.reading && settings.listens === 1 && settings.rate === 1) return id;
  return id + '&s=' + [settings.reading, settings.listens, interval, mask, Math.round(settings.rate * 100)].join('-');
}

export function audioFromLink(activity, code) {
  const match = /^(\d{1,3})-([1-5])-(\d{1,3})-([0-3])-(80|90|100|110|120)$/.exec(code ?? '');
  if (!match) return audioSettings(activity);
  const [reading, listens, interval, mask, rate] = match.slice(1).map(Number);
  if (reading > 300 || interval > 300) return audioSettings(activity);
  return audioSettings(activity, { reading, listens, interval, initial: Boolean(mask & 1), repeat: Boolean(mask & 2), rate: rate / 100 });
}

export function previewAudio(activity, t, speed = 1) {
  const audio = element('audio', { controls: '', preload: 'metadata', src: activity.audio, 'aria-label': t.fragment });
  audio.defaultPlaybackRate = speed;
  audio.playbackRate = speed;
  const error = element('p', { class: 'status-box', role: 'status', hidden: '' }, t.audioError);
  audio.addEventListener('error', () => { error.hidden = false; });
  return { audio, error };
}

export function buildSessionPlayer(activity, t, settings, onStart = () => {}) {
  const button = element('button', { type: 'button', class: 'button' }, t.startSession);
  const restart = element('button', { type: 'button', class: 'subtle', hidden: '' }, t.resetSession);
  const status = element('span', { role: 'status' });
  const countdown = element('span', { 'aria-hidden': 'true' });
  const audio = element('audio', { preload: 'none', hidden: '' });
  const container = element('div', { class: 'session-player' }, button, restart,
    element('p', { class: 'meta' }, status, countdown), audio);
  const steps = [];
  if (settings.initial) steps.push({ url: activity.audioPrompts.initial, label: t.spokenInitial });
  if (settings.reading) steps.push({ seconds: settings.reading, label: t.prepareReading });
  for (let number = 1; number <= settings.listens; number++) {
    if (number > 1 && settings.interval) steps.push({ seconds: settings.interval, label: t.betweenListens });
    if (number > 1 && settings.repeat) steps.push({ url: activity.audioPrompts.repeat, label: t.spokenRepeat });
    steps.push({ url: activity.audio, rate: settings.rate, label: t.listenNumber(number, settings.listens) });
  }

  let index = -1;
  let running = false;
  let failed = false;
  let blocked = false;
  let remaining = 0;
  let deadline = 0;
  let timer;
  let request = 0;
  const current = () => steps[index];
  const ended = () => index >= steps.length;

  function paint() {
    button.textContent = running ? t.pauseSession : index < 0 ? t.startSession : ended() || failed ? t.playAgain : t.resumeSession;
    const label = failed ? t.audioError : blocked ? t.audioResumeHint : ended() ? t.sessionEnded : current()?.label ?? '';
    if (status.textContent !== label) status.textContent = label;
    const seconds = Math.max(0, Math.ceil((running ? deadline - performance.now() : remaining) / 1000));
    countdown.textContent = current()?.seconds && !failed ? ' · ' + seconds + ' s' : '';
    restart.hidden = index < 0 || ended() || failed;
  }

  function wait() {
    deadline = performance.now() + remaining;
    timer = setInterval(() => {
      if (performance.now() >= deadline) advance();
      else paint();
    }, 100);
  }

  function play() {
    const token = ++request;
    audio.play().catch(error => {
      if (token !== request || !running) return;
      running = false;
      blocked = error.name === 'NotAllowedError';
      failed = !blocked;
      paint();
    });
  }

  function advance() {
    clearInterval(timer);
    index++;
    const step = current();
    if (!step) {
      running = false;
    } else if (step.seconds) {
      remaining = step.seconds * 1000;
      wait();
    } else {
      audio.defaultPlaybackRate = step.rate ?? 1;
      audio.src = step.url;
      audio.playbackRate = audio.defaultPlaybackRate;
      play();
    }
    paint();
  }

  function pause() {
    if (!running) return;
    request++;
    running = false;
    if (current()?.seconds) remaining = Math.max(0, deadline - performance.now());
    clearInterval(timer);
    audio.pause();
    paint();
  }

  function reset() {
    pause();
    failed = false;
    blocked = false;
    index = -1;
    paint();
  }

  button.addEventListener('click', () => {
    if (running) {
      pause();
      return;
    }
    onStart();
    blocked = false;
    running = true;
    if (index < 0 || ended() || failed) {
      failed = false;
      index = -1;
      advance();
    } else if (current().seconds) {
      wait();
    } else {
      play();
    }
    paint();
  });
  restart.addEventListener('click', () => {
    reset();
    button.focus();
  });
  audio.addEventListener('ended', () => {
    if (running && current()?.url) advance();
  });
  audio.addEventListener('error', () => {
    if (!running || !current()?.url) return;
    failed = true;
    pause();
  });
  window.addEventListener('pagehide', pause);
  paint();
  return {
    container, pause,
    dispose() {
      pause();
      window.removeEventListener('pagehide', pause);
      audio.removeAttribute('src');
      audio.load();
    }
  };
}

export function renderListening(activity, t, container, settings) {
  const content = element('article', { class: 'listening-card' },
    element('p', { class: 'meta' }, t.audio),
    element('h1', { lang: activity.language }, activity.title),
    element('p', {}, t.listeningInstructions)
  );
  container.replaceChildren(content);
  if (!activity.audio) {
    content.append(element('div', { class: 'status-box' },
      element('strong', {}, t.pending), element('p', {}, t.pendingDetail)));
    return () => {};
  }
  if (settings.reading || settings.listens > 1 || settings.rate !== 1) {
    const player = buildSessionPlayer(activity, t, settings);
    content.append(player.container);
    return player.dispose;
  }

  const { audio, error } = previewAudio(activity, t);
  content.append(audio, error);
  return () => audio.pause();
}
