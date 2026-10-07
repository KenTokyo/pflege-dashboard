# Optionale OpenUI-Antworten

Stand 08.10.2026. OpenUI ist die Bibliothek von Thesys unter https://www.openui.com/. Der Anschluss verwendet das ausgewählte DeepSeek/OpenCode- oder Gemini-Modell. DeepSeek bleibt Standard, Gemini bleibt ausdrücklich wählbar. Kein neuer Schlüssel, Gateway, Autofix, Konto oder zusätzlicher Modellaufruf.

## Vertrag und Speicherung

`ChatRequestV1.responseFormat?: 'text' | 'openui'` steuert die nächste Antwort. Fehlend bedeutet `text`. Der Browser kann keinen Systemprompt oder Katalog übergeben. Der Server ergänzt den versionierten Katalog vor Reservierung und Tokenzählung. Persona, Fakten- und Sicherheitsregeln haben Vorrang. Beide Formate bitten um sparsame fette Schlüsselbegriffe und gegebenenfalls kurze kursiv gesetzte Einordnungen.

`types/openui.ts` enthält gemeinsame Zod-4-Schemas, echten SDK-Katalog, Parser und Textprojektion. Feste positionsbasierte Signaturen: `Answer(sections)`, `Text(markdown)`, `Facts(title,items)`, `Steps(title,items)`, `Notice(title,markdown)`.

```text
root = Answer([Text("**Antrag** prüfen."), Facts("Bekannt", ["Pflegegrad aus dem Kontext"]), Steps("Weiter", ["Unterlagen prüfen"]), Notice("Einordnung", "*Frist nicht bestätigt.*")])
```

Nur ein Root-Statement mit Inline-Komponenten, JSON-Stringliteralen und Listen ist erlaubt. Keine Variablen, Referenzen, Ausdrücke, weiteren Statements, Queries, Mutationen oder Actions. Dieser strikte Literalparser verhindert, dass der tolerant reparierende SDK-Parser unbekannte Bestandteile unbemerkt aus einer erfolgreichen Antwort entfernt. 100.000 Quellzeichen, 24 Abschnitte und 40 Einträge pro Liste begrenzen den Parser und sehr kleinteilige generierte Bäume; keine neuen Nutzungs- oder Ausgabenlimits.

### Formatwechsel in bestehender Historie

Die erste echte DeepSeek/OpenCode-OpenUI-Antwort war erfolgreich. Nach einer normalen Textantwort ignorierte das Modell bei einer weiteren OpenUI-Anfrage das Format und lieferte vollständig abgeschlossenen Markdowntext. Der bestehende Fehlerweg bewahrte den Text und buchte die belegte Nutzung einmal; es war kein Abbruch oder Tokenlimit.

Die Nacharbeit beseitigt zwei konkrete Promptprobleme: Die allgemeine SDK-Vorlage empfahl Referenzen und Hoisting, obwohl der engere App-Parser ausschließlich Inline-Literale zulässt. `OPENUI_INSTRUCTIONS` nennt nun ausschließlich die fünf erlaubten positionsbasierten Signaturen, die vollständige Inline-Grammatik und ein passendes Syntaxbeispiel. SDK-Schemas und Parser bleiben im Einsatz.

`backend/runtime/format-binding.ts` ergänzt eine feste vertrauenswürdige Formatbindung unmittelbar vor der letzten echten Nutzerfrage im Nachrichtenarray für DeepSeek/OpenCode und OpenAI. Alle vorhandenen Nutzer- und Assistententexte bleiben unverändert. Die Bindung erklärt ausdrücklich: Der Verlauf enthält kanonischen lesbaren Sachkontext und ist kein Vorbild für das aktuelle Format. Wünsche wie „kurz“ oder „ein Satz“ ändern den Antwortinhalt, nicht den aktiven Transportvertrag. Persona, Fakten und Sicherheitsregeln behalten Vorrang. Bei Gemini liegt dieselbe Bindung am Ende der separaten `systemInstruction`; `contents` enthält weiterhin ausschließlich die ursprünglichen User-/Model-Nachrichten. Historische Snapshots ohne Formatfeld bleiben unverändert.

Der Handler übergibt Katalog und diese Bindung bereits an `edge_chat_prepare`, bevor der unveränderliche Kontext und die Reservierung entstehen. Die Wiederholung auf dem Providerdraht passt einschließlich UTF-8 und JSON-Escapes in den vorhandenen 4096-Byte-Zuschlag der SQL-Reservierung; beide Formate werden darauf geprüft. OpenAI und Gemini zählen außerdem exakt den später gesendeten Input einschließlich der Bindung, bevor die Generierung beginnt. DeepSeek/OpenCode reserviert weiterhin den vollständigen dokumentierten Kontext. Keine neue Migration, API-Änderung, automatische Wiederholung oder zusätzliche Generierung. Die unveränderte finale Formatprüfung verhindert einen vorgetäuschten UI-Erfolg.

Neue lokale Regressionen benutzen fünf Nachrichten in derselben Reihenfolge wie der echte Fehler: frühere UI-Antwort als kanonischer Text, normale Textantwort, dann eine kurze Folgefrage. Die tatsächlich serialisierten OpenCode-, OpenAI- und Gemini-Requests erhalten die komplette Historie und korrekte Rollen; Tokenzählung und Generierung stimmen überein. Der gesamte Handlerweg belegt die Reservierung vor dem einzigen OpenCode-Aufruf, erfolgreiche kanonische UI-Projektion und unveränderte einmalige Finalisierung bei erneutem Markdown-Formatfehler. Backend-Gate nach Nacharbeit: 304/304 Tests, strikte Typprüfung und Build bestanden. Die zuvor ausgeführten nativen SQL-/Upgrade-Gates bleiben separat belegt; sie wurden für diese reine Prompt-/Adapterkorrektur nicht als neuer Lauf ausgegeben. Die erneute echte Prüfung desselben Verlaufs auf Vercel übernimmt Root.

Offizielle Rollenverträge: [DeepSeek Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/), [OpenAI Responses](https://developers.openai.com/api/reference/typescript/resources/responses), [Gemini `systemInstruction` und Verlauf](https://ai.google.dev/api/generate-content). Die dokumentierte Formatbindung verbessert die Anweisung; sie ersetzt keine harte finale Schemaprüfung und garantiert nicht, dass ein Modell jede Antwort korrekt formatiert.

`parseOpenUi(source,isStreaming)` liefert `state`, sichere `source`, `text`, `sections` und gegebenenfalls `reason`. Unbekannte, dynamische oder unvollständige finale Programme führen zu `PRESENTATION_INVALID`, Status `failed` und einer sichtbaren Formatwarnung. Klarer normaler Markdowntext eines Modells, das das Format ignoriert hat, bleibt im fehlgeschlagenen Datensatz lesbar. Programmtext wird nicht als erfolgreiche normale Antwort ausgegeben.

`messages.content` enthält die vollständige Textprojektion genau derselben validierten Abschnitte in ihrer Reihenfolge. Fakten, Schritte und Hinweise bleiben enthalten. Es gibt keinen zweiten unabhängig erzeugten Antworttext. Verlauf, nächste Provideranfrage und Textleseansicht benutzen diese Projektion. Quellen, tatsächliches Modell und Abbruchhinweise bleiben außerhalb des Renderers.

Das neue nullable Feld `messages.presentation` enthält:

```json
{"format":"openui","catalogVersion":"pflege-openui-v1","source":"root = Answer([Text(\"Antwort\")])","state":"valid"}
```

Historische Nachrichten bleiben `presentation=null`. `sources`, `tool_calls` und das unveränderliche `model_snapshot` werden nicht umgedeutet. Ausschließlich die geschützten Server-RPCs aktualisieren Präsentationen. Die bestehenden Regeln für endgültige Nachrichten, Mitgliedschaft, echte Auth-Sitzung, Reservierung und Usage bleiben erhalten.

## Stream, Abbruch, Wiederholung

- `message.started` nennt `responseFormat`, für OpenUI auch `catalogVersion`.
- `message.presentation.delta {text}` enthält echte Quellfragmente. Der gemeinsame Parser erzeugt die sichere Vorschau.
- `message.delta {text}` bleibt lesbarer Text. Bei OpenUI wird die geprüfte vollständige Projektion genau einmal ausgegeben. Partielle JSON-Escapes verändern dadurch keine bereits gesendeten Textdeltas.
- `message.presentation.final {presentation}` nennt `valid`, `invalid` oder `interrupted` vor `completed` beziehungsweise `error`.
- Checkpoints speichern Teilprojektion und Quelle gemeinsam. Abbruch und abgelaufene Lease bewahren `interrupted`. Fehlende finale Usage bleibt reserviert; ein Formatfehler mit belegter Usage wird ohne erneuten Modellaufruf als fehlgeschlagene Antwort abgerechnet.
- Das Format gehört zum Idempotenzhash und unveränderlichen Snapshot. Replay liefert gespeicherte Darstellung ohne Providercall. Textanfragen behalten den historischen Hash. Alte Antworten, Quellen und Nutzung werden nicht geändert.
- Ansichtswechsel einer gespeicherten OpenUI-Antwort benötigt keinen Request. Alte Textantworten bleiben Text.

## Verifizierte Bibliothek und Primärquellen

Exakt installiert: Frontend `@openuidev/react-lang` 0.3.1, Backend `@openuidev/lang-core` 0.3.1, Zod 4.6.5. Veröffentlichtes React-Lang deklariert React `*`; React-UI deklariert React 18.3.1 oder 19. Die App nutzt React 19.3.0. Deklarierte Kompatibilität ersetzt die eigene Darstellungskontrolle nicht. Der optionale MCP-Peer ist nicht nötig; keine neue Chat-Shell oder parallele State-Bibliothek.

- [Komponentenkatalog und Parameterreihenfolge](https://www.openui.com/docs/openui-lang/defining-components)
- [Streaming-Renderer, Fehler und ausgelassene unbekannte Knoten](https://www.openui.com/docs/openui-lang/renderer)
- [Serverprompt und deaktivierbare Tools/Bindings](https://www.openui.com/docs/openui-lang/system-prompts)
- [Offizielle Grenzen der Generierungszuverlässigkeit](https://www.openui.com/docs/openui-lang/reliability)
- [Offizieller Quellcode](https://github.com/thesysdev/openui)
- [Veröffentlichtes React-Lang-Paket](https://registry.npmjs.org/@openuidev/react-lang/0.3.1)
- [Telemetrie: Installation separat, Runtime opt-in](https://www.openui.com/docs/openui-lang/telemetry)

Backendinstallation erfolgte mit `OPENUI_TELEMETRY_DISABLED=1`. Runtime-Telemetrie, Observability, Gateway und Autofix bleiben deaktiviert. Der installierte Core benötigt ausdrücklich `OPENUI_RUNTIME_TELEMETRY_ENABLED` und respektiert `OPENUI_TELEMETRY_DISABLED`/`DO_NOT_TRACK`. Die Parserprüfung belegt keine fremden Requests. Erneute Installation: `OPENUI_TELEMETRY_DISABLED=1 npm install`, ohne globale Nutzer-Umgebung zu ändern. Kein OpenUI-CLI-Aufruf nötig.

OpenAI ChatKit ist ein anderes Produkt. Die [offizielle Anleitung für eigene Infrastruktur](https://developers.openai.com/api/docs/guides/custom-chatkit) verlangt einen ChatKit-Server mit eigenem Ereignis- und Store-Vertrag. Für den gewünschten OpenUI-Renderer ist dieser zusätzliche Anschluss nicht erforderlich.

## Operatorfolge und lokale Nachweise

Die CLI-erzeugte Migration `20261007214239_openui_presentation.sql` nach den bisherigen 16 Migrationen auf das eigene freigegebene Projekt anwenden, anschließend Server und Frontend ausliefern. Keine neuen Provider-/Workspace-Settings, Seed-Wiederholung oder Auth-Konten. Die Serverstartprüfung verlangt alle vier neuen serverseitigen RPC-Signaturen.

Lokale native Gesamtprüfung: `cd backend && node scripts/phase1-check.mjs`. Historischer Pfad: `node scripts/gemini-upgrade-check.mjs`. Direkter 16→17-Pfad: `npm run build && node scripts/openui-upgrade-check.mjs`. Geschützte Nachweise unter `backend/.local/`; jedes Skript stoppt seinen isolierten nativen Supabase-Stack und prüft seine Ports.

Fresh-Gate: 17 Migrationen, 700 SQL-Assertions, 292 Backendtests, 31 Node-HTTP/SQL-, 19 Node-PG-Abbruch-, 8+15 Parallel- und 17 Operatorchecks. Direkter 16→17- und historischer 13→17-Upgrade: jeweils 15 erfolgreiche Prüfungen, alte Antwort-/Quellen-/Modell-/Usage-/Budget-/Sitzungsdaten unverändert. Keine Auth-Konten, Hostedmutationen, echten Provideraufrufe oder Browser durch den Backendagenten.

Root prüft echte Generierung mit dem bestehenden Nutzer auf Vercel. Die [offizielle Google-Fehleranleitung](https://ai.google.dev/gemini-api/docs/troubleshooting) unterscheidet vorübergehende 429/503-Probleme von ungültigen Anfragen und Schlüsseln. Die erste echte Gemini-OpenUI-Probe traf einen nativen HTTP-200-SSE-Fehler mit Google-Code 503/UNAVAILABLE nach Teilchunks. Dieser belegte Provider-Überlastungsfall wird als `PROVIDER_UNAVAILABLE` klassifiziert; Teilusage ist unzuverlässig und bleibt gehalten. Keine automatische Wiederholung oder Anbieterwechsel. Lokale Adapterregressionstests decken auch SSE 429/401/403, native 400-Key-Fehler sowie malformed Fehlerobjekte ab. Dieser echte externe Fehler ersetzt keinen erfolgreichen Gemini-OpenUI-Livenachweis.
