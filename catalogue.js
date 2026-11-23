import { element } from './ui.js';

export async function loadCatalogue() {
  const response = await fetch(new URL('./content/catalogue.json', import.meta.url), { cache: 'no-cache' });
  if (!response.ok) throw new Error('Catalogue request failed: ' + response.status);
  return response.json();
}

const normalize = value => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function renderCatalogue(activities, filters, query, t, container, count) {
  const search = normalize(query.trim());
  const matching = activities.filter(activity => {
    return (!filters.language || activity.language === filters.language)
      && (!filters.level || activity.level === filters.level)
      && (!filters.source || activity.sources.some(source => source.type === filters.source))
      && normalize(activity.title + ' ' + activity.summary + ' ' + activity.id).includes(search);
  });

  count.hidden = !search && !Object.values(filters).some(Boolean);
  count.textContent = matching.length === 1 ? t.one : t.many.replace('{n}', matching.length);
  container.replaceChildren(...matching.map(activity => element('a', {
    class: 'activity-card', href: '#activitat=' + encodeURIComponent(activity.id), lang: activity.language
  },
    element('div', { class: 'activity-card-art' }, element('img', {
      src: activity.sources[0].path, alt: '', width: 1170, height: 827
    })),
    element('div', { class: 'activity-card-content' },
      element('p', { class: 'card-kicker', lang: document.documentElement.lang }, t.levelLabels[activity.level]),
      element('h2', {}, activity.title),
      element('p', { class: 'card-summary' }, activity.summary),
      element('div', { class: 'card-footer', lang: document.documentElement.lang },
        element('span', { class: 'pill' }, t.pilot),
        element('span', { class: 'meta' }, activity.sources.map(source => t.sourceLabels[source.type]).join(' · '))
      )
    )
  )));
  if (!matching.length) container.append(element('p', { class: 'empty' }, t.noResults));
}
