import { describe, expect, it } from 'vitest';
import { createSessionStorage } from '../../src/auth/sessionStorage';

const project = 'https://testprojekt.invalid';
describe('Gespeicherte Anmeldung', () => {
  it('ohne Merken wird nur im Tab gespeichert und beim Neuladen wiedergefunden', () => {
    const first = createSessionStorage(project);
    first.storage.setItem(first.storageKey, 'synthetische Sitzung');
    expect(localStorage.getItem('pflege-auth-testprojekt.invalid:session')).toBeNull();
    const reloaded = createSessionStorage(project);
    expect(reloaded.storage.getItem(reloaded.storageKey)).toBe('synthetische Sitzung');
    sessionStorage.clear();
    const reopened = createSessionStorage(project);
    expect(reopened.storage.getItem(reopened.storageKey)).toBeNull();
  });
  it('mit Merken bleibt die Sitzung nach neuem Tab verfügbar', () => {
    const first = createSessionStorage(project);
    first.remember(true);
    first.storage.setItem(first.storageKey, 'synthetische Sitzung');
    sessionStorage.clear();
    const reopened = createSessionStorage(project);
    expect(reopened.storage.getItem(reopened.storageKey)).toBe('synthetische Sitzung');
  });
  it('Abmeldung löscht gespeicherte Tokens sofort; alte Schreib- und Löschaktionen stören neue Anmeldung nicht', () => {
    const old = createSessionStorage(project);
    old.remember(true);
    old.storage.setItem(old.storageKey, 'alt');
    old.detach();
    const next = createSessionStorage(project);
    expect(next.storage.getItem(next.storageKey)).toBeNull();
    next.storage.setItem(next.storageKey, 'neu');
    old.storage.setItem(old.storageKey, 'verspätet');
    old.storage.removeItem(old.storageKey);
    const reload = createSessionStorage(project);
    expect(reload.storage.getItem(reload.storageKey)).toBe('neu');
  });
  it('zweiter Tab teilt denselben SDK-Lock und sieht Refresh oder Logout ohne alten Speicher-Fallback', () => {
    const first = createSessionStorage(project);
    first.remember(true);
    first.storage.setItem(first.storageKey, 'vor Refresh');
    const second = createSessionStorage(project);
    expect(second.storageKey).toBe(first.storageKey);
    expect(second.storage.getItem(second.storageKey)).toBe('vor Refresh');
    first.storage.setItem(first.storageKey, 'nach Refresh');
    expect(second.storage.getItem(second.storageKey)).toBe('nach Refresh');
    first.detach();
    expect(second.storage.getItem(second.storageKey)).toBeNull();
    second.remember(true);
    expect(second.storage.getItem(second.storageKey)).toBeNull();
  });
  it('Abwahl verschiebt die Sitzung aus dem dauerhaften Speicher in den Tab', () => {
    const saved = createSessionStorage(project);
    saved.remember(true);
    saved.storage.setItem(saved.storageKey, 'Sitzung');
    saved.remember(false);
    expect(createSessionStorage(project).preferredRemember()).toBe(false);
    expect(localStorage.getItem('pflege-auth-testprojekt.invalid:session')).toBeNull();
    expect(sessionStorage.getItem('pflege-auth-testprojekt.invalid:session')).toBe('Sitzung');
    saved.storage.removeItem(saved.storageKey);
    const reopened = createSessionStorage(project);
    expect(reopened.storage.getItem(reopened.storageKey)).toBeNull();
  });
});
