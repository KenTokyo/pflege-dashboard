# Backend-Abschluss: OpenCode Go, 06.10.2026

Lokal fertig und geprüft. Der bestehende OpenCode-Schlüssel war zuvor der direkten DeepSeek-API zugeordnet; deren konkreter401 beweist keine allgemeine Ungültigkeit des Schlüssels. Produktweg jetzt ausdrücklich OpenCode Go im nutzerseitig bestätigten vorhandenen Abo: `https://opencode.ai/zen/go/v1/chat/completions`, Modell `deepseek-v4.1-flash`. Kein Zen-Paygo, kein automatischer Provider-/Hostfallback. Keine Schlüssel gelesen/ausgegeben, keine Konten erzeugt und kein tatsächlicher Modellaufruf. Root übernimmt Hosted und Veröffentlichung nach seinem unabhängigen Gate.

## Ergebnis und eigene Bewertung

| Ablauf | Vorher | Gelieferter Stand | Nachher, lokal |
|---|---|---|---|
| Schlüssel → richtiger Anbieter | Vorhandener gültiger OpenCode-Schlüssel an falschem Host; konkret401 | Fester Go-Pfad; bevorzugt OPENCODE_API_KEY, nur dort ausdrücklich autorisierter Legacy-Name DEEPSEEK_API_KEY. Leerer bevorzugter Wert bleibt Sperre. | 3 → 9,3 |
| Modell-/Streamprotokoll | Direkter DeepSeek-Adapter ohne Gateway-Metadaten; gewünschter Modellstand musste erhalten bleiben | Schmaler tatsächlicher OpenCode-Adapter; V4.1-Anfrage, dokumentierte Antwortaliasse, getrennte terminale Usage, harmlose Metadaten und genauer nachgestellter Kostentrailer. Erfolg nur nach stop + validierter Usage + DONE + EOF. | 6 → 9,3 |
| Herkunft, Verbrauch, Abbruch | Bestehende F7-/Budget-/Abbruchregeln grün | Tatsächliche Antwort-ID unverändert bis SQL; unerlaubtes Modell bleibt failed, bekannte Usage wird transportiert, Reservierung gehalten und Workspace gesperrt. Preise als Go-Kontingentschätzung. Bestehende Widerruf-/Zeitlimit-/Cleanup-Tests bleiben grün. | 9,2 → 9,4 |
| Bestandsdaten/Anschluss | Zwei Gespräche konnten alten direkten Override behalten | Additive Migrationen, Operator-Setup korrigiert nur falsche künftige Overrides mit Revision/Audit und den Workspace-Standard. Alte Nachrichten, Modell-/Prompt-Snapshots und Preise erhalten. Setup vollständig wiederholbar. | 7 → 9,4 |
| Schema-/Rechte-/Prozessnachweis | Elf Migrationen waren vorher abgenommen | Frischer nativer13-Lauf sowie tatsächliche11→13-Übernahme, vollständiger Schemaabgleich und negative Berechtigungsabweichung; endlich begrenzte eigene Prozesse, keine Edge-Laufzeit. | 9,2 → 9,4 |

Die Noten gelten für belegte lokale Implementierung. Kein daraus abgeleiteter erfolgreicher Onlinechat oder Datenschutznachweis.

## Tatsächliche Prüfungen

Eigener vollständiger nativer Supabase-Lauf **18:42:02.464–18:42:15.997 UTC**:

- CLI tatsächlich **2.119.0**, `--runtime native`, eigener ignorierter Projektspiegel. Alle **13 Migrationen** und unveränderter fiktiver Seed frisch angewendet.
- DB bereit; echte REST/Auth/Storage-Anfragen jeweils200. Edge Functions ausdrücklich ausgeschlossen.
- **611/611 SQL-Prüfungen in acht Dateien**, darunter die32 neuen OpenCode-Prüfungen. Bestehende579 regressionsfrei. Positiv: beide belegten V4.1-Namen, unveränderlicher Alias-Snapshot, echtes Ledger. Negativ: fehlender Anbieter, ältereV4-Version, falscher Modell-/Tokenbezug, Kostenbudget, private Funktionsrechte. Keine Auth-Konten oder Auth-Sessions erzeugt.
- **172/172 Backendtests** in sieben Dateien, davon53 im tatsächlichen DeepSeek-/OpenCode-Adaptertestmodul. Sämtliche Providerantworten dort durch synthetischen Transport. Kein Produkt-Mockfallback. Tatsächlicher Handler erhält bekannte Modell-/Tokenwerte bei Fehler; Erfolg für beide V4.1-Namen, Fehler für ältereV4. Bevorzugter Schlüssel und bewusste Leer-Sperre sowie echter Cloud-Headerweg geprüft, ausschließlich erfundene Testwerte.
- **13 OpenCode-Operator-Setupprüfungen**, sämtliche Änderungen zurückgerollt: Wiederholung vollständig idempotent, alte Nachrichten identisch, falsche Overrides genau einmal revidiert/auditiert, richtiges Defaultmodell, richtiger oberer Schätzpreis, Sicherheitsblock erhalten, keinerlei Konto-/Sessionanlage. Historische **8 Demo-Setupprüfungen** ebenfalls grün.
- **8 + 15 echte Parallelprüfungen**: Revision/Idempotenz/Audit, Budgetzeilensperre, held-Reservierung und originales Nullbudget. Fixtures entfernt.
- **19 Node-PG-Prüfungen**: feste Rolle/Funktionswhitelist, Zeitlimit/Abbruch, Transaktionsbereinigung.
- **31 tatsächliche HTTP-/Supabase-/SQL-Prüfungen**: echte Auth-Verweigerung, minimale Health, feste Hosts/Origins, unbekannteAPI, Rollentrennung, eigener dynamischer Port64358 geschlossen; kein erfolgreicher Login/Chat simuliert.
- Historischer Kontext-Repro:17 Prüfungen, genau zwei erwartete Fehler der alten Kontextfunktion reproduziert und vollständig zurückgerollt; aktueller Kontext bleibt grün.
- Strict Typecheck, Produktbuild und **wirkliche Supabase-CLI-Typgenerierung aus dieser App-DB** erfolgreich. Keine handgeschriebenen Ersatztypen. Vollständige Schema-Baseline mit Funktionskörpern/Privileges gesichert.

Danach eigener **echter elf→dreizehn-Upgrade-Lauf**: **12/12 Prüfungen** erfolgreich. Historischer Bestand/Nullbudget/Auth-Leere und reale bestehende App-Sitzung samt Fristen unverändert. Vollständige Struktur entspricht exakt frisch erzeugter13-Baseline; negative Berechtigungsdrift wird weiterhin erkannt. Eigene Fixtures entfernt, Stack im finally gezielt gestoppt. Historischer Zehn→aktuell-Helfer berücksichtigt künftig alle neu hinzugekommenen Migrationen; seine frühere echte10→11-Abnahme bleibt historisch und wurde jetzt nicht wiederholt.

Zusätzlich vom Orchestrator unabhängig gemeldet: Fresh13-Gesamtlauf mit denselben611 SQL-/172 Backendtests und allen genannten Zusatzprüfungen grün; Vercel-Artefakt mit20 tatsächlichen Paketprüfungen grün. Zwei neue Migrationen und exakt diese Operator-Datei bereits auf das eigene Hosted-Projekt übernommen; vollständiger Schemaabgleich gleich, Bestand erhalten: ein bestehendes Nutzerkonto, zwei Gespräche, fünf Nachrichten, zwei Aufgaben, ein Dokument; Sicherheitsberater unverändert. Das sind getrennte Root-Nachweise, keine eigenen Hosted-Schreibvorgänge. Inzwischen meldet Root zusätzlich33 + 11 Hosted-Prüfungen grün. Veröffentlichung und echte Modellantwort werden damit nicht vorweg als bestanden ausgegeben.

## Primärquellen und genaue Protokollgrenzen

- [OpenCode Go](https://opencode.ai/docs/go/): gewünschtes Modell, feste Go-Adresse, Kontingentberechnung, eigene User-Agent-Kennung und stabile Gesprächssession. Oberer Peak-Schätzpreis0,30USD Eingabe/1,20USD Ausgabe pro1M Tokens, kein behaupteter Geldabfluss pro Antwort; Cache-/Offpeak-Nachlässe werden nicht als zusätzliche Kosten berechnet.
- [OpenCode Zen Modellübersicht](https://opencode.ai/docs/zen/): genaue Requestkennung `deepseek-v4.1-flash`. Zen und Go werden nicht gleichgesetzt.
- [DeepSeek aktuelle Modell-/Preisdokumentation](https://api-docs.deepseek.com/quick_start/pricing/): `deepseek-flash` ist der Upstreamname derselben V4.1-Version. Keine globale Modellweichzeichnung.
- [Offizielle OpenCode Gateway-Route](https://github.com/anomalyco/opencode/blob/dev/packages/console/app/src/routes/zen/v1/chat/completions.ts), [Gateway-Verarbeitung](https://github.com/anomalyco/opencode/blob/dev/packages/console/app/src/routes/zen/util/handler.ts), [exakter Kostentrailer](https://github.com/anomalyco/opencode/blob/dev/packages/console/app/src/routes/zen/util/provider/provider.ts): kompatibler SSE-Weg kann unveränderte Upstream-Modellnamen und nach dem eigentlichen Stream `{choices:[],cost:"0"}` liefern. Trailer ist keine Usage.
- [Öffentlicher Originalbericht42918](https://github.com/anomalyco/opencode/issues/42918) dient nur als Randfallbeleg für leere Metadaten. Kein fehlender Finish-/Usage-/DONE-Nachweis wird deshalb erfolgreich erklärt.

Der Adapter sendet ehrlich `User-Agent: pflege-dashboard/1.5` und die nach Auth/Workspace/Gesprächsprüfung vorhandene Gesprächs-UUID als `x-opencode-session`. Er behauptet keine Coding-Agent-Identität. Go beschreibt primär Coding-Agent-Traffic; ob dieser Pflege-Demoweg im bestehenden Nutzerabo tatsächlich angenommen wird, bleibt der echte Provider-/Live-Nachweis. Keine Anbieterfreigabe oder EU-/Datenschutzgarantie erfunden.

## Sichere Wiederholung und Root-Anschluss

Arbeitsordner aller Befehle: `/Users/kentoky/Documents/React Projects/pflege-dashboard`.

```sh
npm --prefix backend run check:phase1
node backend/scripts/opencode-upgrade-check.mjs
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix backend run build
```

Der erste Befehl besitzt bereits try/finally und Gesamtzeitlimit; vollständiger eigener Stack wird beendet. Upgrade ebenfalls begrenzt und isoliert. Kein Root-env im Supabase-Spiegel. Start-/Statusausgaben niemals direkt ausgeben; Supabase ausschließlich über die redigierenden vorhandenen Helfer verwenden. Nach einem abgebrochenen eigenen Lauf gezielt:

```sh
node backend/scripts/supabase-safe.mjs stop
node backend/scripts/runtime-cleanup.mjs
```

Root: erst unabhängiges lokales Gate, dann bestehendes eigenes Hosted-Projekt prüfen und nur die zwei neuen Migrationen in Reihenfolge additiv übernehmen. Bestehende geprüfte serverseitige TLS-/Projektgrenzen erhalten. Danach **exakte Operator-Datei `/Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/demo-opencode-setup.sql`** als postgres ausführen. Kein Seed/Reset im Hosted-Projekt. Dies korrigiert auch den bestehenden expliziten alten DeepSeek-Override, ohne History zu ändern. Bestehenden geschützten Legacy-Key erhalten, neue Eingabe nicht erforderlich. Root übernimmt Veröffentlichung und echten Login→Go-Antwort→Folgefrage→Neuladen. Keine direkten Supabase-Statusausgaben oder Geheimnisse in den Bericht aufnehmen.

## Eigene Dateien

Basis jeweils `/Users/kentoky/Documents/React Projects/pflege-dashboard/`:

- `backend/runtime/{provider,handler,config,cloud,index}.ts`: produktiver Go-Anschluss, Schlüsselzuordnung und ehrliche Sessionheader.
- `backend/tests/deepseek.test.ts`: gezielte tatsächliche Adapter-/Handler-/Cloud-Regressionen, ausschließlich synthetischer Transport.
- `backend/scripts/{phase1-check,supabase-safe,session-upgrade-check,opencode-setup-check,opencode-upgrade-check}.mjs`: echte native Gate-/Operator-/Upgradeprüfungen und historisch korrekter Basismigrationsspiegel.
- `supabase/migrations/20261006183011_opencode_provider.sql`: separate additive Enum-Erweiterung vor deren Nutzung.
- `supabase/migrations/20261006183021_opencode_zen.sql`: Name aus früherer Anschlussplanung, tatsächlich Go-Kontextalias/Abschluss; keine neue Tabelle oder browserseitige Berechtigung.
- `supabase/tests/opencode.test.sql`:32 echte lokale SQL-Assertions.
- `supabase/demo-opencode-setup.sql`: bewusste Operator-Konfiguration; keine Kontoanlage.
- `types/{database.types,phase1,api}.ts` und `types/README.md`: tatsächliche DB-Generierung und konsumierbarer Vertragv1.5.
- `docs/api-contract.md`, `docs/vercel-demo-setup.md`, `docs/backend-opencode-pruefung.md`: aktueller Anschluss und Nachweisgrenzen; frühere93-Test-Abnahme bleibt unverändert historisch.

Keine Frontend-/Root-/Orchestrator-Dateien bearbeitet. Keine Git-Mutationen. Native-Typdatei ist generiert, keine kopierte NoteTree-Implementierung.

## Bereinigung und offene Gates

Eigener letzter Stack nach Upgrade vollständig beendet: **0 eigene Prozesse**, Ports **56421/56422/56428 geschlossen**. Native-Node-Smoke-Port64358 beendet; sämtliche SQL-/Operatorfixtures zurückgerollt bzw. Upgrade-/Parallelfixtures entfernt. Kein Browser gestartet, keine UI-Ports5173/5174 benutzt oder beendet. Eigener `SUPABASE_HOME`: `/var/folders/9v/89xd0tws1kl0j78fbm8_xjjw0000gn/T/pflege-dashboard-supabase-57aea064-phase0`; Spiegel `/Users/kentoky/Documents/React Projects/pflege-dashboard/backend/.local/supabase-project`. Redigierte Logs und secretfreie Nachweis-JSON bleiben ausschließlich ignoriert mit600/700-Rechten; keine fremden Konfigurationen/Stacks verändert.

Lokale Gatebelege: `backend/.local/phase1-result.json`, `opencode-setup-result.json`, `opencode-upgrade-result.json`, `runtime-cleanup.json`; keine Status-/Schlüsselwerte in diesem Bericht. Keine Hosted-Schreibvorgänge durch diesen Agenten; laut Root ist die additive Hosted-Übernahme inzwischen unabhängig geprüft. Reale Go-Antwort und Vercel-Endablauf stehen zur Root-Prüfung aus. Phase2-Tools/Bestätigung/Uploads/Exporte/RAG bleiben geplant. Danach eigener Backend-Stopp; keine neue Prüfrunde ohne konkreten Anschlussbefund.


## Gezielte Live-Nacharbeit: letztes Textstück im Abschluss

Nach Veröffentlichung2295d70 meldet Root einen echten Livefehler: HTTP200/SSE, korrektes V4.1-Modell und passende fiktive Kontextdaten, sichtbarer Text endet mitten im Wort; danach PROVIDER_FAILED/Diagnose TOKEN_BOUND. Gespeicherte Werte nach Root-Abfrage:725 Eingabe-/275 Ausgabetokens bei Grenzen1048576/1024, Verbrauch548Microusd im Ledger. **Keine Tokenüberschreitung.** Der alte Parser verwendete denselben TOKEN_BOUND-Grund zusätzlich für unzulässige Abschlussdaten bzw. widersprüchliche Abschlussmarker. Der konkrete letzte rohe Providerchunk wurde nicht in diesem Backendauftrag gespeichert; deshalb wird seine genaue Form nicht als nachgewiesen ausgegeben.

Belegte und netzwerkfrei reproduzierte Parserfehlannahme: OpenCode-kompatibler `finish_reason:"stop"` darf noch ein letztes String-Textstück tragen. Das bisherige pauschale Verwerfen dieses Textes ist behoben. Nur für den tatsächlichen OpenCode-Weg wird das letzte Textstück bis zur terminalen Usage-/Modell-/Finish-/Token-/Werkzeug-/Reasoningprüfung gehalten und danach genau einmal ausgegeben. Sowohl Inline-Usage als auch nachfolgende separate Usage funktionieren. Bekannte Usage bleibt vor jeder möglichen Ablehnung bis zur Handler-/SQL-Finalisierung erhalten. Fehlende Usage/DONE/EOF bleiben Fehler. Direkter historischer DeepSeek-Pfad wurde dafür nicht großzügiger freigegeben.

Spezifische sichere Diagnose ersetzt die Sammelmeldung: `UNEXPECTED_TOOLS`, `UNEXPECTED_REASONING`, `CONTENT_SHAPE` und `FINISH_REASON`; `TOKEN_BOUND` bezeichnet hier tatsächliche Tokenüberschreitungen. Keine Rohdaten oder Geheimnisse in Logs.

**Tatsächlich ausgeführte gezielte Regression:** vor dem Fix173 grün/7 rot von180 Tests; nach dem Fix **180/180** grün in sieben Dateien. Acht neue Tests: letzte Textstücke mit Inline-/spätererUsage, fünf verbotene Fälle inklusive echte1025-Ausgabetokens, tatsächlicher Adapter→Handler speichert den vollständigen synthetisch rekonstruierten Satzschluss bei den gemeldeten725/275-Tokens und completed. Strict Typecheck und Produktbuild ebenfalls grün. Negative Tests behalten bekannte Usage, geben keinen verbotenen Text frei und prüfen die genaue Diagnose. Früherer Fresh13-Gate mit172 Tests bleibt historisch korrekt; kein erneuter Stackreset für diesen reinen Adapterfix.

Ausgeführt im Projektordner:

```sh
npm --prefix backend test -- --reporter=json --outputFile=.local/opencode-final-delta-before.json
npm --prefix backend run typecheck
npm --prefix backend test -- --reporter=json --outputFile=.local/opencode-final-delta-after.json
npm --prefix backend run build
```

Der Before-Befehl ist der tatsächlich ausgeführte rote Vorher-Nachweis, kein später grün zu erwartender Wiederholbefehl auf repariertem Code. Sichere Ergebnisbelege ausschließlich ignoriert unter `backend/.local/`. Nur `backend/runtime/provider.ts` und `backend/tests/deepseek.test.ts` geändert, zusätzlich dieser Bericht und Vertrag. Keine Schema-/Budget-/Hosted-/Provider-/Gitaktionen, kein Browser oder laufender Stack. Alle vorher bereinigten eigenen Dienste bleiben beendet; Root nutzt seine eigene unabhängige Prüfung.

Eigene Bewertung des betroffenen Abschlussablaufs: **6,5 → 9,3 lokal**. Der erneute vollständige reale Go-Chat nach Veröffentlichung des Fixes bleibt Roots Live-Gate. Weder der ursprünglich abgebrochene echte Text noch diese synthetische Regression wird als erfolgreicher vollständiger Onlinechat ausgegeben.


## Anschlussdiagnose: unbekanntes Ereignis nach vollständiger Liveantwort

Nach dem veröffentlichten Textabschlussfix meldet Root für Request542e0382-5436-497f-a714-bdc9dad3e90c um18:55:05UTC eine vollständig sichtbare Antwort, die weiterhin auf failed endet. Sichere Diagnose: EVENT_ENVELOPE/HTTP200/SSE, bekanntesV4.1-Modell, kein gemeldeter Providerfehler. Neue gespeicherte Werte laut Root:725/292Tokens,907 Zeichen. Diese Metadaten bestimmen die letzte Ereignisform noch nicht eindeutig; daher **keine Sicherheitsregel oder zulässige Endform auf Verdacht geändert**.

Gezielt ergänzt: Diagnose bei EVENT_ENVELOPE zeigt ausschließlich die aktive Parserphase (`streaming`, `awaiting_usage`, `after_usage`, `after_done`), feste bekannte Feldnamen und deren Typklassen. Choices werden nur zero/one/many genannt. Unbekannte Namen werden nicht kopiert; nur die Anzahl wird auf64 begrenzt. Keine Texte, Geheimnisse, unbekannten Feldnamen, Tokenwerte, Antwortlängen, Rohbodies oder URL-Werte werden übernommen. Die bestehenden bekannten Modell-/Fehlerklassen bleiben feste Allowlistwerte. Auch ein doppeltes DONE erhält eine feste Shape-/Phasendiagnose.

Sechs gezielte neue Phasen-/Datensparsamkeitsprüfungen; bestehende strenge Diagnoseprüfung an die exakte neue sichere Form angepasst. Erster Lauf:185/186, eine veraltete erwartete Diagnoseform rot; das ist kein grüner Produktnachweis. Danach **186/186 Tests** grün, **separat bestätigter Typecheck-Exit0**, Produktbuild-Exit0. Die verfrüht an Root gemeldete186-Gesamtzahl wurde sofort zurückgenommen und erst nach Ergebnisdatei success:true/numFailedTests:0 erneut bestätigt. Keine Erfolgsannahme aus einer zuletzt erfolgreichen Shellaktion.

Ausgeführt: `npm --prefix backend test -- --reporter=json --outputFile=.local/opencode-shape-result.json`, `npm --prefix backend run typecheck`, `npm --prefix backend run build`. Nach Anpassung der erwarteten Form Tests und Typprüfung erneut ausgeführt; Produktcode gegenüber dem erfolgreichen Build unverändert. JSON-Nachweis ausschließlich ignoriert `backend/.local/opencode-shape-result.json`. Weitere betroffene Dateien unverändert: nur Provider, Adaptertests, Vertrag und dieser Bericht. Kein eigener Prozess/Browser/Stack gestartet, keine SQL-/Hosted-/Provider-/Gitaktion. Root übernimmt die nächste echte Liveanfrage und liest diese datensparsame Form; der noch unbekannte Abschluss wird hier nicht als repariert ausgegeben.


## Reparatur des jetzt belegten zusätzlichen Usage-only-Ereignisses

Root belegt auf veröffentlichtem71205d8 für Request74261a94-b80f-4078-b8f4-3876a12736c9 um19:00:25UTC die tatsächliche Form: Phaseafter_usage; Objekt mit den bekannten Envelopefeldern id/object/created/model/choices/usage, choices leer, Usage mit prompt_tokens/completion_tokens/total_tokens. Also ein zusätzliches reines Usageereignis nach bereits bestätigter Inline-Usage. Dieser konkrete Fall ist jetzt eng repariert; keine zusätzliche Diagnoseveröffentlichung auf Verdacht.

Vor DONE wird nur ein solches bekanntes Envelopeobjekt ohne weitere Felder akzeptiert, dessen tatsächlicher Modellname **exakt** mit der bereits bestätigten Antwort übereinstimmt und dessen sicheren nichtnegativen input/output-Zahlen identisch sind. Optionales total muss eine sichere Ganzzahl und exakt deren Summe sein. Identische Wiederholung emittiert kein weiteres Usage-Part: nur eine SQL-Finalisierung/Ledgerbuchung und ein Client-usage.final. Nach DONE bleibt zusätzliche Usage verboten; weiterer Text/Choices, unbekannte Felder, fehlendesDONE oder ausbleibendesEOF bleiben Fehler.

Bei widersprüchlichen Zahlen kann der vorherige Usagewert nicht mehr für einen sicheren endgültigen Verbrauch verwendet werden. Kleiner **nur interner** ProviderPart `usageUnreliable` setzt im Handler die vertrauenswürdigen Tokenzahlen aufnull und behält die tatsächliche Modell-ID. Fehlgeschlagene Finalisierung läuft damit in die bereits vorhandene und vorher SQL-geprüfte held-Reservierung. Keine Nullkostenbehauptung, kein completed- oder usage.final-Ereignis. Bekannte fremde Modelle/überschrittene Tokenbounds transportieren weiter ihre tatsächlichen Zahlen in den bestehenden held/blocked-Pfad. PublicJSON/SSE-Vertrag und SQL unverändert; keine zusätzliche Migration, Preis-/Budget- oder Berechtigungsänderung.

**Gezielte tatsächliche Prüfung:**202/202 Backendtests in acht Dateien, Typprüfung und Produktbuild mit **drei separat bestätigten Exitcodes0**. Neuer begrenzter Testbereich `backend/tests/opencode-ending.test.ts` enthält16 Fälle für die belegte Reihenfolge und materielle Gegenfälle: Inline-Usage → identische Usage-only → DONE → bekannter cost-Trailer → EOF; optionales konsistentesTotal; abweichende input/output/total, nichtganzzahlige oder fehlende Werte, fremder bzw. anders gemeldeter Modellname, zusätzlicher Text/Choices, Usage nachDONE, fehlendesDONE und Abbruch ohne tatsächlichesEOF. Tatsächlicher Adapter→Handler-Positivfall: kompletter Text, einmaliger Finish-RPC, einmal usage.final und completed. Tatsächlicher Adapter→Handler-Konfliktfall: einmal failed, keine falsche Erfolgs-/Usage-Ausgabe, null-Tokenwerte/tatsächliche Modell-ID an den vorhandenen konservativen SQL-Abschluss. Das ist ein Mock-RPC-Handlernachweis; kein neuer tatsächlicher SQL-Lauf behauptet. Die bestehenden611 SQL-Prüfungen der unveränderten DB-Logik bleiben der separate Datenbanknachweis.

Ein erster neuer Testlauf endete201/202: die neue Prüfung erwartete fälschlich einen Underlying-cancel-Aufruf bei einem bereits geschlossenen ReadableStream. Korrekt wird beim normalenEOF die freigegebene Reader-Sperre geprüft; beim noch offenen, abgebrochenen Stream bleibt cancel ausdrücklich geprüft. Danach202/202. Produktcode für die eigentliche Usage-Reparatur musste dafür nicht geändert werden.

Reproduzierbare Aufrufe im Projektordner, jeder einzeln geprüft:

```sh
npm --prefix backend test -- --reporter=json --outputFile=.local/opencode-ending-result.json
npm --prefix backend run typecheck
npm --prefix backend run build
```

Endstand unter `backend/.local/opencode-ending-result.json`: success:true,202 passed,0 failed. Eigene Änderungen dieses Anschlussfixes nur `backend/runtime/provider.ts`, `backend/runtime/handler.ts`, neuer gezielter Adaptertest und Vertrag/Bericht. Dateien unter1200 handgeschriebenen Zeilen. Keine weiteren Agenten, Provider-/Hosted-/Gitaktionen, keine Browser oder eigenen Dienste gestartet. Keine unveränderte SQL-/Stackprüfung wiederholt. Eigene Bewertung dieses Abschluss-/Buchungsablaufs **6,5 → 9,3 lokal**; vollständiger echter Liveabschluss bleibt ausdrücklich Root-Abnahme nach gemeinsamer Veröffentlichung.


## Übernommener Root-Livenachweis nach Veröffentlichung7f9825b

Der Orchestrator bestätigt den ersten vollständigen tatsächlichen Onlineabschluss auf Ready-Deployment `AswXMTrdU78Q5sTsXmqoy4hbtzYS`: Gespräch `8c7a31ac-f659-4141-a3e0-1c24f79b3c01`, Request `b9cf6529-7a36-46e3-871e-136c79d5d425`. UI zeigt die vollständige Antwort ohne Fehler mit den richtigen fiktiven Martha-Fakten/Terminen. Root prüfte unabhängig in SQL: Request und Assistantnachricht **completed**,725 Eingabe-/357 Ausgabetokens,1119 Zeichen, tatsächliches Modell `deepseek-v4.1-flash`, **genau eine Ledgerzeile** mit646Microusd als interner Go-Kontingentschätzung. Kein behaupteter zusätzlicher Geldabfluss.

Root bestätigt außerdem unabhängig202 Backendtests, Typecheck, Build und20 tatsächliche Vercel-Paketprüfungen grün. Dies sind ausdrücklich übernommene Root-Nachweise; keine eigene Browser-/Provider-/Hostedaktion des Backendagenten. Folgefrage läuft zum Zeitpunkt dieser Meldung, Neuladen folgt: diese beiden Gates werden noch nicht als bestanden ausgegeben. Nur diese dokumentarische Ergänzung, keine weitere Codeänderung. Backend wartet auf den Anschlussbericht.


## Übernommener Root-Abschluss: Folgefrage und Neuladen

Root bestätigt auch Request `846f65d9-79a2-4ca5-b93c-f6bbe59c2946`: Request und Assistantnachricht completed,1124 Eingabe-/309 Ausgabetokens,1041 Zeichen, Modell `deepseek-v4.1-flash`, **genau eine Ledgerzeile** mit708Microusd interner Go-Kontingentschätzung. Die erste Antwort besitzt unabhängig per SQL-count bestätigt ebenfalls genau eine Ledgerzeile mit646Microusd.

Nach erneuter Browserverbindung war ein neuer Prüftab automatisch angemeldet; beide Antworten vollständig. Ein weiterer echter Reload bestätigte einmal Demo-Zugang, zwei Antwortartikel, keine Alerts und die vorhandene Folgeantwort. Root bewertete den Chat anhand eigener Screenshots in hell/dunkel jeweils9/10. Seinen neu angelegten Prüftab hat Root geschlossen; keine eigenen Prüfbrowsertabs bleiben offen. Damit sind die zuvor offenen tatsächlichen Antwort-/Folgefrage-/Anmeldungswiederaufnahme-/Reload-Gates laut unabhängiger Root-Abnahme bestanden. Keine eigene Browser-/Provideraktion und kein daraus abgeleiteter Phase2- oder Echtbetriebs-/Datenschutznachweis. Nur Dokumentation ergänzt; keine weiteren Tests, Codeänderungen oder eigenen Dienste. Backend abgeschlossen und wartend.
