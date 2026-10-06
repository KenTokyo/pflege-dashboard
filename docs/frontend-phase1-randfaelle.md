# Frontend Phase 1 – Randfälle, Oberflächentests und Nacharbeit

Stand: 06.10.2026 · Referenz: Commit `1dc2782` · Bereich: Frontend (src, tools, tests, docs/mocks)
Kein Commit, kein Stage, kein Push. Keine Konten, keine Zugangsdaten, keine Anbieteraufrufe, keine Phase 2.

## Ergebnis in Kürze

- Ich habe 13 Funde behoben. 4 davon kamen als Querverbindungsfunde vom Orchestrator, dazu kam der Pagination-Fund.
- Jeder Fund ist mit einem Test oder einer Bildprüfung abgesichert. Für die wichtigsten habe ich eine Gegenprobe gemacht: Fix zurückgenommen, Test schlägt fehl.
- Volle Prüfkette `npm run check` ist grün: Typen, Lint, **131 Tests in 14 Dateien**, Build, Bundle, Quelltext, Proxy, Dev-Prozesse.
- Randfall-Bilder: vorher **4 Probleme** plus Fokusverlust nach Abbruch, nachher **0 Probleme**, je 38 Bilder.
- Echte App ohne Anmeldung (`npm run dev`, 5173/5174): **28 von 28 Prüfungen** bestanden, **0 fremde Anfragen**.

## Was echt, was synthetisch, was offen ist

| Art | Was genau | Beweiskraft |
| --- | --- | --- |
| **Echt** | Echte App über `npm run dev` (Vite 5173 + App-Server 5174), echter Produkt-Build mit echter `VITE_*`-Konfiguration. Login-Seite in beiden Themes und in zwei Breiten, geschützte Route `/aufgaben` → `/anmelden?weiter=%2Faufgaben`, E-Mail-Vorprüfung ohne Auth-Anfrage. Alle Anfragen außerhalb von 127.0.0.1:5173 waren blockiert und protokolliert, es gab keine. | Echte Oberfläche ohne Konto. Kein Login-Nachweis. |
| **Echt (Code)** | Echter Supabase-Adapter (`supabaseBackend.ts`) gegen eine PostgREST-Nachbildung im Fetch-Stub: `offset`/`limit`, `max_rows` 500, zufällige Reihenfolge bei Gleichstand, gehaltene Anfragen, Abbruchsignal. | Prüft den echten Adapter-Code, aber nicht den gehosteten Server. |
| **Synthetisch** | Prüf-Harness (`vite.harness.config.ts`, nie im Produkt-Build) mit Test-Transport: Dashboard, Aufgaben, Dokumente, Gespräche, Chat, Streaming, langsame/abgebrochene Antwort, leere und lange Bestände. Das Login-Formular ist echt, die Anmeldung dahinter ist simuliert. | Echte Komponenten, simulierte Daten. **Kein echter Nutzernachweis.** |
| **Offen (Gate)** | Echte Anmeldung mit echtem Konto, echter Chat mit Anbieter, Verhalten am gehosteten PostgREST (`max_rows` dort Standard 1000), Screenreader live (VoiceOver), Safari/iOS, echte Netzlangsamkeit. | Nicht geprüft, verboten oder außerhalb des Auftrags. |

## Funde und Behebung

| Nr. | Fund | Wo sichtbar | Behebung | Nachweis |
| --- | --- | --- | --- | --- |
| 1 | Listen wurden still gekürzt: Nachrichten 400, Aufgaben 100, Gespräche 200, Dokumente 50. In langen Gesprächen fehlte die **neueste Antwort**. | Chat, Dashboard, Listen | Seitenweises Laden mit `range` (500 je Seite), eindeutige Sortierung mit `id` am Ende, doppelte IDs fallen weg, ohne neue künstliche Grenze. | `supabaseBackend.test.ts` (1.201 Nachrichten, genau 500, Einfügen während des Ladens, alle Listen > 500), `volume.test.tsx` (450 Nachrichten, 130 Aufgaben, 231 Gespräche). Gegenproben M1–M4 schlagen an. |
| 2 | Sitzungswechsel mitten im Laden: Seite 0 über Client 1, nach `detach()` lud die Folgeseite über Client 2. Abbruch kam nicht bis zur Anfrage. | alle Listen | Client am Start festhalten. Vor und nach jeder Seite die Generation prüfen (`AUTH_REQUIRED`). React-Query-`signal` bis `.abortSignal()` durchreichen (`REQUEST_ABORTED`). | 3 neue Tests: keine Anfrage mit `offset=500` nach `detach()`, Einzelabfrage liefert kein fremdes Ergebnis, Signal bricht die Fetch-Anfrage ab. Gegenproben M5/M6 schlagen an. |
| 3 | Personenkarte zeigte „Keine offene Frist“, obwohl die Aufgaben gar nicht geladen werden konnten. | Dashboard | Bei Ladefehler steht dort „Fristen konnten nicht geladen werden“. | `crossFindings.test.tsx`. Gegenprobe M-c schlägt an. |
| 4 | Live-Text verschwand, sobald eine gespeicherte Antwortzeile mit Status `streaming` vorlag (weg- und zurücknavigieren). | Chat | Lokaler Live-Text bleibt, bis die gespeicherte Zeile endgültig ist (`completed`, `interrupted` oder `failed`). Die halbfertige Zeile wird so lange ausgeblendet. | `crossFindings.test.tsx` wartet auf das Neuladen mit der `streaming`-Zeile. Gegenprobe M-a schlägt an. |
| 5 | Frage und Antwort mit gleichem `created_at`: Die Reihenfolge hing von der UUID ab, die Antwort stand manchmal vor der Frage. | Chat | `orderMessages` sortiert wie die Backend-Migration `phase1_context_order`: Zeit, dann Anfrage (`client_request_id`, sonst `id`), dann Rolle (Frage vor Antwort), dann `id`. Bei gleichem Zeitstempel bleiben ganze Paare zusammen (Reviewfund: zwei Paare A/B ergaben vorher Frage A, Frage B, Antwort A, Antwort B). Eine Antwort steht direkt hinter ihrer Frage, auch bei Uhrabweichung. | 4 Tests (Einheit inkl. Zwei-Paar-Fall, DOM). Gegenproben M-b und „ohne Paar-Schlüssel“ schlagen an. |
| 6 | Falsches Passwort: Der Fokus ging verloren, weil das Feld während der Anmeldung gesperrt war. Eine unvollständige E-Mail ging trotzdem an den Auth-Server. | Login | Der Fokus kommt zurück ins Passwort- bzw. E-Mail-Feld, dazu `aria-invalid`. Die E-Mail wird lokal geprüft und um Leerzeichen gekürzt, ohne Netzaufruf. | `login.test.tsx` (3), echte App (4 × „lokal abgelehnt“, „Fokus im E-Mail-Feld“, „keine fremde Anfrage“). |
| 7 | Zeitangaben waren mehrdeutig: Ältere Nachrichten zeigten nur die Uhrzeit, Listen aus anderen Jahren kein Jahr. | Chat, Listen | Listen zeigen heute die Uhrzeit, dann „gestern“, dann `TT.MM.` bzw. `TT.MM.JJJJ`. Nachrichten zeigen Datum und Uhrzeit (Berlin, auch an der Sommerzeit-Grenze). | `format.test.ts` (Mitternacht, Sommerzeit, 29. Februar, Jahre). |
| 8 | Auswahl „Bezug“ ragte mit langem Personennamen **11px aus der Karte**. | Dashboard 1280 | `.person-select` mit `min-width: 0` und Auslassungspunkten. | Bildprüfung „Bedienelement ragt aus der Karte“: vorher 3 Treffer, nachher 0. |
| 9 | Dokumente am Telefon: „Text anzeigen“ **überdeckte den Status-Knopf**. Der Status war kaum bedienbar. | Dokumente 390 | Ursache: Die Regel `:last-child:not(.doc-preview)` griff nie, deshalb lag der Status in der 20px-Symbolspalte. Lösung: eigene Klasse `.doc-status` in Spalte 2. | Bildprüfung „Bedienelemente überdecken sich“: vorher 1 Treffer, nachher 0. |
| 10 | Aufgaben am Telefon: Die Datumsspalte drückte lange Titel auf eine schmale Spalte, Wörter brachen ohne Trennstrich. | Aufgaben 390 | Datumsspalte höchstens 38 %, Text darin bricht um, Silbentrennung (`lang="de"`). | Bild vorher/nachher. |
| 11 | Personenkarte schnitt Namen, Pflegekasse und Fristtitel ab. Ähnliche lange Namen waren nicht unterscheidbar. | Dashboard | Name und Pflegekasse brechen um. Der Fristtitel zeigt bis zu 2 Zeilen. Etiketten stehen auf der ersten Zeile. | Bild vorher/nachher. |
| 12 | Nach „Antwort abbrechen“ (oder wenn die Antwort fertig wird, während der Knopf den Fokus hat) fiel der Fokus auf `body`. Grund: React verwendete denselben `<button>` wieder, der dann gesperrt war. | Chat | Getrennte Schlüssel für die Knöpfe „Abbrechen“ und „Senden“. Lag der Fokus auf „Abbrechen“, geht er ins Eingabefeld. | `chatKeyboard.test.tsx` (2 Tests, schlagen mit altem Code fehl), Bildlauf: Fokus vorher `body`, nachher Eingabefeld. |
| 13 | Langsame Antwort: Bis zum ersten Text war nur ein kleiner Cursor zu sehen. | Chat | Hinweis „Antwort wird erstellt …“. | `chatKeyboard.test.tsx`, Bild vorher/nachher. |

Testinfrastruktur: Der synthetische Transport (`tests/support/fakeBackend.ts`) bildet jetzt den Server-Ablauf nach. Frage und leere Antwortzeile (`streaming`) entstehen beim Start mit gleichem Zeitstempel. Bei Abbruch wird die Zeile `interrupted`, bei Fehler `failed`. Neue Bestände in `tests/support/scenarios.ts` (`lang`, `leer`, `langsam` im Harness).

## Noten je Screen und Ablauf (vorher → nachher)

| Screen / Ablauf | Vorher | Nachher | Begründung |
| --- | --- | --- | --- |
| Login und Fehler | 7/10 | 9/10 | Fokus bleibt erhalten, E-Mail wird lokal geprüft, beide Themes und 390/1280 ohne Überlauf. |
| Dashboard mit langen Inhalten | 6/10 | 9/10 | „Bezug“ bleibt in der Karte, Namen vollständig, ehrlicher Fehlerzustand, Zählung vollständig. |
| Aufgaben (Telefon, lang) | 6/10 | 9/10 | Titel lesbar, Datumsspalte begrenzt, alle Aufgaben statt höchstens 100. |
| Dokumente (Telefon) | 4/10 | 9/10 | Keine Überdeckung mehr, Status bedienbar. |
| Gesprächsliste | 7/10 | 9/10 | Alle Gespräche statt höchstens 200, Jahr bei alten Einträgen. |
| Chat-Verlauf (lang, Tabelle, Code, URLs) | 5/10 | 9/10 | Neueste Antwort ist auch nach 400+ Nachrichten da. Tabelle und Code scrollen in ihrem Kasten. Datum an alten Nachrichten. |
| Chat-Streaming und Navigation | 5/10 | 9/10 | Live-Text bleibt, Reihenfolge stimmt, genau eine Antwort am Ende. |
| Langsame / abgebrochene Antwort | 7/10 | 9/10 | Sichtbarer Wartehinweis, Teiltext genau einmal, Fokus im Eingabefeld. |
| Leerer Bestand | 9/10 | 9/10 | War schon gut, keine Änderung nötig. |
| Tastatur (Tab-Reihenfolge Dashboard, 30 Schritte, 2 Breiten) | 7/10 | 9/10 | Jedes Ziel im Bild und mit sichtbarem Fokusring (auch vorher). Fokusverlust bei Login und Abbruch ist behoben. |
| Sitzungswechsel während des Ladens | 6/10 | 9/10 | Keine Folgeseite über einen neuen Client, Abbruch reicht bis zur Anfrage. |

Verbleibende Beobachtung, kein Fehler: Am Telefon belegt der Gesprächskopf (Titel, Bezug, Modell) rund 170px von 720px. Das ist bedienbar und bewusst so gewählt. Bei Bedarf wäre ein einklappbarer Kopf eine Designfrage für später.

## Bilder (absolute Pfade)

Ordner:

- vorher (Stand `1dc2782`, gleiche Testdaten): `/Users/kentoky/Documents/React Projects/pflege-dashboard/docs/mocks/tagwerk/phase1-randfaelle/vorher/`
- nachher: `/Users/kentoky/Documents/React Projects/pflege-dashboard/docs/mocks/tagwerk/phase1-randfaelle/nachher/`
- echte App ohne Login: `/Users/kentoky/Documents/React Projects/pflege-dashboard/docs/mocks/tagwerk/phase1-randfaelle/echt/`

Jeder Ordner enthält eine `report.json` mit Prüfwerten, Fokusweg und Bereinigung.

Wichtigste Paare (jeweils in `vorher/` und `nachher/`):

- `lang-dokumente-telefon-dunkel.png` – Überdeckung von Status und „Text anzeigen“
- `lang-dashboard-breit-hell.png` – „Bezug“ ragt aus der Karte, abgeschnittene Namen
- `lang-dashboard-personen-telefon-dunkel.png` – Personenkarte am Telefon
- `lang-aufgaben-telefon-dunkel.png` – Titelspalte am Telefon
- `langsam-wartet-telefon-hell.png` – Wartehinweis
- `langsam-abgebrochen-breit-dunkel.png` – Abbruch, Teiltext genau einmal
- `login-email-unvollstaendig-telefon-hell.png` – Vorprüfung der E-Mail
- `lang-chat-tabelle-telefon-dunkel.png` – Tabelle und Code scrollen im Kasten

Echte App: `echt/login-breit-dunkel.png`, `echt/login-breit-hell.png`, `echt/login-telefon-hell.png`, `echt/login-telefon-dunkel.png`, dazu jeweils `echt/login-email-fehler-….png`.

## Werkzeuge

- `npm run shots:randfaelle` → `/Users/kentoky/Documents/React Projects/pflege-dashboard/tools/edge-shots.mjs`
  - Prüft im Bild: Überlauf, Text außerhalb des Bildes, Schrift unter 12px, Bedienziele unter 40px (Telefon), sich überdeckende Bedienelemente (feste Leisten und Scrollbereiche werden berücksichtigt), Bedienelemente außerhalb ihrer Karte, Tab-Weg mit Fokusring und Fokus nach Fehlern und Abbruch.
  - `APP_ROOT` zeigt auf eine Kopie des Referenzstands (für Vorher-Bilder).
- `npm run shots:echt` → `/Users/kentoky/Documents/React Projects/pflege-dashboard/tools/real-app-shots.mjs`
  - Echte App ohne Anmeldung. Bricht ab, wenn 5173/5174 belegt sind (beendet keine fremden Prozesse).
  - Schickt keine Zugangsdaten ab.

## Browser und Bereinigung

- Browser: nur Chrome for Testing **154.0.8037.92** (Nutzer-Chrome 154.0.8037.98) am festen Pfad. Version bei jedem Start geprüft. Unsichtbar, höchstens 1280×720 (Telefon 390, Tablet 768).
  - Playwright-Standardschalter, die Drosselung aufheben, sind entfernt. Je Lauf genau ein Browser, Läufe nacheinander. Externer Wächterprozess, Zeitlimit, try/finally.
- Letzte Läufe:
  - vorher: Browser-PID 11761, Wächter 11797
  - nachher: Browser-PID 69242, Wächter 69283
  - echte App: Browser-PID 57510, Wächter 57558, Dev-Gruppe 57420
- Nach jedem Lauf meldete die Bereinigung „noch aktiv: keine, Wächter beendet: ja“. Vite-Harness 5199 ist beendet, 5173 und 5174 sind frei.
- Fremde Prozesse blieben unberührt: Ein `Google Chrome for Testing` aus einem anderen Projekt (`scripts/design-shots/shoot.mjs`) und Vite-Server von Wissensfestung und lane-defense laufen weiter, sie gehören nicht zu diesem Auftrag.
- Die temporäre Vorher-Kopie liegt nur im Scratchpad und wird gelöscht. Im Projekt gab es keine Git-Änderung (kein Stage, kein Commit).

## Geänderte Dateien (Frontend-Bereich)

- `src/services/supabaseBackend.ts`, `src/services/types.ts`, `src/services/errors.ts`
- `src/data/queries.ts`, `src/data/model.ts`, `src/lib/format.ts`
- `src/routes/DashboardPage.tsx`, `src/routes/DocumentsPage.tsx`, `src/routes/LoginPage.tsx`
- `src/routes/chat/Thread.tsx`, `src/routes/chat/MessageView.tsx`, `src/routes/chat/Composer.tsx`, `src/routes/chat/PendingTurnView.tsx`
- `src/styles/app.css`, `package.json` (2 Skripte)
- `tests/harness/main.tsx`, `tests/support/fakeBackend.ts`, `tests/support/scenarios.ts`
- `tests/unit/supabaseBackend.test.ts`, `tests/unit/format.test.ts`, `tests/unit/volume.test.tsx`, `tests/unit/login.test.tsx`, `tests/unit/crossFindings.test.tsx`, `tests/unit/chatKeyboard.test.tsx`
- `tools/edge-shots.mjs`, `tools/real-app-shots.mjs`, `docs/mocks/tagwerk/phase1-randfaelle/**`

Die Tagwerk-Mocks in `docs/mocks/tagwerk/` (Designreferenz) blieben unverändert.
