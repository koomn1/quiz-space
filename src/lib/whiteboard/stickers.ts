import { STICKER_DATA, type StickerEntry } from './stickerData';

export type { StickerEntry };
export const STICKERS = STICKER_DATA;
export const STICKER_NAMES: string[] = STICKERS.map(s => s.name);
export const stickerSet: ReadonlySet<string> = new Set(STICKER_NAMES);

const FILE_BY_NAME = new Map(STICKERS.map(s => [s.name, s.file] as const));
const cache = new Map<string, Promise<string | null>>();

/**
 * Fetch a sticker's inner SVG markup once and cache it.
 * Element ids are namespaced so several stickers can share one board without collisions.
 */
export function loadStickerInner(name: string): Promise<string | null> {
  let p = cache.get(name);
  if (!p) {
    const file = FILE_BY_NAME.get(name);
    if (!file) return Promise.resolve(null);
    p = fetch(`/whiteboard/stickers/${file}`)
      .then(r => (r.ok ? r.text() : null))
      .then(txt => {
        if (!txt) return null;
        const m = txt.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
        if (!m) return null;
        const ns = `st-${name.replace(/[^a-z0-9-]/g, '')}-`;
        return m[1]
          .replace(/id="/g, `id="${ns}`)
          .replace(/url\(#/g, `url(#${ns}`)
          .replace(/href="#/g, `href="#${ns}`);
      })
      .catch(() => null);
    cache.set(name, p);
  }
  return p;
}
