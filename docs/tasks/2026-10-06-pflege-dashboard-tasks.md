# Pflege-Dashboard – Phasen und Gates

## Initial goal

[Arbeitsauftrag](2026-10-06-pflege-dashboard-enhanced-prompt.md) und [vollständige Anforderungen](../anforderungen.md).

## Phase 0 – Designs und Backend-Grundlage

- [x] Original vollständig lesen; TreeChat-, globale Browser- und Coding-Regeln lesen.
- [x] Eigenständigen Zielordner und Git-Repository anlegen; Anforderungen unverändert kopieren.
- [x] Modelle/Optionen live prüfen und nach Nutzerkorrektur genau starten: `claudeAgent/claude-opus-5-5`, `effort: high`; `codex/gpt-6.1-sol`, `reasoningEffort: xhigh`. `capabilities` zeigte nur alte Favoriten; fehlender Eintrag war kein Beleg fehlender Startfähigkeit. Opus-Kennung im lokalen TreeChat-Modellregister zusätzlich geprüft, beide Startwerte vom Tool akzeptiert.
- [x] Genau zwei lokale TreeChat-Unterchats mit vollständigem Phase-0-Brief aktiv: Frontend `agent-c2f0c080d724ad307a7f96d6f7c0dbfa`, Backend `agent-57aea06487987ff6370bde548102f71b`. Beide lokal, full-access, Abschlussmeldung aktiv. Die anfänglichen Läufe mit älteren Modellen wurden vor der Übernahme unterbrochen und archiviert. Nutzer erlaubt jetzt maximal vier, es werden hier nur zwei benötigt.
- [x] Backend: Schema, RLS, privater Storage, fiktiver Seed, lokales Supabase, generierte Typen und API-Vertrag. Nach ausdrücklicher Fortsetzung abgeschlossen; aktueller Bericht `docs/backend-pruefung.md`.
- [x] Zusätzlichen Hosting-Unterchat nach ausdrücklicher Nutzerfreigabe starten: `agent-383586b96982be3fde65afc5600c333f`, GPT-6.1 Sol / xhigh. Insgesamt drei aktiv. Alter unterbrochener Backend-Lauf auf automatische Meldung gelesen; nur Pflichtdateilesen, keine Lieferung/Änderungen, bleibt gestoppt.
- [ ] Hosted-Projekt/geschützte `.env`: blockiert. Hauptchat und Hosting-Unterchat bestätigen `available: false` / `BrowserHostUnavailable`, kein ChatGPT-Browser-Plugin-Connector. Vorlage/Anleitung liegen als Entwurf vor, sind nach letzter Nutzergrenze keine akzeptierte Ersatzlieferung.
- [x] Nach Nutzergrenze „nur wenn es geht mit supabase oder garnicht“ Backend- und Hosting-Unterchat unterbrechen. Kein PostgreSQL-Ersatz. Keine Accounts/echte `.env`/Online-Projektanlage. Klärung, ob Designs unabhängig weitergehen oder das ganze Projekt stoppen soll, steht aus.
- [x] Auf Wunsch ChatGPT Browser Use / Computer Use gezielt erneut im vollständigen Tool-Inventar suchen: beide nicht eingebunden, kein Tool-Such-/Nachladeanschluss; TreeChat `browser_status` erneut `available:false`. Der Online-Schritt bleibt unerledigt. Keine weitere Ersatzarbeit.
- [x] Bis zur Klärung bzw. tatsächlichem Supabase-Anschluss auch Frontend unterbrechen. Alle drei aktuellen Unterchats sind `interrupted`; kein eigenständiger Neustart. Eigenen Prüfbrowserstand kontrolliert: laufender Testbrowser gehört nach CWD-Prüfung zum fremden NoteTree-Projekt und bleibt unangetastet; kein eigener Pflege-Dashboard-Browser-/PostgreSQL-Prozess vorhanden.
- [x] Frontend: 24 vollständige PNGs aus statischen HTML-Mocks, drei Bewegungsfolgen, kurze Vorstellung je Richtung.
- [x] Nach jüngster Nutzerkorrektur erledigen und prüfen die Agenten ihre Bereiche selbstständig; Orchestrator führt Lieferungen, Vertrag und Ergebnisbelege zusammen. Erste unabhängige Prüfungen und frühere Nacharbeit sind im Verlauf erhalten.
- [x] Gemeinsamen Phase-0-Meilenstein zur Sicherung zusammenführen; Gate-Bericht `docs/gates/2026-10-06-phase0-designwahl.md`. Commit erfolgt vor der Übergabe im Hauptchat.
- [x] Nutzer wählt am 06.10.2026 **Tagwerk**: „tagwerk sieht am besten aus damit weitermachen“. Phase 1 ist freigegeben.

Historischer Zwischenstand vor ausdrücklicher Fortsetzung: Vorbereitung lokal committed (`02c7ad8`); damaliger Entwurfsstand wurde als unfertiger Zwischenstand gesichert. API-Vertrag v0.1 und geplante API-Typen wurden früh gelesen, Schema/Seed sind unvollständig geprüfte Entwürfe. Alle Agenten nach letzter Nutzergrenze gestoppt, echtes Supabase mangels Anschluss/Runtime nicht eingerichtet. Keine fertigen 24 Mock-PNGs, keine Phase-0-Abnahme, keine App-UI. Pfade: `docs/mocks/`, `docs/api-contract.md`, `supabase/`.

## Supabase-Fortsetzung in Codex am 06.10.2026

Fortsetzung nach direkter Nutzerfreigabe: Werte aus `env.md` geschützt in `.env` übernehmen und autonom weiterarbeiten. Projekt `ttbfpqveexmlqxkzwlmz` (`pflegedashboard`) ist jetzt `ACTIVE_HEALTHY` in Frankfurt. MCP-SQL-Abfrage erfolgreich; noch keine Tabellen oder Migrationen. Parallele Backend-/Designänderungen gehören anderen Arbeiten und werden erhalten.

- [x] `env.md` zusätzlich ignorieren; Passwort und Verbindungsadresse ohne Ausgabe übernehmen. Beide Geheimnisdateien unversioniert und Rechte 0600.
- [x] Lokale `.env` per echter TLS-Datenbankverbindung prüfen; öffentliche API-Konfiguration vervollständigen. TLS-Socket verschlüsselt und mit offizieller CA verifiziert; Auth-API HTTP 200.
- [x] Auth-Grundeinstellungen prüfen und öffentliche Registrierung abschalten. Site URL 5173, Access-Token 300s. Automatische Inaktivitätsabmeldung auf Free nicht verfügbar.
- [ ] Aktuellen Backend-Abnahmestand prüfen; nur freigegebene, geprüfte Migrationen übertragen.

- [x] Direkten Folgeauftrag erfassen; vorhandene Anforderungen, Einrichtung und Migrationen lesen.
- [x] Browser-Erweiterung erfolgreich mit vorhandenem Supabase-Projektanlage-Tab verbinden. Dies ersetzt für diesen Chat den früheren Werkzeugblock.
- [x] Formular prüfen: vorhandener Name `pflegedashboard`, Organisation `kens projects` im Free-Tarif. Frankfurt auswählen; automatische Tabellenfreigabe deaktivieren und automatische RLS aktivieren.
- [x] Supabase-Erweiterung finden und zur nutzerseitigen Verbindung anbieten; aktuellen OAuth-/MCP-Weg in offiziellen Quellen prüfen.
- [x] Nutzer hat Projekt angelegt und Passwort lokal bereitgestellt; keine Passworteingabe durch den Agenten.
- [x] Projektkennung, Region und Free-Tarif nach Anlage prüfen; öffentliche Registrierung ausschalten und über API bestätigen.
- [x] Supabase-Erweiterung installiert und autorisiert; MCP durch erfolgreiche Aufrufe von `list_organizations` und `list_projects` geprüft. Inzwischen ist auch `pflegedashboard` sichtbar und per SQL erreichbar.
- [x] Projektspezifischen Datenbankzugriff nach Anlage per MCP-SQL geprüft. Keine zusätzliche globale MCP-Verbindung angelegt.
- [x] Benötigte Projektwerte geschützt lokal hinterlegen und echte Verbindung prüfen. Supabase-Sicherheitsprüfung nach Korrektur des RLS-Trigger-EXECUTE-Rechts ohne Meldungen.
- [x] Backend-Gate und anschließende Migrationen/RLS gegen echtes Supabase abgeschlossen; späterer Node-Abschluss und neue Zusatzprüfung stehen unten.

Historischer Hosted-Bericht vor lokalem Schema-Gate: Hosted-Projekt, `.env`, Auth-Grundeinstellungen und MCP funktionieren und wurden real geprüft. Anwendungstabellen noch nicht übernommen: paralleler Backend-Bericht nennt Storage-Migrationsfehler `must be owner of table objects`; Schema-/Seed-/RLS-Gate offen. Geheimnisse ausschließlich lokal gespeichert, nicht ausgegeben oder committed. Keine eigenen Browser-/Serverprozesse; DB-Verbindungen geschlossen, Nutzer-Tab erhalten. Browser-Finding: zwei Playwright-Linkklicks meldeten Timeouts trotz sichtbarem Link; frischer AX-Zustand und Klick auf dessen aktuelle Elementnummer funktionierten. Pfade: `docs/supabase-provisioning.md`, `docs/backend-runtime-pruefung.md`, `.env.example`.

## Orchestrator-Fortsetzung: echtes lokales Supabase und Design-Nacharbeit

Die direkte Nutzer-Nachricht „Bitte mach mit deiner Aufgabe weiter.“ wurde in beiden ursprünglichen Unterchats verifiziert. Die früheren Unterbrechungseinträge sind historisch; Frontend und Backend arbeiten wieder. Der Orchestrator hat keinen Ersatzchat gestartet.

- [x] Echte native Supabase-Laufzeit nachweisen: CLI 2.119.0, Database/REST/Auth/Storage gesund, begrenzte HTTP-Prüfungen erfolgreich. Eigene Ressourcen anschließend vom Orchestrator unabhängig als beendet geprüft. [Begrenzter Gate-Bericht](../gates/2026-10-06-supabase-native.md).
- [x] Erste 12 Designbilder tatsächlich ansehen; konkrete Nacharbeit an denselben Frontend-Unterchat geben. Chat-Bestätigungsaktionen und Einstellungsaktionen müssen vollständig sichtbar werden; weitere Inhalts- und Browserfunde sind Teil desselben Auftrags.
- [x] Derselbe Backend-Unterchat behebt den tatsächlich belegten Storage-Migrationsfehler und vervollständigt den ursprünglichen Phase-0-Auftrag in echtem Supabase: Migrationen, Seed, Zugriffs-/RPC-/Storage-/Audit-Tests, generierte Typen und korrigierter Vertrag.
- [x] Fertige Berichte und sichere Ergebnisbelege zusammenführen. Nutzerkorrektur: keine weiteren kleinteiligen Feedbacks; Agenten erledigen eigene Nacharbeit und Prüfung vollständig selbst.
- [x] 24 PNGs und drei Bewegungsfolgen zur Auswahl zusammenführen; lokal committen und im Hauptchat vorlegen. Keine Oberfläche vor Nutzerwahl.

Dieser Backend-Auftrag enthält keine Hosted-Migration, Provideraufrufe, Kontoanlage, Browser- oder Env-Arbeit. Ein separat dokumentierter Hosting-Fortsetzungsstand ist kein Nachweis des lokalen Schema-Gates. Keine App-Oberfläche vor der Designwahl.

## Phase 1 – Fundament (Implementierung geliefert, Nutzer-Gate offen)

- [x] Designwahl und jüngste Arbeitsteilung im selben Arbeitsauftrag und in den Projektregeln festhalten; Phase-0-Meilenstein `689e735` erhalten.
- [x] Dieselben ursprünglichen Frontend-/Backend-Unterchats mit je einem vollständigen Phase-1-Auftrag fortgesetzt; Modelle und Optionenschlüssel live bestätigt, Modelle erhalten. Hosting-Unterchat nicht neu gestartet.
- [x] Verbindlicher Phase-1-Anschluss v1.0 veröffentlicht und vom Orchestrator gelesen: sechs Metadaten-RPCs, Session- und Streaming-Vertrag sowie `types/phase1.ts`. An denselben Frontend-Unterchat weitergegeben. Status ausdrücklich Umsetzung, kein bestandener Lauf.
- [x] Backend veröffentlicht frisch generierte Phase-1-DB-Typen mit 25 Tabellen und den beiden neuen Gesprächs-RPCs. Orchestrator liest die sechs Browser-RPCs in `BackendDatabase` und verknüpft den Stand mit demselben Frontend-Chat; dessen aktueller Lauf wird nicht unterbrochen.
- [x] Geprüftes App-Schema auf dem eigenen Hosted-Projekt angewendet. Orchestrator liest sichere persistierte Belege: TLS verschlüsselt/verifiziert, App-Struktur entspricht lokal, ein Demo-Workspace und null Auth-Konten. Backend meldet fiktiven Seed und privaten Bucket; Systembesitz erhalten.
- [x] Backend-Lieferung samt vollständigem Abschlussbericht gelesen. Orchestrator führt den ganzen eigenen Supabase-Lauf unabhängig aus: sechs Migrationen + Seed, 434 SQL, 22 echte Parallelprüfungen, 26 echte Edge-HTTP, 47 Unit/Mock, strikter TypeScript-/Deno-Check und frische Typgenerierung bestanden. Stop/Cleanup bestätigt null eigene Prozesse und Ports 56421/56422/56428 geschlossen. Kein echter angemeldeter KI-Nutzertest.
- [x] Frontend-Sitzungsabschluss vollständig geliefert und erneut vom Orchestrator geprüft: `npm run check` mit 101 Tests, Strict-Typecheck, Lint, Build, Bundle und Quelle bestanden. Gemeinsamer Bericht `docs/gates/2026-10-06-phase1.md`; Backend lokal in `2e8a129` gesichert.
- [x] Historischer Hosted-Edge-Deployschritt durch jüngste Nutzerkorrektur aufgehoben: keine Edge Functions, normaler Node-Server. Keine Provider-Schlüssel, kein angelegtes Auth-Konto, Nullbudget erhalten. Agenten erledigen eigene Prüfung und Nacharbeit selbst.
- [x] Frontend liefert Tagwerk-App und 44 synthetische Bildnachweise. Orchestrator führt `npm run check` selbst aus: strikte Typen, Lint, 87 Tests, Build, Bundle-/Quellprüfung bestanden; Dashboard/Antwort in beiden Themes tatsächlich angesehen. Kein echter Login-/KI-Gate-Pass.
- [x] Derselbe Frontend-Agent schließt hängende Abmeldung und alte Auth-/Workspace-/Touch-/Schreibresultate selbst vollständig: sofortiger lokaler Logout, begrenzter Widerruf, Generation/Abbruch/Cache-Bereinigung. 14 neue Tests und fünf gezielt erkannte Rückbauten; keine erneuten Bilder nötig, Layout erhalten.
- [x] Vertrag/Typen verbunden; Frontend-Checks, echter lokaler Supabase-/RLS-/Parallel-/Edge-Lauf und Hosted-Struktur unabhängig durch den Orchestrator geprüft. Beide Themes anhand tatsächlicher PNGs angesehen. Angemeldeter End-to-End-Login/KI-Stream ausdrücklich nicht bestanden; keine Konten oder Providercalls.
- [ ] Gate: Nutzer kann sich selbst anmelden und in beiden Themes eine echte Unterhaltung führen.

Historischer Zwischenstand vor der Node-Umstellung: Tagwerk-App, 101 Frontendtests, echte lokale Supabase-Dienste und Hosted-App-Schema belegt. Der damalige Edge-Deployschritt wurde durch die ausdrückliche Nutzerkorrektur aufgehoben und ist kein offener Punkt mehr. Aktueller technischer Node-Abschluss und neue Zusatzprüfung stehen unten. Das echte Nutzer-Gate benötigt weiterhin Konto/Mitgliedschaft, Provider-Schlüssel, überprüftes Modell/Preise und bewusst freigegebenes Budget. Pfade: `src/`, `backend/`, `docs/gates/2026-10-06-phase1.md`.

## Zusatzprüfung 2026-10-06 – Anforderungen, Randfälle und Oberfläche

- [x] Neuen Nutzerauftrag und Grenze von zwei Sol `xhigh` gleichzeitig plus Opus `high` dokumentiert; vorheriger technischer Stand `1dc2782` bleibt Referenz.
- [x] Unabhängiger Sol liefert 52-zeiligen Anforderungsabgleich; sieben konkrete Querverbindungsfunde an ursprüngliche Bereichsinhaber gegeben. Korrekturen mit 127 Frontend-/60 serverfreien Backendtests und eigenen Abbruchrepros nachgeprüft. Neue SQL-Abnahme bleibt beim Backend/Orchestrator, keine neue Produktphase.
- [x] Ursprünglicher Backend-Sol behebt Stream-Widerruf, Auth-Störung, Start/Stop, Verbrauch bei Modellabweichung und Kontextreihenfolge/-aufgaben. Native Abnahme: acht Migrationen, 501 SQL, damals 92 Tests, 22 Parallelfälle, 18 PG und 31 HTTP. Nach abschließendem 2,5s-Handlerfix erneut 93 Tests, Typen/Build und 39 Hosted-/Static-Prüfungen unabhängig bestanden. Achte Migration additiv auf eigenem Hosted-Projekt, keine Konten/Kosten.
- [x] Ursprünglicher Frontend-Opus behebt 13 Funde samt abschließendem Zwei-Paar-Sortierfall. 131 Tests, 38 Vorher-/38 Nachher-Bilder und 28 echte nicht angemeldete Browserprüfungen bestanden. Alle eigenen Browser/Server beendet.
- [x] Orchestrator prüft Quelländerungen und Lieferungen, führt native Supabase-, finale Frontend- und Hosted-/Static-Gesamtprüfungen unabhängig erfolgreich aus. Vier endgültige Nachher-Bilder tatsächlich angesehen; eigene Prozesse beendet und Bericht abgeschlossen.
- [x] Geprüften Zusatzprüfungsstand mit Berichten, Regressionen und Bildbelegen als Meilenstein sichern. Dieser Checklistenstand ist Teil desselben lokalen Abschluss-Commits.

Ergebnis: Zusätzliche technische Abnahme bestanden; sämtliche bestätigten Funde behoben. Echte Anmeldung/KI bleibt ohne Konto/Mitgliedschaft/Provider- und Budgetfreigabe ungeprüft, Phase 2 nicht freigegeben. Pfade: `docs/gates/2026-10-06-phase1-audit.md`, `backend/`, `src/`.

## Phase 2 – Sachbearbeiter

- [ ] Bestätigungskarten, serverseitige Modi, mehrere Anbieter/Modellauswahl, Uploads.
- [ ] Dokumenteditor, PDF/DOCX, menschliche Übergabe, anschließend Wissenssuche mit Quellen.
- [ ] Vollständige Chat → Bestätigung → Dokument-Abnahme und serverseitige Sicherheitsprüfungen.

Ergebnis: Nicht begonnen. Pfade: `src/`, `supabase/`, `backend/`.

## Phase 3 – Demo-Paket

- [ ] Fiktive Familie, fünfminütiges Vorführskript, Präsentationsfeinschliff.
- [ ] Bereitstellung und Schritte für nutzerseitige Konten-/Projektanlage vorbereiten; keine Konten/Schlüssel durch Agenten.
- [ ] Datenschutzliste vor Echtbetrieb schreiben.

Ergebnis: Nicht begonnen. Pfade: `docs/`, `supabase/seed.sql`, `src/`.

## Phase 4 – Abschlussfeinschliff

- [ ] Beide ursprünglichen Unterchats verbessern alle eigenen Screens und Abläufe auf mehr als 9/10.
- [ ] Orchestrator prüft erneut selbst, dokumentiert echte Nachweise und nicht geprüfte Gates.
- [ ] Abschließender geprüfter Commit und Bereitstellung im beauftragten Projektumfang.

Ergebnis: Nicht begonnen. Pfade: `docs/`, `src/`, `backend/`.


## Nutzerkorrektur 2026-10-06: lokaler Server ohne Edge Functions

- [x] Supabase-Plugin live verbunden: eigenes Projekt ACTIVE_HEALTHY, Frankfurt; keine deployed Functions. Browseranschluss weiterhin `available:false`.
- [x] Edge-Deployment vor Ausführung gestoppt; Nutzerkorrektur hat Vorrang vor bisherigen Edge-Anforderungen.
- [x] Ursprünglicher Backend-Agent: normaler lokaler Node-Server, bestehendes Supabase, sicherer Sitzungs-/RPC-/Streamanschluss, echter HTTP-/DB-Nachweis ohne Auth-Konto oder Providerkosten.
- [x] Ursprünglicher Frontend-Agent: gleicher Tagwerk-Auftritt, `/api`-Anschluss, gemeinsamer Start und Build, vorhandene Sitzungsregressionstests erhalten.
- [x] Orchestrator: Vertrag zusammenführen, Prüfungen unabhängig ausführen, Regeln/Gate aktualisieren und als Meilenstein committen.

Ergebnis: Node-Anschluss ohne Edge Functions geliefert. Orchestrator prüft 105 Frontendtests, 21 Proxy-, 14 Prozessprüfungen, 484 SQL, 80 Backendtests und 39 echte Hosted-Node-HTTP/SQL-/Static-Prüfungen unabhängig erfolgreich. Abschließender gemeinsamer dev/start-Lauf durch Frontend-Agenten ebenfalls bestanden und bereinigt. Phase-1-Nutzergate bleibt bis echtem Nutzerlogin und bewusst freigegebener KI-Konfiguration offen. Pfade: `backend/`, `src/`, `docs/gates/2026-10-06-phase1.md`.


## Fortsetzung 06.10.2026: Livevorführung über Vercel

Ziel: echter Login und DeepSeek-Chat auf pflege-dashboard-puce.vercel.app.

- [x] Browser-Plugin verbunden, bestehende Vercel- und App-Tabs gelesen. Live-Commit 24de236.
- [x] Livefehler unabhängig per HTTP bestätigt: POST /api/session und /api/chat-stream liefern 404.
- [x] Hosted-DB gelesen: 0 Auth-Konten, 0 zugeordnete Profile, 0 Mitgliedschaften, 0 aktive Modelle; Budget 0. Lokale Providerkeys fehlen (nur Namens-/Vorhandenheitsprüfung).
- [x] Ursprünglichen Backend-Agenten 01a11063-220c-7bc1-8ab7-7ca1c68286a8 mit vollständigem Vercel-/DeepSeek-Auftrag fortgesetzt. Keine neuen Chats.
- [x] Nutzer hat bestätigten test@test.de angelegt; normaler Demo-Zugang zugeordnet. DEEPSEEK_API_KEY in Vercel gespeichert, Wert ungelesen. Nutzerwahl: kein App-Ausgabenlimit.
- [x] Vercel Node Functions/DeepSeek-Adapter unabhängig lokal abgenommen: 131 Frontendtests, 121 Backendtests, 525 SQL- und 12 Upgradeprüfungen. Zwei Migrationen und DeepSeek-Standard/NULL-Budgets Hosted angewendet; voller Schemaabgleich und 33 Hosted-Prüfungen bestanden.
- [ ] Geprüfte Bereitstellung samt geschützten Serverwerten und echtem Login-/Chatablauf abnehmen.
- [ ] Schlussbericht mit tatsächlich erreichten Nachweisen und verbleibenden Grenzen.

Arbeitspfade: backend/, api/, docs/vercel-demo-setup.md. Vorhandene fremde .gitignore-Änderung erhalten.

## Autonome Nacharbeit und Vorführbarkeit

- [x] Vercel-Laufzeitfehler ERR_MODULE_NOT_FOUND mit echtem Paketnachweis behoben und live mit erwarteten HTTP-Antworten geprüft.
- [x] Alltagssprachlichen Dialog mit 15 Beispielanfragen in fünf Themen geliefert und unabhängig geprüft; Auswahl nur als bearbeitbarer Entwurf.
- [ ] Bewusst gespeicherte Anmeldung, Wiederaufnahme und echtes Abmelden prüfen; kein Passwort speichern.
- [ ] Unabhängige Live-Browserprüfung mit vorhandenem Nutzerkonto: echte DeepSeek-Antwort, Datenbezug, Verlauf/Neuladen und beide Themes.

- [x] Tatsächlicher Nutzerlogin und Wiederaufnahme nach Neuladen bestanden, aktive gespeicherte Sitzung mit 30 Tagen bestätigt; kein Passwort gespeichert.
- [x] Vorlagen live: 5×3 Auswahlmöglichkeiten, Entwurf erhalten, kein automatisches Senden.
- [x] Echten Providerfehler eingegrenzt: DeepSeek weist Vercel-Schlüssel mit HTTP401 ab. Sichere Diagnose veröffentlicht (`f489365`).
- [ ] Gültigen Schlüssel durch Nutzer geschützt in Vercel ersetzen, danach reale Antwort/Folgefrage/Verlauf abnehmen.

## Korrektur: tatsächlicher Anbieter OpenCode

- [x] Nutzerherkunft geklärt: bestehender Schlüssel gehört OpenCode, nicht der direkten DeepSeek-API. Vorige pauschale Ungültigkeitsbehauptung zurückgenommen.
- [x] Offizielle OpenCode-Dokumentation und öffentliche Modellliste bestätigen DeepSeek V4.1 Flash; im eigenen OpenCode-Konto ist dieses Modell bereits aktiviert. Keine Kontoeinstellung geändert.
- [ ] Backend/Registry auf OpenCode Go im bestehenden Abo samt passender Modellkennung und Streamingformat korrigieren.
- [ ] Frontend-Anzeigen/Vertrag prüfen, lokal unabhängig abnehmen und veröffentlichen.
- [ ] Echte Vercel-Antwort, Folgefrage und gespeicherten Verlauf abnehmen.

Die vorherige offene Aufforderung zum Schlüsselersatz ist überholt. Kein erneuter Key erforderlich allein wegen des früheren401 am falschen Anbieter.

- [x] OpenCode-Overview live geprüft: aktives Go-Abo, verbleibendes Kontingent; separates Guthaben0USD, Zusatznutzung ausgeschaltet. Deshalb dokumentierten Go-Anschluss verwenden, keine Guthaben-/Tarifänderung.
