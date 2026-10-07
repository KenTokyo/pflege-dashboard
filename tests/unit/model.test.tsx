import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { safeHref, SafeMarkdown } from '../../src/chat/Markdown';
import { effectiveModel, messageModel, messageSources, modelDisplayName, providerLabel, sortTasks, titleFromQuestion } from '../../src/data/model';
import { fromDbError } from '../../src/services/errors';
import { createSeed, MODEL_OPENAI } from '../support/seed';

describe('Fehlerzuordnung', () => {
  it.each([
    ['40001', 'REVISION_CONFLICT'],
    ['42501', 'WORKSPACE_FORBIDDEN'],
    ['P0002', 'RESOURCE_NOT_FOUND'],
    ['23505', 'IDEMPOTENCY_CONFLICT'],
    ['22023', 'VALIDATION_FAILED'],
    ['PGRST202', 'NOT_DEPLOYED'],
  ])('SQLSTATE %s → %s, ohne SQL-Text in der Meldung', (code, expected) => {
    const err = fromDbError({ code, message: 'relation "secret_table" violates …' });
    expect(err.code).toBe(expected);
    expect(err.message).not.toContain('secret_table');
  });
});

describe('Seeddaten-Logik', () => {
  it('sortiert Aufgaben nach Fälligkeit, dann Priorität', () => {
    const { tasks } = createSeed();
    expect(sortTasks(tasks).map((t) => t.title)).toEqual(['Widerspruch mit Beratungsstelle prüfen', 'Vertretung für November planen']);
  });

  it('Seed ohne Standardmodell: kein Modell nutzbar (keine Scheinantwort)', () => {
    const s = createSeed();
    expect(effectiveModel(s.conversations[0] ?? null, s.settings, s.models)).toEqual({ usable: false, model: null, reason: 'none' });
  });

  it('deaktiviertes Override-Modell wird als deaktiviert erkannt', () => {
    const s = createSeed();
    const conv = { model_override_id: MODEL_OPENAI };
    expect(effectiveModel(conv, s.settings, s.models)).toMatchObject({ usable: false, reason: 'disabled' });
  });

  it('liest Modell-Snapshot und gemeldete Anbieter-ID einer Antwort', () => {
    expect(
      messageModel({ model_snapshot: { displayName: 'X', region: 'eu' }, provider_response_model: 'x-2026' }),
    ).toEqual({ displayName: 'X', region: 'eu', responseModel: 'x-2026' });
    expect(messageModel({ model_snapshot: null, provider_response_model: null })).toBeNull();
  });

  it('Quellen nur mit https-Link', () => {
    const sources = messageSources({ sources: [{ title: 'A', url: 'https://a.example' }, { title: 'B', url: 'javascript:alert(1)' }, { url: 'https://x' }] });
    expect(sources).toEqual([
      { title: 'A', url: 'https://a.example' },
      { title: 'B', url: null },
    ]);
  });

  it('Titel aus der Frage auf 60 Zeichen gekürzt', () => {
    expect(titleFromQuestion('a'.repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe('Sicheres Markdown', () => {
  it('erlaubt nur https- und mailto-Links', () => {
    expect(safeHref('https://www.bundesgesundheitsministerium.de')).toBe('https://www.bundesgesundheitsministerium.de');
    expect(safeHref('mailto:a@b.de')).toBe('mailto:a@b.de');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('http://unsicher.example')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
  });

  it('rendert kein HTML, keine Skripte, keine Bilder', () => {
    const { container } = render(
      <SafeMarkdown text={'# Titel\n<script>alert(1)</script><img src=x onerror=alert(1)>\n\n![Logo](https://t.example/p.png) [böse](javascript:alert(1)) [gut](https://ok.example)'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('h1')).toBeNull();
    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://ok.example']);
    expect(links[0]?.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    expect(container.textContent).toContain('[Bild: Logo]');
  });
});


describe('DeepSeek über OpenCode sichtbar zuordnen', () => {
  it('nennt den tatsächlichen Anbieter und verwendet keinen falschen Mistral-Fallback', () => {
    expect(providerLabel('opencode')).toBe('OpenCode');
    expect(providerLabel('deepseek')).toBe('DeepSeek');
    expect(providerLabel('anderer-anbieter')).toBe('anderer-anbieter');
  });
  it('ergänzt die Weiterleitung im Modellnamen genau einmal', () => {
    expect(modelDisplayName('DeepSeek V4.1 Flash', 'opencode')).toBe('DeepSeek V4.1 Flash · über OpenCode');
    expect(modelDisplayName('DeepSeek V4.1 Flash über OpenCode', 'opencode')).toBe('DeepSeek V4.1 Flash über OpenCode');
    expect(modelDisplayName('DeepSeek V4.1 Flash', 'deepseek')).toBe('DeepSeek V4.1 Flash');
  });
  it('gespeicherte Antworten zeigen ihren historischen Anbieter, nicht den heutigen Standard', () => {
    const snapshot = { displayName: 'DeepSeek V4.1 Flash', region: 'unverified', provider: 'opencode' };
    expect(messageModel({ model_snapshot: snapshot, provider_response_model: 'deepseek-v4.1-flash' })).toEqual({
      displayName: 'DeepSeek V4.1 Flash · über OpenCode', region: 'unverified', responseModel: 'deepseek-v4.1-flash',
    });
    expect(messageModel({ model_snapshot: { ...snapshot, provider: 'deepseek' }, provider_response_model: 'deepseek-flash' })?.displayName).toBe('DeepSeek V4.1 Flash');
  });
});

describe('Gemini sichtbar zuordnen', () => {
  it('nennt Google AI Studio und ergänzt den Anbieter genau einmal', () => {
    expect(providerLabel('gemini')).toBe('Google AI Studio');
    expect(modelDisplayName('Gemini · Testmodell', 'gemini')).toBe('Gemini · Testmodell · Google AI Studio');
    expect(modelDisplayName('Gemini · Google AI Studio', 'gemini')).toBe('Gemini · Google AI Studio');
  });

  it('liest den historischen Gemini-Snapshot mit ungeprüfter Region und tatsächlicher Modell-ID', () => {
    expect(messageModel({
      model_snapshot: { display_name: 'Gemini · Testmodell', hosting_region: 'unverified', provider: 'gemini' },
      provider_response_model: 'gemini-testmodell',
    })).toEqual({
      displayName: 'Gemini · Testmodell · Google AI Studio',
      region: 'unverified',
      responseModel: 'gemini-testmodell',
    });
  });

  it('wechselt bei fehlendem oder deaktiviertem Standard nicht still zu einem anderen Anbieter', () => {
    const s = createSeed({ modelOperational: true });
    expect(effectiveModel({ model_override_id: 'nicht-im-katalog' }, s.settings, s.models)).toEqual({ usable: false, model: null, reason: 'none' });
    s.models = s.models.map((m) => ({ ...m, enabled: false }));
    expect(effectiveModel(null, s.settings, s.models)).toMatchObject({ usable: false, reason: 'disabled' });
  });
});
