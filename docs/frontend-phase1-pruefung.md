# Frontend Phase 1 – Prüfbericht (Tagwerk)

Stand: 06.10.2026. Verfasser: Frontend-/Design-Unterchat. Keine Git-Aktionen (kein Stage, kein Commit, kein Push).

## Ergebnis in Kürze

- Die echte Tagwerk-App steht: Login, App-Hülle, Dashboard, Gespräche mit Streaming, Dokumente, Aufgaben, Einstellungen.
- Daten kommen über Supabase JS (Auth, Tabellen, RPCs) aus dem Backend-Vertrag v1.1. Es gibt keine fest eingebauten Erfolgskarten.
- Der Chat streamt per `fetch`/SSE von `POST /api/chat-stream` am eigenen Node-Server, gleicher Ursprung. **Keine Edge Functions** (Nutzerkorrektur, Abschnitt „Nachtrag: eigener /api-Server“). Fehlt der Anbieter oder ein Modell, zeigt die App das ehrlich an. Es gibt keine Ersatzantwort.
- Alle Prüfungen laufen grün: Typprüfung, Lint, 105 Tests, Build, Bundle-Prüfung auf Geheimnisse und Edge-Pfade, Kontrast- und Ruheprüfung, echter HTTP-Proxytest, Prozess-Abbau-Test.
- Nachtrag Sitzungsgrenzen: Die lokale Abmeldung greift jetzt sofort, auch wenn Server oder Auth nie antworten. Späte Antworten alter Sitzungen werden verworfen (Abschnitt „Nachtrag: Sitzungsgrenzen“).
- 44 Bilder in beiden Themes, dazu Telefon- und Tablet-Breite. Ich habe sie selbst angesehen und Fehler daraus behoben.
- **Grenze:** Alle Bilder und UI-Abläufe nutzen einen synthetischen Test-Transport. Ein echter Login mit echtem Konto und eine echte KI-Antwort wurden **nicht** geprüft (siehe „Grenzen“).

## Stack

Vite 8 · React 19 · TypeScript 6 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) · TanStack Router (Code-Routen, Seiten lazy) · TanStack Query 5 · Tailwind 4 mit CSS-Variablen · Motion 14 · Supabase JS 2.117 · react-markdown + remark-gfm (ohne HTML).

TypeScript ist bewusst 6.0.3. Grund: typescript-eslint 8.71 unterstützt TypeScript 7 noch nicht.

## Design

- Ein Tokensystem in `src/styles/tokens.css`. Dunkel und Hell sind gleichwertig. Die Werte stammen aus den Tagwerk-Mocks.
- Schriften: Bricolage Grotesque (Überschriften) und Atkinson Hyperlegible Next (Text). Beide über Fontsource, Lizenz SIL OFL 1.1, lokal gebündelt, ohne Fremdabruf.
- Schmale Leiste (96 px), warmes Papier/Tinte, Kobalt als Akzent. Marker, Klebeband und Spray nur als kurze Akzente.
- Genau ein Graffiti-Moment je Ansicht: der Markerkreis um die dringendste Frist.
- Theme: gespeicherte Wahl, beim ersten Besuch das System. Ein Skript in `index.html` setzt es vor dem ersten Zeichnen.
- Bewegung nur einmalig beim Einblenden. Es gibt keine Endlos-Animation. „Bewegung reduzieren“ wird beachtet.

## Funktionen und Vertragsanschluss

| Bereich | Umsetzung |
| --- | --- |
| Login | E-Mail/Passwort über Supabase Auth. Keine Registrierung, kein „Angemeldet bleiben“. Das Passwortfeld wird nach jedem Versuch geleert. Nach der Anmeldung geht es zurück zur zuvor geöffneten Seite. Erlaubt sind nur bekannte App-Pfade. |
| Sitzung | Nur im flüchtigen Speicher (`persistSession:false`, `autoRefreshToken:false`). Abmeldung von Hand, nach 15 Minuten ohne Aktivität oder nach der 8-Stunden-Zeitbox. |
| Server-Sitzung | `POST /api/session` (eigener Node-Server) mit `touch`: einmal nach der Anmeldung, danach nur bei echter Interaktion, höchstens einmal pro Minute. Es gibt keinen Heartbeat. `SESSION_EXPIRED`, `AUTH_REQUIRED` und `WORKSPACE_FORBIDDEN` melden ab. |
| Abmelden | Lokal sofort und ohne Warten: Generation ungültig, Streams abbrechen, Token-Client abtrennen, Query-Cache leeren, Entwurfsübergabe löschen, Zustand „abgemeldet“. Danach im Hintergrund und begrenzt: `session end` (höchstens 4 s, wird abgebrochen; nicht bei abgelaufener Sitzung) und Widerruf über `signOut({scope:'local'})` am abgetrennten Client (höchstens 4 s). |
| Dashboard | Personen mit Pflegegrad, Kasse und nächster Frist, dringende Aufgaben, neue Dokumente mit Status, letzte Gespräche, große Chat-Eingabe. Alles aus dem echten Seed „Beispielwald“. |
| Gespräche | Liste mit Suche und Archiv. Umbenennen, Archivieren und Wiederherstellen über die vorhandenen RPCs. Neues Gespräch über `create_conversation` (Idempotenzschlüssel). Personenbezug über `assign_conversation_recipient`. Revisionskonflikte werden verständlich gemeldet. |
| Streaming | `ChatRequestV1` mit `attachmentIds: []`. Token nur im Header. Prüft Sequenz, Request-ID und Gespräch jedes Ereignisses. Doppelte Ereignisse werden ignoriert. Lücken gelten als Protokollfehler. HTTP 200 ohne `message.completed` ist kein Erfolg. |
| Wiederholung | Keine automatische kostenpflichtige Wiederholung. Bei Netzabriss gibt es „Antwort erneut abrufen“ mit derselben Request-ID: Der Server liefert das gespeicherte Replay. Bei `REQUEST_INTERRUPTED`, `IDEMPOTENCY_CONFLICT` oder Abbruch gibt es „Neu senden“ mit neuer ID. Bei `REQUEST_IN_PROGRESS` gibt es „Verlauf neu laden“. |
| Ehrlichkeit | Jede Antwort zeigt Modellname, Region („Region ungeprüft“, solange unbelegt), die vom Anbieter gemeldete Modell-ID (`provider_response_model`), Uhrzeit und Quellen (nur https). Unter dem Eingabefeld steht der Hinweis auf fehlende Rechts- und Medizinberatung. |
| Markdown | Kein HTML, keine Bilder, Links nur `https:`/`mailto:` mit `rel="noopener noreferrer nofollow"`. |
| Einstellungen | Modus nur lesend. Persona und Systemprompt über die vorhandene RPC `update_agent_settings` (nur für die Verwaltung). Modellkatalog mit Status und Region. Theme, Sitzungsstatus, Abmelden. |
| Demo-Banner | „Demo – keine echten Daten eingeben“ auf jeder Seite, auch beim Login. |
| Phase 2 | Keine Werkzeuge, Bestätigungen, Uploads, Exporte, RAG oder Modellauswahl als bedienbare Aktion. |

Typen: `BackendDatabase` aus `types/rpc.ts`, HTTP/SSE-Typen aus `types/phase1.ts`. Die generierte Fassade enthält jetzt beide neuen RPCs. Meine vorübergehende Typ-Ergänzung habe ich deshalb entfernt. Backend-Dateien habe ich nicht verändert.

## Ausgeführte Prüfungen (echte Ergebnisse)

Befehl: `npm run check`. Er führt die folgenden Schritte nacheinander aus und bricht beim ersten Fehler ab.

| Schritt | Ergebnis |
| --- | --- |
| `tsc --noEmit` (strict) | ✅ 0 Fehler |
| `eslint --max-warnings=0 .` (strictTypeChecked, react-hooks) | ✅ 0 Befunde |
| `vitest run` | ✅ 10 Dateien, **105 Tests bestanden** (Stand nach dem /api-Nachtrag) |
| `vite build` | ✅ größter Teil 219 kB (react), Einstieg 29 kB, keine Warnung über 500 kB, keine Sourcemaps |
| `tools/check-bundle.mjs` | ✅ 29 Dateien. 4 nicht öffentliche `.env`-Werte gegen den Build geprüft (Werte nie ausgegeben). Keine Geheimnis-Muster, kein `service_role`-JWT, kein Testcode, nur die zwei öffentlichen `VITE_`-Namen. Gegenprobe mit einer präparierten Datei: wird erkannt (Exit 1). |
| `tools/check-source.mjs` | ✅ 46 Kontrastpaare (dunkel + hell, auch halbtransparente Flächen) erfüllen AA. Kein `setInterval`, kein Polling, keine Endlos-Animation, kein `sessionStorage`, Schrift ≥ 12 px, Sie-Form, Demo-Banner-Text. |

Was die Tests abdecken:

- **Sitzung** (`activity.test.ts`, `session.test.tsx`):
  - kein Heartbeat; höchstens ein Touch pro Minute plus genau ein nachlaufender
  - Abmeldung nach 15 Minuten; abgelaufene Sitzung wird durch Interaktion nicht wiederbelebt; `checkNow` beim Tab-Wechsel; Zeitbox
  - Abmeldung leert Cache und Sitzung; ein Netzfehler beim Server-Ende meldet trotzdem lokal ab
  - `SESSION_EXPIRED` ruft kein `end` auf
  - Abmeldung bricht einen laufenden Stream ab
  - Rücksprung nach dem Login; fremde Ziele werden ignoriert
- **Theme** (`theme.test.ts`): Systemwahl, gespeicherte Wahl, gesperrter Speicher, Skript vor dem ersten Zeichnen.
- **SSE und Transport** (`sse.test.ts`):
  - zerstückelte Chunks, CRLF, Sequenzlücken, Doppel-Ereignisse
  - Fehlerereignis, fehlendes `completed`, Netzabriss, Abbruch
  - 409-Codes, 503 Anbieter fehlt, 404 nicht ausgerollt
  - Token nie in der URL
- **Stream-Store** (`streamStore.test.ts`):
  - Replay mit derselben ID; neue ID bei bewusstem Neusenden
  - ein Request je Gespräch; Abbruch; Budgetfehler ohne Ersatztext
  - Sitzungsverlust; Abbau
- **Chat-UI** (`chat.test.tsx`):
  - ohne Modell kein Aufruf
  - Dashboard-Frage → neues Gespräch → gestreamte Antwort mit Modell, Region und Quelle
  - „Anbieter fehlt“ ohne Wiederholungsknopf
  - „erneut abrufen“ mit gleicher ID; „Neu senden“ mit neuer ID
  - Revisionskonflikt beim Umbenennen
- **Logik und Format** (`model.test.tsx`, `format.test.ts`):
  - SQLSTATE → Vertragscodes ohne SQL-Text
  - Sortierung, effektives Modell, Modell-Snapshot, sicheres Markdown
  - Berliner Datum, Begrüßung, Kürzel

## Bildprüfung

- Ein eigener Lauf: `node tools/shots.mjs`, gestartet mit `taskpolicy -b nice -n 10`, Dauer 120 s.
- Warum ein eigener Browser: Der sichtbare TreeChat-Browser war nicht verfügbar (`browser_status: available:false`).
- Browser: Chrome for Testing 154.0.8037.92. Das passt zum Nutzer-Chrome 154.0.8037.98.
- Genau ein Browser, unsichtbar, Ansicht höchstens 1280×720, ohne Drosselungs-Flags.
- Externer Wächterprozess, try/finally, Zeitlimit.
- Danach waren Browser, alle drei Kindprozesse, Wächter und Vite-Harness-Server nachweislich beendet. Fremde Prüfbrowser anderer Projekte blieben unberührt.

Bilder in `docs/mocks/tagwerk/phase1/` (44 PNG plus `report.json`):

- Desktop 1280×720, dunkel und hell:
  - Login, falsches Passwort, Abmeldung nach 15 Minuten
  - Dashboard, Gespräche, Dokumente, Aufgaben, Einstellungen
  - Chat ohne Modell (echter Seed-Zustand)
  - Chat beim Streamen (angehalten), Chat mit fertiger Antwort und Quelle
  - Chat bei fehlendem Anbieter, Chat nach Verbindungsabriss
- Telefon 390×720, dunkel und hell: Login, Dashboard oben und unten, Gespräche, Chat, Einstellungen.
- Tablet 768×720, dunkel: dieselben Ansichten.

Automatische Prüfung je Bild:

- waagerechter Überlauf, Schrift unter 12 px, Bedienziele unter 40 px auf dem Telefon
- fremde Netzanfragen (alle blockiert und gezählt)
- Konsolenfehler

Ergebnis im letzten Lauf: **0 Befunde, 0 Konsolenmeldungen.**

Ruhiger Leerlauf, gemessen im Browser nach dem Einschwingen über 3 s: **0 Animationsbilder, 0 Timer, 0 laufende Animationen**. Gemessen auf Dashboard, Chat ohne Modell und Chat mit Antwort, jeweils in beiden Themes.

### Selbst gefundene und behobene Fehler

1. **Begrüßung falsch:** Mittags stand „Guten Abend“. Grund: `de-DE` liefert die Stunde als „13 Uhr“, und das ergibt `NaN`. Behoben, Test ergänzt.
2. **Kürzel „T(“:** Bei „Testnutzerin (synthetisch)“ entstand ein falsches Avatar-Kürzel. Jetzt zählen nur Wörter, die mit einem Buchstaben beginnen.
3. **Rücksprung fehlte:** Nach Ablauf und erneuter Anmeldung landete man immer auf der Übersicht. Jetzt geht es zur letzten Seite zurück. Nur bekannte Pfade sind erlaubt, kein offenes Weiterleitungsziel.
4. **Tailwind-Quelle:** Im Harness fehlten Klassen wie `sr-only`, weil Tailwind den falschen Ordner durchsuchte. Die Quelle ist jetzt ausdrücklich `src/`. Damit sind Produkt und Harness gleich. Das Produkt war nicht betroffen, das habe ich im Build nachgeprüft.
5. **Chat auf Telefon und Tablet:** Das Eingabefeld lag außerhalb des Bildschirms. Jetzt ist die Höhe im Chat fest. Die Kopfzeile ist kompakter: Modell-Chip und Archiv-Knopf stehen in einer Zeile, der Modus-Chip ist ausgeblendet.
6. **Personenfeld abgeschnitten:** Im Bezug-Feld fehlte „Pflegegrad 3“. Das Feld ist jetzt breiter.
7. **Login auf kleinen Bildschirmen:** Die Marke stand doppelt, und das Formular lag weit unten. Jetzt kommt das Formular zuerst.
8. **Missverständlicher Hinweis:** In den Einstellungen klang es, als gäbe es Erstell-Werkzeuge. Jetzt steht dort, dass Phase 1 nur mit Text antwortet. So steht es im Vertrag v1.0.
9. **Kleine Tippziele auf dem Telefon:** „Alle“-Links und Quellenlinks haben jetzt mindestens 44 px.
10. **Konfiguration gehärtet:** Ins Bundle gelangen nur noch die zwei öffentlichen Namen, nicht mehr das ganze `import.meta.env`.

## Nachtrag: Sitzungsgrenzen (Abmeldung und späte Antworten)

### Gefundene Ursache
- **Abmeldung konnte hängen.** `endSession` begrenzte nur `session end` auf 4 s. Danach wartete es ohne Grenze auf `auth.signOut`. Erst im `finally` wurde „abgemeldet“ gesetzt. Der Adapter tauschte den Client erst nach einer Antwort des Auth-Servers. Ein nie antwortender Abmelde- oder Refresh-Aufruf hätte die lokale Abmeldung und die Sperre `ending` dauerhaft festgehalten.
- **Späte Antworten ohne Schutz:**
  - `loadWorkspace` konnte nach einer Abmeldung noch „angemeldet“ setzen.
  - Ein alter Touch konnte nach Abmeldung oder Neuanmeldung den Sitzungsstatus setzen oder die neue Sitzung abmelden.
  - Eine späte Schreibaktion konnte den gerade geleerten Cache wieder füllen.
  - Eine späte Gesprächserstellung konnte einen Entwurf über die Abmeldung hinaus ablegen.
- Die alten Tests prüften nur ein sofort abgelehntes `session end`. Die alte Fake-Abmeldung löste immer sofort auf.

### Lösung: eine Sitzungsgeneration statt verstreuter Einzelfälle
- **`AuthPort.detach()`** ersetzt `signOut()`. Es setzt synchron einen leeren Supabase-Client ein. Ab sofort hat keine Anfrage mehr ein Token. Zurück kommt nur eine abgetrennte Sitzung für den Widerruf. Ihre Ereignisse ignoriert die App.
- **Abmeldung lokal synchron:** Generation erhöhen, Streams abbrechen, `detach()`, Abfragen abbrechen und Cache leeren, Entwurf löschen, Zustand „abgemeldet“. Erst danach folgt ein Hintergrundschritt: `session end` mit dem Token der abgetrennten Sitzung (höchstens 4 s, die Anfrage wird abgebrochen), dann der Widerruf (höchstens 4 s). Dieser Schritt berührt keinen App-Zustand. Neues Anmelden geht sofort.
- **Generation (`epoch`):** Anmeldung, Abmeldung, Neuladen des Arbeitsbereichs und Aushängen erhöhen sie. Jedes späte Ergebnis wird gegen sie geprüft:
  - Zustandswechsel über `commit`
  - Touch: Erfolg und Fehler
  - Abmeldewünsche mit fremder Generation, z. B. ein verspäteter Stream-Fehler
  - Stream-Store: Ereignisse und Abschluss
  - Schreibaktionen (`useSessionWrite`)
  - Entwurfsübergabe und Navigation nach der Gesprächserstellung
- **Stream-Provider:** Er ist jetzt pro Generation eingehängt (`key` = Arbeitsbereich + Generation).
- **Verspätete Anmeldung:** Der Adapter verwirft eine Anmeldung, die erst nach `detach()` zurückkommt, und widerruft sie.
- **Aushängen:** Generation ungültig, Streams abgebrochen, Listener entfernt.
- **Unverändert:** 15 Minuten Inaktivität, 8 Stunden Zeitbox, höchstens ein Touch pro Minute. Kein Polling, kein Heartbeat, keine neuen Timer im Leerlauf.

### Belege (synthetischer Test-Transport, kein Konto)
Neu sind `tests/unit/sessionRaces.test.tsx` (12 Tests) und `tests/unit/supabaseBackend.test.ts` (2 Tests). Der Test-Transport kann jetzt einzelne Aufrufe gezielt anhalten: `signIn`, `loadWorkspace`, `touch`, `end`, Widerruf und Umbenennen.

- Nie auflösendes `session end` und nie auflösender Widerruf: sofort abgemeldet, Token weg (`getSession() = null`), Cache leer, Entwurf gelöscht.
- `session end` wird nach 4 s abgebrochen, danach folgt der Widerruf. Eine neue Anmeldung gelingt, während der alte Widerruf noch hängt. Die neue Sitzung bleibt bestehen.
- `bounded()` mit Fake-Timern: Es endet genau an der Grenze und bricht die Anfrage ab.
- Verspätetes `loadWorkspace` und verspätetes `signIn` beleben keine abgemeldete Sitzung.
- Alte Touch-Antworten nach Neuanmeldung, als Fehler oder als Erfolg: kein Sitzungsstatus, keine Abmeldung der neuen Sitzung.
- `signOut('expired', alteGeneration)` meldet die neue Sitzung nicht ab.
- Eine verspätete Umbenennung füllt den geleerten Cache nicht wieder und zeigt keinen Fehler.
- Aushängen: Späte Antworten setzen keinen Zustand und lösen keinen Touch aus. Laufende Streams werden abgebrochen.
- Echter Supabase-Adapter mit gehaltenem Fetch-Stub: `detach()` entfernt das Token ohne Netz. Eine nach `detach()` eintreffende Anmeldung wird verworfen und widerrufen.

**Rückbauprüfung:** Ich habe jeden Schutz einzeln vorübergehend entfernt und den Testsatz laufen lassen. Danach habe ich jede Datei wiederhergestellt (per `diff` bestätigt).

| Entfernter Schutz | Ergebnis |
| --- | --- |
| Generationsprüfung in `commit` | 1 Test rot |
| Touch-Generationsprüfung | 1 Test rot (diesen Test habe ich ergänzt, vorher blieb der Rückbau unentdeckt) |
| Alte, wartende Abmeldelogik | 4 Tests rot |
| Generationsfilter bei `signOut` | 1 Test rot |
| Schutz der Schreibaktionen | 1 Test rot |

Ergebnis nach dem Nachtrag mit `npm run check`: Typprüfung, Lint, **101 Tests**, Build, Bundle- und Quelltext-Prüfung grün.

- **Bilder:** Am Aussehen hat sich nichts geändert. Die 44 Bilder sind deshalb nicht neu aufgenommen. Im Bildskript wartet nur die Abmeldeprüfung jetzt auf den Hintergrundschritt. Für diesen Nachtrag lief kein Prüfbrowser.
- **Grenze:** Auch diese Belege nutzen den synthetischen Test-Transport bzw. einen Fetch-Stub. Ein synthetischer Test ist kein echter Login und kein echter Widerruf gegen den gehosteten Auth-Server.

## Nachtrag: eigener /api-Server statt Edge Functions

Anlass: Nutzerkorrektur vom 06.10.2026 – keine Edge Functions. Supabase bleibt für Auth, Datenbank und Speicher. Am Layout hat sich nichts geändert, deshalb gibt es keine neuen Bilder. Es lief kein Browser.

### Was sich geändert hat

| Bereich | Vorher | Jetzt |
| --- | --- | --- |
| Client-Pfad | `https://<projekt>.supabase.co/functions/v1/…` | `/api/session`, `/api/chat-stream` (gleicher Ursprung), `src/services/api.ts` |
| Header | Bearer + `apikey` | nur Bearer, kein Projektschlüssel, `credentials: 'omit'` (keine Cookies) |
| Server nicht erreichbar | — | 502/503/504 ohne JSON → `NETWORK` („Verbindung“), nicht „Serverfehler“ |
| Dev | `vite` | `npm run dev`: Node-Server `127.0.0.1:5174`, wartet auf `/api/health`, dann Vite `127.0.0.1:5173` mit Proxy `^/api/` → 5174 |
| Produktion | `vite preview` | `npm start`: Node liefert `dist/` und `/api` auf 5174 (`STATIC_DIR`). `npm run preview` = Build + Start |
| Prüfungen | — | Bundle und Quelltext verbieten `functions/v1`, `.functions` und feste lokale Hosts im eigenen Code |

Vertrag v1.1 stammt vom Backend-Agenten (`docs/api-contract.md`, `PHASE1_API` in `types/phase1.ts`). Ein Unit-Test prüft, dass die Client-Pfade genau `PHASE1_API` entsprechen. Die JSON- und SSE-Formate sind unverändert. Alle Sitzungs-, Abmelde-, Generations- und Abbruchtests sind unverändert grün.

Der Vite-Proxy schreibt `Host` auf das Ziel um (`changeOrigin`), lässt `Origin` unverändert (der Node-Server prüft sie) und protokolliert keine Header oder Bodys. Fällt der Node-Server aus, antwortet der Proxy selbst mit `502 {error:{code:"NETWORK",…}}`.

**Ausnahme in der Bundle-Prüfung:** Der Chunk `supabase-*.js` enthält den mitgelieferten, ungenutzten Functions-Client der Bibliothek (Standard-URL `functions/v1`). Er wird nie aufgerufen; die Quelltext-Prüfung verbietet `.functions` im eigenen Code.

### Prozess-Aufsicht (`tools/lib/supervisor.mjs`)

- Jeder Dienst startet in einer eigenen Prozessgruppe. Signale gehen nur an diese eigenen Gruppen.
- Strg+C, SIGTERM, SIGHUP, Ausfall oder Startfehler eines Dienstes: SIGTERM an alle eigenen Gruppen, nach 5 s SIGKILL an die noch lebenden.
- Ist Port 5173 oder 5174 schon belegt, bricht das Skript ab. Es beendet keine fremden Prozesse.
- Der Node-Server liest `.env` selbst. Die Skripte lesen, kopieren und protokollieren keine Werte.

### Belege (echte HTTP-Anfragen, ohne Konto und ohne Provider)

| Prüfung | Ergebnis |
| --- | --- |
| `tools/check-proxy.mjs`: echter Vite-Server mit `vite.config.ts` → synthetischer App-Server; echter Client-Code (`api.ts`) | ✅ 21/21: Pfade, Bearer ja, `apikey`/Cookie nein, Host umgeschrieben, Origin erhalten, 401-JSON durchgereicht, 404-JSON, **SSE ungepuffert** (Bild 2 wird erst gesendet, nachdem der Client Bild 1 hat), **Abbruch schließt den Upstream**, `/apix` und `/api` ohne Schrägstrich nicht weitergeleitet, Server weg → 502 `NETWORK`, kein Token und kein Authorization-Header in den Vite-Logs |
| Gegenproben Proxytest | ✅ erkannt: eigener Fehlerhandler entfernt, `apikey` wieder gesendet, Proxy-Muster `/api` statt `^/api/`, Abbruchsignal nicht an `fetch` übergeben |
| `tools/check-dev.mjs`: Aufsicht mit synthetischen Diensten samt Enkelprozessen | ✅ 14/14: normales Ende, Ausfall beendet den anderen Dienst, hängender Dienst nach Frist erzwungen beendet (< 2 s bei 0,8 s Frist), Startfehler, SIGINT → Exit 130, keine Restprozesse |
| Gegenproben Aufsicht | ✅ erkannt: nur Hauptprozess statt Gruppe signalisiert (8 Fehler), kein SIGKILL (2 Fehler), Ausfall stoppt nicht. Das Prüfskript räumt seine eigenen PIDs danach selbst ab (nur PIDs mit eigenem Testbefehl). |
| Echter `npm run dev`, Endstand (gehostet, Rolle `pflege_backend`, finaler Start-/Shutdown-Fix im Backend) | ✅ Abschlusslauf: `/api/health` über Vite 200 `{"ok":true}`; `/api/session` und `/api/chat-stream` ohne Token sowie mit ungültigem Token 401 `AUTH_REQUIRED` (echte Supabase-Auth-Prüfung); fremde Origin 403; Startseite 200. Strg+C → Exit 130 sofort, alle 4 eigenen Prozesse beendet, 5173/5174 frei, keine Token-/Schlüsselmuster im Log |
| Echter `npm start`, Endstand | ✅ Abschlusslauf: `/api/health` 200; `/api/session` ohne Token 401; `index.html` `no-cache`, `/assets/*` `immutable`, SPA-Rückfall für `/aufgaben`, fehlendes Asset 404, `/.env` und Traversal 403, `/api/x` 404 JSON. Strg+C → Exit 130 nach ≤ 1 s, 3 eigene Prozesse beendet, 5174 frei, keine Token-/Schlüsselmuster im Log |
| Port belegt | ✅ `npm run dev` und `npm start` brechen mit Hinweis ab, der fremde Prozess läuft unberührt weiter |

### Offene Punkte

- Abschluss durch Orchestrator: Der Backend-Agent hat unbekannte `/api`-Pfade auf „Endpunkt nicht vorhanden.“ korrigiert. Code und Status bleiben gleich. Der Orchestrator hat den Diff gelesen und Typecheck plus alle 29 betroffenen Backend-HTTP-/Transporttests bestanden. Der gemeldete Textbefund ist damit geschlossen.
- **Verlauf:** Zwischen ca. 14:20 und der Fertigmeldung startete der Node-Server nicht. Grund: Er brauchte schon die neue Datenbankrolle `pflege_backend` (Migration `20261006140000_node_role.sql`), die im gehosteten Projekt noch fehlte. Mein Startskript hat dabei richtig reagiert: Exit 1, keine Restprozesse.
- Wird der Aufsichtsprozess selbst hart beendet (SIGKILL), kann er seine Dienste nicht mehr abbauen. Das kann kein Prozess für sich selbst lösen. Dann laufen die Dienste in eigenen Gruppen weiter und müssen von Hand beendet werden.

## Noten vorher → nachher (eigene Einschätzung, 1–10)

„Vorher“ meint den Stand vor meiner Bild- und Testprüfung. Die Noten sind Einschätzungen, keine Messwerte.

| Ansicht / Ablauf | Vorher | Nachher | Begründung |
| --- | --- | --- | --- |
| Login (Desktop) | 8 | 9 | Klar und ehrlich. Rücksprung ergänzt. |
| Login (Telefon) | 6 | 9 | Formular zuerst, keine doppelte Marke. |
| Dashboard | 6 | 9 | Begrüßung und Kürzel richtig. Echte Seed-Daten, ein Graffiti-Moment. |
| Gesprächsliste | 8 | 9 | Suche und Archiv klar. Auf dem Telefon gut lesbar. |
| Chat Streaming und Antwort (Desktop) | 8 | 9 | Modell, Region, Anbieter-ID und Quelle sichtbar. Bezug-Feld vollständig. |
| Chat (Telefon/Tablet) | 4 | 9 | Eingabefeld sichtbar, Kopfzeile kompakt. |
| Chat-Fehlerwege | 8 | 9 | Konkrete Meldungen. Nur passende Wiederherstellungsknöpfe. Mit Tests belegt. |
| Chat ohne Modell (echter Seed) | 8 | 9 | Ehrlicher Hinweis, Senden gesperrt, kein Aufruf. |
| Dokumente | 9 | 9 | Status manuell, Hinweis „App versendet nichts“. |
| Aufgaben | 9 | 9 | Nach Dringlichkeit sortiert. Hinweis, dass keine Rechtsfristen berechnet werden. |
| Einstellungen | 7 | 9 | Ehrlicher Modus-Hinweis. Modellkatalog mit Region. |
| Sitzung und Abmeldung | 6 | 9 | Lokale Abmeldung auch bei hängendem Server garantiert. Späte Antworten werden verworfen. Mit Tests und Rückbauprüfung belegt. Vorher 6 wegen der gefundenen Hängegefahr. |
| Theme dunkel/hell | 9 | 9 | Beide AA. Kein Aufblitzen beim Laden. |

## Grenzen (ehrlich)

- **Kein echter Login, keine echte KI-Antwort.** Alle UI-Abläufe und Bilder nutzen den synthetischen Test-Transport aus `tests/support/fakeBackend.ts`. Das Login-Formular, die Routen, die Sitzungslogik und die Stream-Verarbeitung sind echter Produktcode. Netz, Supabase und Anbieter sind ersetzt. Ein synthetischer Bildlauf ist **kein bestandener echter Login- oder KI-Gate-Lauf.**
- **Backend-Anschluss:** Keine Edge Functions mehr. `/api/session` und `/api/chat-stream` laufen im eigenen Node-Server des Backend-Agenten (`backend/runtime/`). Ich habe ihn nur ohne Konto angesprochen (Health, 401, 403, 404, statische Dateien). Ein angemeldeter Touch, ein echter Logout am Server und ein echter Stream sind ohne Konto, Providerkey und Budget **nicht** geprüft. Konten und Secrets sind nicht meine Aufgabe.
- **Synthetisches Modell nur im Harness.** „OpenAI · Testmodell (synthetisch)“ gibt es nur im Harness. Der echte Seed hat kein freigegebenes Modell und Budget 0. Das Produkt zeigt deshalb „Kein Modell freigegeben“ (Bilder `chat-ohne-modell-*`).
- **Keine Konten, keine Zugangsdaten.** Ich habe keine Konten angelegt und keine Zugangsdaten eingegeben. Die Test-Anmeldedaten (`pruefung@beispiel.invalid`) gelten nur für den Test-Transport. Sie stehen nachweislich nicht im Produkt-Build.
- **Ältere Tokens.** Nach dem Abmelden können bereits ausgegebene JWTs direkte Tabellenzugriffe bis zu ihrem Ablauf behalten (laut Vertrag 300 s). Das ist eine Backend-Grenze.
- **Persona bearbeiten** nutzt die vorhandene RPC. Im Harness ist sie bewusst abgelehnt und deshalb nicht im Bild.
- **Bildgröße.** Telefonbilder haben 720 px Höhe, wegen der Regel „höchstens 1280×720“. Echte Telefone sind höher.
- **Nicht geprüft:** echte Geräte und Screenreader. Rollen und Labels sind nur über Testing Library geprüft.
- **Kleiner Schönheitsfehler:** Auf dem Desktop-Dashboard bleibt unter der Personenkarte etwas Leerraum, weil die Karte daneben höher ist.
- **Laufzeit-Warnung:** jsdom 30 meldet bei `npm install` eine Engine-Warnung für Node 25. Die Tests laufen trotzdem fehlerfrei.

## Dateien

- Produkt:
  - `src/` (App, Routen, Dienste, Stream, Sitzung, Styles)
  - `index.html`, `public/favicon.svg`
  - `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`
- Tests und Harness:
  - `tests/unit/*` und `tests/support/*` (synthetischer Seed, Test-Transport mit haltbaren Aufrufen, Render-Helfer)
  - `tests/harness/*` und `vite.harness.config.ts` (nur für Bilder, nie im Build)
- Werkzeuge: `tools/check-bundle.mjs`, `tools/check-source.mjs`, `tools/check-proxy.mjs`, `tools/check-dev.mjs`, `tools/dev.mjs`, `tools/start.mjs`, `tools/lib/supervisor.mjs`, `tools/shots.mjs` (nutzt `docs/mocks/tools/browser.mjs`)
- Bilder: `docs/mocks/tagwerk/phase1/*.png` und `report.json`

Befehle zum Wiederholen:

- `npm run check` (ohne Browser)
- `npm run dev` (Node-Server 5174 + Vite 5173), `npm start` (Node liefert `dist/` und `/api` auf 5174), `npm run dev:web` (nur Vite, `/api` meldet dann „nicht erreichbar“)
- `taskpolicy -b nice -n 10 npm run shots` (genau ein Prüfbrowser, räumt selbst auf)
