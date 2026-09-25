/**
 * Interface languages.
 *
 * The English text stays in the code. A string is looked up by its context —
 * the part of the interface it belongs to — and that English text, in the
 * dictionary of the chosen language, src/locales/<code>.json:
 *
 *   { "context": { "English text": "translation", … }, … }
 *
 * Whatever a dictionary lacks is shown in English. `{name}` is a placeholder.
 * A translation that depends on a number is an object with one text per
 * plural category of the language (Intl.PluralRules: zero, one, two, few,
 * many, other), keyed by the English plural form.
 */

import ar from './locales/ar.json';
import bn from './locales/bn.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
import uk from './locales/uk.json';
import ur from './locales/ur.json';
import zh from './locales/zh.json';

/** English and sixteen of the most spoken languages, each named in itself. */
export const LANGUAGES = {
  en: 'English',
  zh: '中文',
  hi: 'हिन्दी',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  bn: 'বাংলা',
  pt: 'Português',
  ru: 'Русский',
  ur: 'اردو',
  id: 'Bahasa Indonesia',
  de: 'Deutsch',
  ja: '日本語',
  tr: 'Türkçe',
  ko: '한국어',
  it: 'Italiano',
  uk: 'Українська',
} as const;

export type Language = keyof typeof LANGUAGES;

/** A flag for each language, shown beside its name — the country most of its readers know it by. */
export const FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  zh: '🇨🇳',
  hi: '🇮🇳',
  es: '🇪🇸',
  fr: '🇫🇷',
  ar: '🇸🇦',
  bn: '🇧🇩',
  pt: '🇧🇷',
  ru: '🇷🇺',
  ur: '🇵🇰',
  id: '🇮🇩',
  de: '🇩🇪',
  ja: '🇯🇵',
  tr: '🇹🇷',
  ko: '🇰🇷',
  it: '🇮🇹',
  uk: '🇺🇦',
};

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type Dictionary = Record<string, Record<string, string | Forms>>;

const DICTIONARIES: Partial<Record<Language, Dictionary>> = { ar, bn, de, es, fr, hi, id, it, ja, ko, pt, ru, tr, uk, ur, zh };
const RIGHT_TO_LEFT = new Set<Language>(['ar', 'ur']);

let current: Language = 'en';
let rules = new Intl.PluralRules('en');

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(LANGUAGES, value);
}

/** The first of the browser's languages that has a dictionary; English otherwise. */
export function detectLanguage(preferred: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}

export function language(): Language {
  return current;
}

export function isRightToLeft(): boolean {
  return RIGHT_TO_LEFT.has(current);
}

export function setLanguage(next: Language): void {
  current = next;
  rules = new Intl.PluralRules(next);
  if (typeof document === 'undefined') return;
  document.documentElement.lang = next;
  document.documentElement.dir = isRightToLeft() ? 'rtl' : 'ltr';
}

type Values = Record<string, string | number>;

function fill(text: string, values?: Values): string {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : match));
}

/** The text in the current language: `t('tree', 'Delete')`. */
export function t(context: string, text: string, values?: Values): string {
  const found = DICTIONARIES[current]?.[context]?.[text];
  return fill(typeof found === 'string' && found ? found : text, values);
}

/**
 * A text with a number in it: `tn('status', '{count} word', '{count} words', n)`.
 * The English plural form is the key; `{count}` is filled in.
 */
export function tn(context: string, one: string, other: string, count: number, values?: Values): string {
  const found = DICTIONARIES[current]?.[context]?.[other];
  const all = { count, ...values };
  if (typeof found === 'string' && found) return fill(found, all);
  if (found && typeof found === 'object') {
    const form = found[rules.select(count)] ?? found.other;
    if (form) return fill(form, all);
  }
  return fill(count === 1 ? one : other, all);
}

/* ------------------------------------------------------------------ *
 * The page's own markup
 *
 * `data-i18n="context"` translates an element's text. A child marked
 * `data-slot="name"` stays as it is and stands in the text as `{name}`:
 *   <p data-i18n="gate">Pick a folder with <code data-slot="ext">.md</code> files</p>
 * is looked up as "Pick a folder with {ext} files".
 *
 * `data-i18n-attr="context"` translates the element's title, placeholder
 * and aria-label.
 * ------------------------------------------------------------------ */

const ATTRIBUTES = ['title', 'placeholder', 'aria-label'] as const;

interface Source {
  text: string;
  slots: Map<string, Element>;
}

const contents = new WeakMap<Element, Source>();
const attributes = new WeakMap<Element, Partial<Record<(typeof ATTRIBUTES)[number], string>>>();

/** The English text of a `data-i18n` element, as the dictionaries key it. */
export function sourceOf(element: Element): Source {
  let source = contents.get(element);
  if (!source) {
    const slots = new Map<string, Element>();
    let text = '';
    for (const node of Array.from(element.childNodes)) {
      const slot = node instanceof Element ? node.getAttribute('data-slot') : null;
      if (slot && node instanceof Element) {
        slots.set(slot, node);
        text += `{${slot}}`;
      } else text += node.textContent ?? '';
    }
    source = { text: text.replace(/\s+/g, ' ').trim(), slots };
    contents.set(element, source);
  }
  return source;
}

export function translatePage(root: ParentNode = document): void {
  for (const element of Array.from(root.querySelectorAll('[data-i18n]'))) {
    const context = element.getAttribute('data-i18n') ?? '';
    const { text, slots } = sourceOf(element);
    const parts = t(context, text).split(/(\{\w+\})/);
    element.replaceChildren(
      ...parts.filter(Boolean).map((part) => slots.get(part.slice(1, -1)) ?? document.createTextNode(part)),
    );
  }
  for (const element of Array.from(root.querySelectorAll('[data-i18n-attr]'))) {
    const context = element.getAttribute('data-i18n-attr') ?? '';
    let source = attributes.get(element);
    if (!source) {
      source = {};
      for (const name of ATTRIBUTES) {
        const value = element.getAttribute(name);
        if (value) source[name] = value;
      }
      attributes.set(element, source);
    }
    for (const [name, value] of Object.entries(source)) element.setAttribute(name, t(context, value));
  }
}
