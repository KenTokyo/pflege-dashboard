import { describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme, storeTheme, THEME_KEY } from '../../src/lib/theme';
import { DESIGN_KEY, readDesign, storeDesign } from '../../src/lib/design';

const media = (light: boolean) => () => ({ matches: light });

describe('Theme', () => {
  it('startet mit Tagwerk und speichert die unabhängige Instrument-Wahl', () => {
    expect(readDesign(localStorage)).toBe('tagwerk');
    storeTheme(localStorage, 'hell');
    storeDesign(localStorage, 'instrument');
    expect(localStorage.getItem(DESIGN_KEY)).toBe('instrument');
    expect(readDesign(localStorage)).toBe('instrument');
    expect(resolveTheme(localStorage, media(false)).theme).toBe('hell');
    storeDesign(localStorage, 'tagwerk');
    expect(readDesign(localStorage)).toBe('tagwerk');
  });

  it('verwendet Tagwerk bei ungültiger Designwahl und gesperrtem Speicher', () => {
    localStorage.setItem(DESIGN_KEY, 'unbekannt');
    expect(readDesign(localStorage)).toBe('tagwerk');
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readDesign(blocked)).toBe('tagwerk');
    expect(() => storeDesign(blocked, 'instrument')).not.toThrow();
  });
  it('folgt beim ersten Besuch dem System', () => {
    expect(resolveTheme(localStorage, media(true))).toEqual({ theme: 'hell', stored: false });
    expect(resolveTheme(localStorage, media(false))).toEqual({ theme: 'dunkel', stored: false });
  });

  it('gespeicherte Wahl geht vor dem System', () => {
    storeTheme(localStorage, 'hell');
    expect(localStorage.getItem(THEME_KEY)).toBe('hell');
    expect(resolveTheme(localStorage, media(false))).toEqual({ theme: 'hell', stored: true });
  });

  it('ignoriert ungültige Werte und gesperrten Speicher', () => {
    localStorage.setItem(THEME_KEY, 'neon');
    expect(resolveTheme(localStorage, media(false)).theme).toBe('dunkel');
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(resolveTheme(blocked, media(true))).toEqual({ theme: 'hell', stored: false });
    expect(() => storeTheme(blocked, 'dunkel')).not.toThrow();
  });

  it('setzt data-theme am Wurzelelement', () => {
    applyTheme(document.documentElement, 'hell');
    expect(document.documentElement.dataset.theme).toBe('hell');
  });

  it('index.html setzt das Theme vor dem ersten Zeichnen mit demselben Schlüssel', async () => {
    const { readFile } = await import('node:fs/promises');
    const html = await readFile(`${process.cwd()}/index.html`, 'utf8');
    expect(html).toContain(THEME_KEY);
    expect(html).toContain('prefers-color-scheme: light');
  });
});
