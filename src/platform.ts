/**
 * What the page can do beyond itself. The single HTML file and the PWA do
 * nothing more, so every hook here does nothing. The Chrome extension's build
 * puts src/extension/extension.ts in this module's place (build.mjs): there
 * the page is the side panel, and web pages are sent to it to become notes.
 */

import type { Clip } from './clip';
import type { Language } from './i18n';

export interface PlatformHost {
  /** A page, a selection, a link or an image sent from the browser, to save as a note. */
  clip(clip: Clip): void;
}

export interface Platform {
  start(host: PlatformHost): void;
  /** The interface's language changed: what the browser shows of the extension follows it. */
  languageChanged(language: Language): void;
}

export const platform: Platform = {
  start: () => undefined,
  languageChanged: () => undefined,
};
