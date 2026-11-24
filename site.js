import { getPreference, setPreference } from './ui.js';

export function chooseMotto(mottos) {
  const previous = getPreference('motto', '');
  const options = mottos.filter(motto => motto.id !== previous);
  const motto = options[Math.floor(Math.random() * options.length)];
  setPreference('motto', motto.id);
  return motto;
}

export function setupSiteControls(language, onLanguageChange, getMessages) {
  const beta = document.querySelector('.beta-note');
  const betaLabel = beta.querySelector('.beta-label');
  betaLabel.addEventListener('keydown', event => {
    if (event.key === 'Escape') beta.dataset.dismissed = '';
  });
  betaLabel.addEventListener('blur', () => delete beta.dataset.dismissed);
  beta.addEventListener('pointerleave', () => delete beta.dataset.dismissed);

  const theme = document.getElementById('theme');
  const applyTheme = value => {
    document.documentElement.dataset.theme = value;
    theme.setAttribute('aria-pressed', String(value === 'dark'));
  };
  applyTheme(getPreference('theme', 'light') === 'dark' ? 'dark' : 'light');
  theme.addEventListener('click', () => {
    const value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(value);
    setPreference('theme', value);
  });

  const languageButton = document.getElementById('language-button');
  const languageMenu = document.getElementById('language-menu');
  const languageControl = languageButton.parentElement;
  const items = [...languageMenu.querySelectorAll('[data-language]')];
  const select = value => {
    language = value;
    for (const item of items) item.setAttribute('aria-checked', String(item.dataset.language === language));
  };
  const open = item => {
    languageMenu.hidden = false;
    languageButton.setAttribute('aria-expanded', 'true');
    item.focus();
  };
  const close = (restoreFocus = false) => {
    languageMenu.hidden = true;
    languageButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) languageButton.focus();
  };

  select(language);
  languageButton.addEventListener('click', () => {
    if (languageMenu.hidden) open(items.find(item => item.dataset.language === language));
    else close(true);
  });
  languageButton.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open(event.key === 'ArrowDown' ? items[0] : items.at(-1));
  });
  languageMenu.addEventListener('keydown', event => {
    const index = items.indexOf(document.activeElement);
    const next = {
      ArrowDown: (index + 1) % items.length,
      ArrowUp: (index + items.length - 1) % items.length,
      Home: 0,
      End: items.length - 1
    };
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (Object.hasOwn(next, event.key)) {
      event.preventDefault();
      items[next[event.key]].focus();
    }
  });
  for (const item of items) {
    item.addEventListener('click', () => {
      const value = item.dataset.language;
      close(true);
      if (value === language) return;
      select(value);
      document.getElementById('lightning-status').textContent = '';
      onLanguageChange(value);
    });
  }
  document.addEventListener('pointerdown', event => {
    if (!languageMenu.hidden && !languageControl.contains(event.target)) close();
  });
  languageControl.addEventListener('focusout', event => {
    if (!languageMenu.hidden && !languageControl.contains(event.relatedTarget)) close();
  });

  for (const button of document.querySelectorAll('[data-open]')) {
    const dialog = document.getElementById(button.dataset.open);
    button.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  }

  const address = document.getElementById('lightning-address');
  const status = document.getElementById('lightning-status');
  document.getElementById('copy-lightning').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address.textContent);
      status.textContent = getMessages().addressCopied;
    } catch {
      const range = document.createRange();
      range.selectNodeContents(address);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      status.textContent = getMessages().copyHelp;
    }
  });
}
