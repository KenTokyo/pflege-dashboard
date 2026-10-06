# Supabase-Einrichtung für Pflege-Dashboard

Stand: 06.10.2026. Implementierungsordner: `/Users/kentoky/Documents/React Projects/pflege-dashboard`.

## Aktueller Stand: echte lokale Verbindung geprüft

Die neue Datenbank `pflegedashboard`, Kennung `ttbfpqveexmlqxkzwlmz`, ist in `eu-central-1` (Frankfurt) aktiv und gesund. Der bestehende Free-Tarif wurde beibehalten. Nur dieses neue Projekt wurde eingerichtet; kein anderes Projekt geändert.

### Lokale Werte und Schutz

Auf direkte Nutzeranweisung wurden das vorhandene Datenbankpasswort und die Verbindungsangaben aus `env.md` in `.env` übernommen. Der Passwortplatzhalter in der gelieferten Verbindung wurde ersetzt; Sonderzeichen werden URL-kodiert. `env.md` und `.env` sind ignoriert, unversioniert und haben Rechte `0600`. `env.md` blieb inhaltlich erhalten.

Befüllt sind `PROJECT_REF`, `SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `PGSSLROOTCERT` und `PGSSLMODE`. Der öffentliche Publishable-Key wurde über den sichtbaren Dashboard-Eintrag direkt in die lokale Datei geschrieben, ohne ihn auszugeben. Keine Admin-/Service-Role-/Provider-Schlüssel vorsorglich ausgelesen; kein persönlicher Verwaltungstoken nötig, da MCP über die autorisierte Erweiterung funktioniert.

Das offizielle CA-Zertifikat liegt lokal in `.local/supabase-ca.crt`. Der erste Node-Verbindungsversuch ohne diese CA schlug mit `SELF_SIGNED_CERT_IN_CHAIN` fehl. Mit der offiziellen CA gelang die Verbindung bei aktivierter Zertifikatsprüfung. Keine TLS-Prüfung abgeschaltet. `DATABASE_URL` verwendet den vom Nutzer gelieferten Transaction-Pooler auf Port 6543. Bei späteren persistenten Clients bzw. Migrationswerkzeugen den dokumentierten Direkt-/Session-Weg passend prüfen; keine benannten Prepared Statements über den Transaction-Pooler.

### Ausgeführte Nachweise und Einstellungen

| Prüfung | Ergebnis |
| --- | --- |
| Projekt über MCP | `ACTIVE_HEALTHY`, Frankfurt, PostgreSQL 17.11 |
| Echte lokale Datenbankverbindung aus `.env` | `current_database() = postgres`, Rolle `postgres`; Verbindung danach geschlossen |
| TLS vom lokalen Client zum Pooler | `encrypted = true`, `authorized = true` mit offizieller CA |
| Auth-API mit lokalem Publishable-Key | HTTP 200 |
| Öffentliche Registrierung | Dashboard gespeichert; Auth-API bestätigt `disable_signup = true` |
| Anonyme Anmeldung | ausgeschaltet; E-Mail-Anmeldung eingeschaltet |
| Site URL | gespeichert: `http://localhost:5173`, passend zur lokalen Projektkonfiguration |
| Access-Token-Gültigkeit | im Dashboard gespeichert: 300 Sekunden |
| Refresh-Token-Schutz | aktiv, Wiederverwendungsintervall 10 Sekunden erhalten |
| Sitzungsdauer/Inaktivität | auf Free im Dashboard gesperrt; keine 8h-/15min-Wirkung behauptet, kein Upgrade gebucht |
| Sicherheitsprüfung nach Korrektur | Supabase Security Advisors: `lints: []` |
| Aktuelles Anwendungsschema | 0 Tabellen, 0 Storage-Buckets, 0 Auth-Nutzer; keine App-Migration übertragen |

Hinweis zum TLS-Nachweis: `pg_stat_ssl` zeigt hinter dem Pooler dessen interne Datenbankverbindung und meldete hier `false`. Dies wurde nicht als Aussage über die geprüfte lokale TLS-Verbindung verwendet. Der Node-TLS-Socket bestätigte Verschlüsselung und Zertifikatsprüfung. Eine durchgängige TLS-Verbindung aller internen Supabase-Strecken wurde nicht nachgewiesen.

Der bei der Projektanlage erzeugte RLS-Eventtrigger war vom Supabase-Prüfer als öffentlich ausführbare privilegierte Funktion gemeldet worden. Zielgenau korrigiert, ohne den automatischen Schutz auszuschalten:

```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Danach `has_function_privilege` für beide Browserrollen `false`; Eventtrigger `ensure_rls` weiterhin aktiv. Kein Anwendungs-DDL, keine fremden Objekte geändert.

### Offene Backend-Abnahme

Die Umgebung und Verbindung sind eingerichtet. Die Anwendungstabellen sind bewusst noch nicht übernommen: Der parallel entstandene [Backend-Laufzeitbericht](backend-runtime-pruefung.md) bestätigt einen echten Migrationsfehler (`must be owner of table objects`) und noch kein bestandenes Schema-/Seed-/RLS-Gate. Nach Projektregeln erst diesen Fehler im zuständigen Backend beheben und prüfen, dann geprüfte Migrationen auf das verifizierte Projekt übertragen. Generierte Datenbanktypen, privater Anhangsspeicher und echter Login-/Nutzerablauf stehen damit noch aus. Keine neuen Login-Konten angelegt.

Keine eigenen Browser-, Server- oder Datenbankprozesse gestartet. Nur den vorhandenen Nutzer-Tab verwendet und erhalten. Eigene direkte Datenbankverbindungen geschlossen. Parallele Backend-/Designarbeit nicht verändert oder in den Setup-Commit aufgenommen.

Quellen: [Supabase-Verbindungen und TLS](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp). Browsernachweise liegen außerhalb des Repositorys im Codex-Artefaktordner (`supabase-anmeldung.png`, `supabase-sitzungen.png`).

## Vorheriger Zwischenstand: Browseranschluss in Codex bestätigt

Am 06.10.2026 konnte Codex den bereits geöffneten Supabase-Tab über die Browser-Erweiterung tatsächlich lesen und bedienen. Die weiter unten dokumentierte Anschlussblockade betrifft den früheren TreeChat-Lauf und gilt nicht für diesen Codex-Chat.

- Bestehende Sitzung: Organisation `kens projects`, Anzeige `FREE`; Formular zur Anlage eines neuen Projekts, noch kein nachgewiesen angelegtes Projekt.
- Vorhandenen Namen `pflegedashboard` erhalten. Region von `Europe` auf `Central EU (Frankfurt)` geändert.
- `Enable Data API` bleibt aktiv. `Automatically expose new tables` deaktiviert; `Enable automatic RLS` aktiviert. Dies sind vorbereitete Formularwerte, noch keine bereitgestellte Datenbank.
- Passwortfeld leer. Die Browser-Werkzeugregel verlangt bei einem neuen Passwort die nutzerseitige Eingabe und Übermittlung. Nutzer wurde gebeten, das Passwort selbst sicher zu speichern und `Create new project` abzuschließen. Keine Geheimnisse ausgelesen, übertragen oder gespeichert.
- Supabase-Erweiterung inzwischen installiert und verbunden. `list_organizations` und `list_projects` am 06.10.2026 erfolgreich ausgeführt: Organisation `kens projects` bestätigt; Liste enthält ausschließlich das bestehende fremde Projekt `service-oalab`. Neues `pflegedashboard` noch nicht vorhanden. Fremdes Projekt weder abgefragt noch geändert, abgesehen von Metadaten in der Projektliste.
- Kein zusätzlicher Browser, Server oder Prüfprozess gestartet; vorhandener Nutzer-Tab zur Übergabe erhalten.

Nächste Schritte nach Rückmeldung: neues Projekt und Kennung prüfen, Frankfurt/Free bestätigen, öffentliche Registrierung ausschalten und projektspezifischen Datenbankzugriff über den bereits verbundenen MCP prüfen. Eine gegebenenfalls benötigte manuelle MCP-Konfiguration wird mit `project_ref` auf dieses Projekt begrenzt; keine doppelte globale Verbindung vorsorglich anlegen. Bestehende Migrationen erst nach Backend-Abnahme ausführen; Entwürfe und Seed wurden gelesen, aber noch nicht gegen Supabase ausgeführt. Keine RLS-Tests im Repository vorhanden. Kein Anwendungslogin angelegt.

Quellen: [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp), [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Die offizielle Supabase-Anbindung unterstützt OAuth ohne manuell kopierten Verwaltungsschlüssel. Konfigurationsvorbereitung allein beweist keine Verbindung.

## Früherer TreeChat-Stand und Anschlussblock

Der Hosting-Auftrag erlaubt ein neues Projekt `pflege-dashboard` in Frankfurt unter der bestehenden angemeldeten Sitzung. Diese Nutzerkorrektur ersetzt für diesen Auftrag die älteren Projektanlageverbote in [AGENTS.md](../AGENTS.md) und [Anforderungen](anforderungen.md). Neue Provider-Nutzerkonten, Login-Konten, kostenpflichtige Buchungen und Änderungen an bestehenden Projekten bleiben ausgeschlossen.

| Prüfung in diesem Chat | Ergebnis |
| --- | --- |
| Einmalige Prüfung der verfügbaren Werkzeuge | Nur TreeChat `browser_*` für Browsersteuerung; kein ChatGPT-Browser-Plugin, Browser-Use oder Computer-Use-Connector |
| Einmaliger Aufruf `browser_status` | `available:false`, `assignedTabId:null` |
| Einmaliger Aufruf `browser_tabs` | `BrowserHostUnavailable`: `No browser host is available for this workspace.` |
| Angemeldete Supabase-Sitzung | Nicht zugänglich; daher nicht verifiziert |
| Geschützte Passwort-Eingabe/-Generierung | Im vorhandenen `browser_run` ausdrücklich nicht verfügbar |
| Geschützter Export von Schlüsseln direkt nach `.env` ohne Ausgabe | Kein solches Werkzeug verfügbar |
| Projektanlage durch diesen Chat | Nicht durchgeführt |
| Tatsächliche neue Projekt-ID, Region und Free-Plan | Nicht verifiziert; keine ID erfunden |
| Reale `.env` | Bei Vorbereitung nicht vorhanden; von diesem Chat nicht angelegt oder befüllt |
| Backend-Vertrag und API-Typen | `docs/api-contract.md` v0.1 und `types/api.ts` gelesen; Env-Grenzen abgeglichen, siehe Abschnitt 4 |

Die Blockade betrifft den Browseranschluss und zusätzlich den geschützten Umgang mit Geheimnissen. Ein Browseranschluss allein erlaubt noch keine sichere Passwort-Eingabe oder Schlüsselübertragung. Es gab keine Navigation, Eingaben, Fokuswechsel oder Änderungen an Nutzer-Tabs. Keine Browser-, Server- oder Spielprozesse gestartet, keine weiteren Chats angelegt, keine AI-Provideraufrufe ausgeführt. Öffentliche Supabase-Dokumentation wurde ohne Zugriff auf ein Projekt gelesen.

## 1. Den zulässigen Anschluss herstellen

1. Der Nutzer verbindet das ChatGPT-Browser-Plugin mit der bereits geöffneten Supabase-Sitzung und macht dessen Werkzeuge in diesem Chat verfügbar. Vorhandene Tabs erhalten; kein Ersatzbrowser und kein neuer Login durch den Agenten.
2. Fehlt eine angemeldete Sitzung, meldet sich ausschließlich der Nutzer selbst an. Keine Login-Zugangsdaten an den Chat senden.
3. Für eine vollständige Einrichtung durch den Agenten müssen sichere Passwort-Eingabe und ein ausdrücklich geschützter Export direkt in die lokale `.env` verfügbar sein. Der Export darf keine Werte in Werkzeugantworten, Protokollen, Vorschauen oder Screenshots ausgeben.
4. Fehlt dieser Weg, übernimmt der Nutzer die Passwort-Eingabe und das lokale Eintragen der Werte selbst. Keine Umgehung über DOM, `evaluate`, Zwischenablage-Ausgabe, Cookies, Tokens, Betriebssystemsteuerung oder CDP. Bei menschlicher Browseraktivität pausiert der Agent und wartet auf die Übergabe.

Der vorhandene TreeChat-Browserzugang ist in diesem Chat nicht verbunden. Kein persönlicher Chrome, keine AppleScript-/OS-Umgehung und kein Headless-Ersatz mit neuem Login sind für diesen Auftrag erlaubt.

## 2. Das eigene kostenlose Projekt anlegen

1. In der vorhandenen Sitzung die [vom Nutzer freigegebene Projektanlage](https://supabase.com/dashboard/new/vercel_icfg_sQgT8Exs0FZPhYsr4w2igKzz) verwenden. Die vorhandene Organisation nutzen; keine neue Organisation oder ein neues Nutzerkonto anlegen. Ob diese Organisation ein kostenloses Projekt erlaubt, ist noch ungeprüft.
2. Vor dem Absenden prüfen: neues Projekt, Name `pflege-dashboard`, Free-Plan ohne kostenpflichtige Zusatzoptionen. Wird nur eine kostenpflichtige Anlage angeboten oder ist das kostenlose Kontingent erschöpft, anhalten und den konkreten Block melden. Keine bestehenden Projekte löschen, pausieren oder umstellen.
3. Die **konkrete Region Central EU (Frankfurt), `eu-central-1`** wählen. Falls nötig die spezifischen Regionen aufklappen. Eine allgemeine Auswahl „Europe“ reicht für den ausdrücklich verlangten Standort nicht. [Supabase: Regionen](https://supabase.com/docs/guides/platform/regions)
4. Ein neues starkes Datenbankpasswort ausschließlich über die geschützte Eingabe festlegen, andernfalls vom Nutzer im Passwortmanager erzeugen und selbst eintragen lassen. Das ist das Passwort dieser neuen Datenbank, kein Supabase-Login und kein Demo-Login. Nicht an den Chat übermitteln oder in Dokumente kopieren.
5. `Create New Project` ist für dieses neue Projekt bereits autorisiert. Nach dem Absenden die Fertigstellung abwarten. Bei unklarem Ergebnis zuerst prüfen, ob es angelegt wurde; keine zweite Anlage auf Verdacht.
6. Anschließend Projektname, tatsächliche Projektkennung, Region `eu-central-1`, kostenlosen Plan und Bereitschaft im Dashboard verifizieren. Nur diese nicht geheimen Angaben dürfen in die Ergebnisdokumentation. Bisher wurde keiner dieser Projektwerte verifiziert.

Noch keine Migrationen, Seeds oder Edge Functions auf das entfernte Projekt übertragen. Die Projektanlage ist keine Freigabe des Backend-Schemas und keine Veröffentlichung der Anwendung.

## 3. Öffentliche Registrierung ausschalten

1. Ausschließlich im neu angelegten, anhand seiner Kennung geprüften Projekt die Auth-Einstellungen öffnen, aktuell unter **Authentication → Sign In / Providers**.
2. **Allow new users to sign up** ausschalten und speichern. Laut Backend-Vertrag auch die E-Mail-Registrierung deaktivieren, falls separat angeboten. **Allow anonymous sign-ins** ebenfalls ausgeschaltet lassen. E-Mail/Passwort bleibt als Anmeldeweg aktiv; keine zusätzlichen Provider einrichten. Das ausgeschaltete Sign-up erlaubt bestehenden Nutzern weiterhin die Anmeldung. [Supabase: Auth-Konfiguration](https://supabase.com/docs/guides/auth/general-configuration)
3. Einstellung nach dem Speichern erneut prüfen. Ein ausgeblendeter Registrierungsbutton in der späteren Oberfläche ersetzt diese Einstellung nicht. Die spätere Abnahme muss auch die Ablehnung einer öffentlichen Registrierung nachweisen, ohne ein Konto anzulegen.
4. Agenten legen keine Demo-Logins an und geben keine Login-Zugangsdaten ein. Der Nutzer legt diese später manuell im Supabase-Dashboard unter **Authentication → Users** an. Zugehöriges Profil und Workspace-Mitgliedschaft müssen anschließend nach dem freigegebenen Backend-Vertrag eingerichtet werden; ein Login allein beweist noch keinen Datenzugriff.

Alle Personen, Dokumente, Dateien und Testinhalte bleiben fiktiv. Der gemeinsame Demo-Login ist ausschließlich für die Demo vorgesehen. Bis zum echten Betrieb gelten die weiteren Datenschutzanforderungen aus `docs/anforderungen.md`.

## 4. Benötigte und optionale lokale Werte

[`.env.example`](../.env.example) enthält ausschließlich leere Werte. Sie beschreibt Namen, keine bestehende Verbindung. Alle Werte sind Zeichenfolgen; eine leere Zeile ist kein funktionsfähiger Zugang.

| Name | Wann nötig? | Inhalt und Grenze |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Für die spätere Frontend-Verbindung nötig | Öffentliche HTTPS-Projekt-URL aus dem geprüften Projekt |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Für die spätere Frontend-Verbindung nötig | Nur der öffentliche Publishable-Key; niemals Secret- oder Service-Role-Key |
| `SUPABASE_URL` | Wenn Backend-Werkzeuge diese URL lesen | Dieselbe Projekt-URL wie im Frontend; lokale und gehostete Ziele nicht vermischen |
| `SUPABASE_SECRET_KEY` | Nur bei bestätigtem privilegiertem Backend-Bedarf | Geheimer Server-Key; nicht vorsorglich auslesen oder im Browser verwenden |
| `SUPABASE_SERVICE_ROLE_KEY` | Nur als vom Backend bestätigte kompatible Alternative | Geheimer Legacy-Admin-Key; kein automatischer Ersatz und kein Frontend-Wert |
| `PROJECT_REF` | Für spätere Projektzuordnung und Freigabe nötig | Reale Supabase-Projektkennung, kein Passwort; nicht die Workspace-UUID aus der API |
| `DATABASE_URL` | Nur wenn der freigegebene Migrations-/Prüfweg eine SQL-Verbindung braucht | Vollständige Verbindungsadresse; mit Passwort vollständig geheim; niemals `VITE_*` |
| `SUPABASE_DB_PASSWORD` | Falls der freigegebene CLI-Weg ein separates Passwort benötigt | Rohes Datenbankpasswort lokal geschützt; nicht zusätzlich speichern, wenn unbenötigt |
| `SUPABASE_ACCESS_TOKEN` | Optional, erst bei später benötigter CLI-Projektverwaltung | Geheimer Management-Token; für die Browser-Projektanlage nicht erforderlich |

Für Client-Code sind Publishable-Keys vorgesehen. Secret- und kompatible Service-Role-Keys können die Zeilen-Zugriffsregeln umgehen und bleiben serverseitig. Keiner erhält ein `VITE_`-Präfix. Die URL und den benötigten öffentlichen Key entnimmt der Nutzer dem **Connect**-Dialog bzw. **Settings → API Keys** des geprüften Projekts und trägt sie lokal ein. [Supabase: API-Keys](https://supabase.com/docs/guides/getting-started/api-keys)

**Vertragsabgleich abgeschlossen:** Der inzwischen vorliegende [Backend-Vertrag v0.1](api-contract.md) und die [API-Typen](../types/api.ts) wurden am 06.10.2026 gelesen. Dazu kommt die ausdrückliche Nutzerbestätigung der zwei Frontend-Namen. Ergebnis:

- Im Browser ausschließlich `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY`. Kein Admin-/Providerkey, Datenbankpasswort, SQL-Zugang oder Management-Token erhält ein `VITE_`-Präfix.
- Privilegierter App-Zugang und Providerzugang bleiben privat im Server-/Edge-Bereich. Die leeren Admin-Felder sind nur eine bedarfsabhängige lokale Vorbereitung, keine Freigabe für einen Browser-Aufruf.
- `types/api.ts` enthält fachliche Request-/Antwort-/Streamtypen, keine Schlüssel- oder Env-Konfiguration. `workspaceId` ist dort eine UUID und darf nicht mit `PROJECT_REF` verwechselt werden. Einträge der Env-Vorlage werden als Zeichenfolgen geführt.
- Der Phase-0-Vertrag enthält keine konkreten serverseitigen Env-Leser; Edge Functions sind ausdrücklich für Phase 1/2 geplant. Die Hosting-/CLI-Namen `SUPABASE_URL`, `SUPABASE_SECRET_KEY` beziehungsweise `SUPABASE_SERVICE_ROLE_KEY`, `PROJECT_REF`, `DATABASE_URL`, `SUPABASE_DB_PASSWORD` und der optionale `SUPABASE_ACCESS_TOKEN` widersprechen dem Vertrag nicht, sind aber noch kein Nachweis einer laufenden Anbindung. Der Backend-Unterchat bestätigt die tatsächlich benötigte Admin-Key-Variante beim späteren Anschluss. Keine vorsorgliche Sammlung beider Admin-Keys.

Lokale `.env`-Namen sind nicht automatisch die von gehosteten Edge Functions bereitgestellten Variablennamen. Den sicheren Ladeweg und die nötigen Pflichtwerte beim späteren Anschluss prüfen. Vertrag und Typdatei wurden durch diesen Hosting-Unterchat nicht geändert.

AI-Providerkeys werden jetzt weder benötigt noch ausgelesen. Später ausschließlich als geschützte Edge-Function-Secrets hinterlegen, niemals als `VITE_*` oder als Vercel-Frontend-Wert. Das ist ein späterer Auftrag. Eine komplette lokale `.env` mit Datenbank- oder Admin-Werten niemals als Edge-Function-Secrets importieren. [Supabase: Function-Secrets](https://supabase.com/docs/guides/functions/secrets)

## 5. `.env` lokal sicher vorbereiten und befüllen

Nur der Nutzer oder ein ausdrücklich verfügbarer geschützter Export schreibt die echten Werte. Keine Geheimnisse in den Chat, Tooloutput, Docs, Logs, Screenshots, Shell-History oder Git geben. Keine Zugangsdaten anderer Projekte lesen. Keine Befehle wie `cat .env`, `printenv`, `set -x` oder Statusausgaben mit Schlüsseln verwenden.

Die folgenden Befehle sind eine **manuelle Anleitung**, wurden vom Hosting-Unterchat nicht auf die echte `.env` angewendet. Sie legen bei Bedarf nur eine leere Vorlage an, erhalten bestehende Inhalte und setzen Dateirechte auf `600` (nur der Besitzer kann lesen und schreiben). Keine Symlinks oder fremden Dateien verfolgen.

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard'
python3 - <<'PY'
import os
import stat
from pathlib import Path

template = Path('.env.example').read_text(encoding='utf-8')
for line in template.splitlines():
    line = line.strip()
    if line and not line.startswith('#'):
        if '=' not in line or line.split('=', 1)[1].strip():
            raise SystemExit('Abbruch: Vorlage enthält nicht leere Werte.')
target = Path('.env')
try:
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    fd = os.open(target, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise SystemExit('Abbruch: .env ist keine reguläre Datei.')
        os.fchmod(fd, 0o600)
    finally:
        os.close(fd)
    print('Vorhandene .env erhalten; Dateirechte sind 600.')
else:
    with os.fdopen(fd, 'w', encoding='utf-8') as file:
        os.fchmod(file.fileno(), 0o600)
        file.write(template)
    print('Leere Vorlage angelegt; noch keine echte Verbindung.')
PY
```

Anschließend nur die benötigten leeren Felder im lokalen Editor ergänzen. Bestehende Nutzerwerte nicht ersetzen. Passwörter und Tokens nicht in Terminalbefehle schreiben; ein Dashboard-Kopieren durch den Nutzer ist keine Erlaubnis zum Auslesen der Zwischenablage durch den Agenten. Nach dem Speichern erneut die Dateirechte prüfen, weil manche Editoren Dateien ersetzen. Die `.env.example` bleibt leer; die `.env` bleibt lokal und außerhalb von Git.

## 6. Kontrollierte Datenbankverbindung

Der Browser benötigt keine SQL-Verbindungsadresse. Für später freigegebene Datenbankarbeit die Verbindung aus **Connect** dieses Projekts übernehmen; Host, Benutzer und Port nicht erfinden. Für Migrationen eine direkte Verbindung verwenden; falls nur IPv4 erreichbar ist, den Session-Pooler prüfen. Keinen kostenpflichtigen IPv4-Zusatz buchen. Den Transaction-Pooler nicht ungeprüft für Migrationen verwenden. [Supabase: Datenbankverbindungen](https://supabase.com/docs/guides/database/connecting-to-postgres)

`DATABASE_URL` nur lokal vollständig eintragen. Sonderzeichen im Passwort für die URL korrekt codieren; `SUPABASE_DB_PASSWORD` enthält bei Bedarf dagegen den rohen Wert. Kein Platzhalter aus dem Connect-Dialog gilt als fertige Verbindung. Verschlüsselung erzwingen, mindestens `sslmode=require`; die spätere geprüfte Verbindung sollte zusätzlich das Serverzertifikat verifizieren. Keine Verbindung oder Passwortwerte zum Bericht ausgeben. [Supabase: SSL-Konfiguration](https://supabase.com/docs/guides/database/connecting-to-postgres#ssl)

Vor jeder späteren Änderung das Ziel aus Projektkennung, Projekt-URL und Verbindungsziel übereinstimmend prüfen. Lokaler Teststack und gehostetes Demo-Projekt bleiben getrennte Ziele. Dieser Chat startet keine Verbindung und lädt keine Migrationen hoch.

## 7. Git-Schutz und tatsächliche Prüfungen

Die vorhandene `.gitignore` deckt `.env`, `.env.*`, `.local/` und lokale Supabase-Artefakte ab. Die leere `.env.example` ist ausdrücklich ausgenommen. Die `.gitignore` wurde nicht geändert.

Ausgeführte Prüfung bei Vorbereitung:

- `git check-ignore -v --no-index .env .env.local .env.production backend/.env supabase/.env .env.example`: echte Env-Pfade ignoriert; `.env.example` durch die Ausnahme freigegeben.
- `git ls-files -- .env '.env.*' 'backend/.env*' 'supabase/.env*'`: keine solchen Dateien im Index bei Vorbereitung.
- `.env` nur auf Existenz geprüft; nicht vorhanden und keine Inhalte gelesen. Daher kein vorhandener Modus `600` oder echte Verbindung nachgewiesen.
- Bestehenden Arbeitsstand vor Änderungen geprüft. Fremde Änderungen an Regeln, Aufgaben und Mocks bleiben erhalten. Kein Stage, Commit oder Push.
- Finale Env-Prüfung: alle neun Namen eindeutig, alle Werte leer, nur die beiden erlaubten `VITE_`-Namen; keine erkennbaren Schlüsselwerte, gültiges UTF-8 und keine Leerzeichen am Zeilenende.
- Das manuelle Vorbereitungsskript mit harmlosen Dateien in einem temporären Testordner ausgeführt: neue Datei mit Modus `600`, vorhandener Inhalt unverändert, Symlink und nicht leere Vorlage abgelehnt. Testordner danach entfernt. Keine echte Projekt-`.env` angelegt.
- `git diff --check` bestanden; neue Dateien zusätzlich direkt auf Leerraum geprüft, da unversionierte Dateien von `git diff` noch nicht erfasst werden.
- Backend-Vertrag v0.1 und `types/api.ts` gelesen; Frontend-/Servergrenzen abgeglichen. Kein Laufzeit- oder Hostingnachweis daraus abgeleitet.

Vor dem späteren Eintragen echter Werte muss `.env` tatsächlich ignoriert **und unversioniert** sein. Ignorieren entfernt eine bereits versionierte Datei nicht aus Git. Bei einem Konflikt vor dem Befüllen anhalten und dem Orchestrator nur den Dateipfad und Befund melden, niemals den Inhalt.

## 8. Nach Freigabe: Migrationen und Zugriffsregeln abnehmen

Diese Schritte sind ausstehend und gehören nicht zur jetzigen Hosting-Ausführung:

1. Der Orchestrator prüft und gibt Backend-Vertrag, Migrationen, fiktiven Seed und Tests ausdrücklich frei. Erst dann Migrationen auf das anhand seiner Kennung geprüfte neue Demo-Projekt übertragen. Kein `db push` vor dieser Freigabe.
2. Übertragenen Migrationsstand und Typen prüfen. Auf allen Anwendungstabellen die **RLS-Regeln** abnehmen: Diese regeln, welche Daten ein angemeldeter Nutzer in seinem Arbeitsbereich lesen oder ändern darf. `workspace_id`, Mitgliedschaft und Schreibrechte nach dem Backend-Vertrag prüfen. `created_by` verweist dort auf ein workspacegebundenes Profil, nicht direkt auf `auth.users`; das Benutzerprofil wird über `user_id` zugeordnet. Browser erhalten keine direkten Tabellen-Schreibrechte; vorgesehene Datenbankfunktionen prüfen Rechte und protokollieren die Änderung atomar.
3. Ohne Anmeldung kein Zugriff; angemeldete Workspace-Mitglieder nur im eigenen Workspace. Falsche Workspace-Claims müssen scheitern. Private Anhänge und Storage-Regeln mitprüfen. Ein erfolgreicher Admin-Key-Zugriff beweist keine RLS-Sicherheit.
4. Der Nutzer legt später seine Demo-Logins manuell an. Den echten Anmelde- und Datenablauf erst danach prüfen. Synthetische SQL-Claims können Regeln prüfen, ersetzen diesen Nutzertest aber nicht. Kein Agent legt dafür ein Testkonto an oder gibt Login-Daten ein.
5. Spätere Anwendungstests prüfen Registrierungssperre, Abmeldung, Inaktivitätsablauf, fiktive Daten und Demo-Hinweis. Die im Vertrag geplanten Sessiongrenzen sind noch kein Nachweis ihrer Wirkung im Free-Hosting; verfügbare Fähigkeiten und tatsächliches Verhalten später prüfen, dafür keinen kostenpflichtigen Plan buchen. Provideraufrufe, Kostenlimits und AI-Abläufe bleiben bis zu einem eigenen Auftrag aus. Jeder tatsächlich gestartete Prüfbrowser und eigene Server wird sofort danach geschlossen; vorhandene Nutzer-Tabs bleiben erhalten.

## Bewertung und nächste menschliche Schritte

Die unabhängig mögliche Vorbereitung einschließlich Vertragsabgleich ist geprüft. Bewertung dieser Vorbereitung: **9/10**; die verbleibende Laufzeitanbindung ist ausdrücklich eine spätere Phase. Hosting ist **blockiert und nicht abgenommen**, daher keine Hosting-Erfolgsnote. Die leere Vorlage oder Dokumentation beweist weder ein vorhandenes Supabase-Projekt noch eine gültige Verbindung, funktionierende Anmeldung oder bestandene Zugriffsregeltests.

Nötig sind der verbundene zulässige Browser-Connector und zusätzlich ein geschützter Eingabe-/Exportweg, andernfalls manuelle Projektanlage, Passwort-Eingabe und lokale `.env`-Befüllung durch den Nutzer. Danach müssen reale Projekt-ID, Frankfurt und Free-Plan verifiziert und die Registrierung ausgeschaltet werden. Der Vertragsabgleich ist erledigt; die Freigabe geprüfter Migrationen bleibt separat beim Orchestrator. Keine Geheimnisse im Chat anfordern. Nach Übergabe dieses Ergebnisses wartet der Hosting-Unterchat; keine weitere Phase beginnt automatisch.
