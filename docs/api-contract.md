# Backend-Vertrag v0.1 – Phase 0

Stand: 06.10.2026. Eigenständige Neuentwicklung. Änderungseigentümer: Backend-Unterchat; Vertragsänderungen werden dem Orchestrator gemeldet. Kein UI und keine Chat-Engine in Phase 0.

## Liefergrenze

**Phase 0 IMPLEMENTED:** Tabellen, Einschränkungen, Mitgliedschaftsprüfung, private Storage-Regeln, fiktiver Seed, SQL-Tests und die unten genannten kleinen DB-RPCs. `IMPLEMENTED` bezeichnet vorhandenen Code; ausgeführte Nachweise stehen separat in `backend-pruefung.md`.

**PLANNED Phase 1/2:** sämtliche Edge Functions, Provideradapter, Streaming, Session-Aktivitätsprüfung, Kostenreservierung, Vorschlagsbestätigung, Dokumentexport und Wissenssuche. Tabellen dafür sind Vorbereitung, keine aktive Chatfunktion. Es gibt weder Provideraufrufe noch API-Schlüssel.

## Identität und Ownership

Jede Anwendungszeile hat `workspace_id`, `created_by` und `created_at`, einschließlich Modellkatalog, Promptversionen, Verbrauch und Audit. Bei `workspaces` gilt `workspace_id = id`. `created_by` verweist auf einen **workspacegebundenen Akteur in `profiles`**, nicht unmittelbar auf `auth.users`. Ein Akteur ist `system` (ohne Login) oder `user` mit `user_id` (Supabase-Auth-UUID). Dieselbe Person bekommt pro Workspace ein eigenes Profil. Authentifizierung übernimmt ausschließlich Supabase; ein Profil ist kein Konto.

Der Seed verwendet einen ausdrücklich als System markierten Akteur ohne `user_id`, ohne Mitgliedschaft und ohne Auth-Konto. Die zyklischen Workspace-/Profilverweise werden in einer Transaktion mit aufgeschobenen Fremdschlüsseln initialisiert. Das ist keine versteckte Anmeldung. Synthetische Testprofile sind nur SQL-Fixtures und werden zurückgerollt.

`workspace_memberships` verbindet Profil und Workspace mit `member` oder `admin`, `active` oder `revoked`. Keine Mitgliedschaft aus benutzereditierbaren JWT-Metadaten. Ein gültiges JWT allein gibt keinen Workspacezugang. Der Nutzer legt später Logins manuell an; eine vertrauenswürdige serverseitige Provisionierung prüft den Auth-Nutzer und trägt Profil + Mitgliedschaft ein. Keine automatische Aufnahme beliebiger angemeldeter Nutzer und keine Browser-RPC für Provisionierung. Alle manuell zugelassenen Demo-Logins erhalten dieselbe Demo-Workspace-ID.

Alle Beziehungen einschließlich `created_by`, Modell, Prompt, Pflegeperson, Chat, Nachricht, Dokumentversion und Anhang verwenden zusammengesetzte Fremdschlüssel `(id, workspace_id)`. Ein fremder Workspace lässt sich auch durch einen privilegierten Schreibpfad nicht versehentlich verknüpfen. `workspace_id` und Akteur sind in den erlaubten RPCs unveränderlich. Alle Tabellen haben RLS. Browserrollen erhalten keine direkten Tabellen-Schreibrechte. Gezielte RPCs prüfen Rechte und schreiben ein Auditereignis in derselben Transaktion. Neue menschliche Bearbeitungs-RPCs kommen später hinzu; das ist keine Beschränkung auf das bisher getestete Modell.

## Datenmodell

| Tabelle | Inhalt und Grenze |
| --- | --- |
| `workspaces` | Name, Demo-Banner, keine Browseränderung |
| `profiles` | Workspace-Akteur, Anzeigename, System-/User-Typ, kein Passwort |
| `workspace_memberships` | Zugehörigkeit, Rolle, Status; nur vertrauenswürdige Provisionierung |
| `care_recipients` | Name, Pflegegrad 0–5, Geburtsdatum optional, Adresse, Pflegekassenkontakt |
| `contacts` | Fiktive Kasse, Arzt, Pflegedienst, Angehörige; Adresse und Kontaktdaten |
| `conversations` | Pflegeperson optional, Titel, Archivzeit, Mode-/Modelloverride, Revision |
| `messages` | Rolle, Markdown, Status, Modell-ID und unveränderlicher Provider-/Modell-Snapshot, Promptversion, Tokenzahlen, Quellen und Toolmetadaten |
| `documents` | Typ, Status `draft/reviewed/sent`, strukturierter Inhalt, Text, Herkunftschat, Revision |
| `document_versions` | Unveränderliche Inhaltsstände, fortlaufende Version, Sender-/Empfänger-Snapshot im Inhalt |
| `tasks` | Termin, Priorität, Status, Pflegeperson, Herkunftschat; Typ `standard/handover` |
| `notes` | Notiztext, Pflegeperson, Herkunftschat |
| `attachments` | Privater Objektpfad, MIME, Größe, SHA-256, Zustand, Chat/Nachricht/Pflegeperson, Sichtbarkeit `workspace/owner` |
| `ai_models` | Workspace-Katalog, Provider, genaue konfigurierbare Provider-ID, Tools/Vision nullable, Region + Nachweis, Betriebsstatus; nicht browsereditierbar |
| `prompt_versions` | Unveränderliche Persona und Prompttexte; sicherer Standard als erste Version |
| `agent_setting_versions` | Unveränderliche Einstellungssnapshots: Mode, Prompt, Standardmodell |
| `agent_settings` | Ein Zeiger auf die aktuelle Version je Workspace, Revision |
| `audit_log` | Akteur, Chat, Nachricht, Modell, Tool, Ziel, Ergebnis, Request-ID; nur Append vom Server/RPC |
| `tool_proposals` | Vorbereitete Vorschläge, Akteur, Chat, Snapshot, Ablauf, Zustand, bestätigtes Preview, Ergebnis-ID; Phase-2-Ausführung fehlt |
| `workspace_budgets` | Monatliches Limit in ganzzahligen USD-Mikroeinheiten; nur Server/Adminpfad |
| `cost_reservations` | Request-ID, Modell-/Preissnapshot, Monat, Höchstbetrag, Zustand |
| `usage_ledger` | Append-only Verbrauch je Request/Modell, Eingabe-/Ausgabe-/Cachetoken, Kosten, UTC-Zeit |

`knowledge_documents/knowledge_chunks` sind **PLANNED Phase 2**, noch keine Tabellen. Dann pgvector, Versionsbezug zur privaten Referenzdatei, Workspace/Akteur, Chunkposition, Embeddingmodell und zitierbare Seiten-/Abschnittsangabe. Kein öffentliches Wissen ohne ausdrückliche Freigabe. Dashboard sortiert Aufgaben nach `due_at` und Priorität; kein erfundener Fristberechner. Suche zunächst workspacegefiltert über Titel/Text, später indizierte Volltextsuche mit gleicher Rechteprüfung.

## Phase-0-DB-RPCs (IMPLEMENTED)

Alle UUIDs stammen aus berechtigt gelesenen Zeilen. `p_expected_revision` verhindert unbemerktes Überschreiben. Rückgabe ist die aktualisierte Zeile, außer Einstellungen: dort der aktuelle Zeiger.

| RPC | Eingabe | Berechtigung |
| --- | --- | --- |
| `rename_conversation` | `p_conversation_id`, `p_title`, `p_expected_revision` | aktives Mitglied; Titel 1–120 Zeichen |
| `set_conversation_preferences` | Chat-ID, `p_mode` oder null, `p_model_id` oder null, `p_archived`, erwartete Revision | Mitglied; Modell aus demselben Workspace, `enabled` und `operational` |
| `mark_document_status` | Dokument-ID, `p_status`, erwartete Revision | Mitglied; Status manuell, keine automatische Versandbehauptung |
| `update_agent_settings` | Workspace, Mode, Persona, Systemprompt, Modell-ID oder null, erwartete Revision | Admin; neue Prompt-/Einstellungsversion und Audit atomar |

Interne Hilfen in Schema `private` sind nicht als API-Schema exponiert. Kein öffentlicher Service-Grant. Die Serverrolle darf die vorbereiteten Tabellen verwalten; deren Schlüssel bleibt ausschließlich serverseitig. Audit und Verbrauch bleiben für die Serverrolle append-only. Browser sehen Audit und Kosten nur als Admin; reguläre Mitglieder sehen keine Abrechnungsdaten anderer Nutzer.

## Auth und Session (PLANNED Phase 1)

Email/Passwort; globale und Email-Registrierung sowie anonyme Auth deaktiviert. Kein Agent legt Konten an. Frontend: `persistSession: false` als Standard (kein dauerhafter Login), keine gespeicherte Passwortannahme, expliziter Logout. Nach 15 Minuten ohne echte Benutzerinteraktion: Stream abbrechen, Query-/Dateicache leeren, lokal abmelden, Refresh-Session widerrufen. Unsichtbare Flächen erzeugen keine Aktivitätsimpulse. Keine regelmäßigen Idle-Polls.

Supabase-Inaktivität misst Refresh-Aktivität, **nicht** Maus/Tastatur. Timebox 8 Stunden, Inaktivitätsgrenze 15 Minuten und JWT 5 Minuten sind lokale Vorbereitung. Hostingplan und Wirksamkeit prüfen; Supabase prüft die Grenze beim nächsten Refresh. Für sensible Edge-Aufrufe zusätzlich Signatur, Audience, Issuer, `exp`, Supabase-User und aktive `auth.sessions`-Session prüfen. Eine spätere private Session-Aktivitätszeile bindet Workspace/Akteur an `session_id`, `last_interaction_at`, Revokation und 8h-Deadline. Nur authentifizierte tatsächliche Interaktion darf sie verlängern, höchstens serverseitig jetzt; kein frei setzbarer Zeitstempel. Bestätigung verlangt frische Session. Direkte RLS-Lesezugriffe können bis JWT-Ablauf weitergehen; diese Restgrenze bleibt sichtbar und wird vor Echtbetrieb entschieden.

## Geplante HTTP-API und Streaming

Base: `/functions/v1/`; ausschließlich HTTPS im Hosting, POST mit JWT im Authorization-Header, JSON; niemals Credentials in URL. Erlaubte Herkunft explizit konfigurieren, keine Wildcard für authentifizierte Requests. Payloads serverseitig validieren, Antworttext/Uploads als untrusted behandeln. UTF-8, UTC-ISO-Zeit, UUIDs. Alle Endpoints **PLANNED**, nicht aufrufbar in Phase 0.

| Endpoint | Request / Ergebnis |
| --- | --- |
| `chat-stream` (Phase 1) | `{workspaceId, conversationId, clientRequestId, content, attachmentIds}` → SSE |
| `proposal-confirm` (Phase 2) | `{workspaceId, conversationId, proposalId, proposalRevision, editedPreview, idempotencyKey}` → `{actionId, resultType, resultId, replayed}` |
| `proposal-reject` (Phase 2) | Vorschlags-ID + Revision → abgelehnter Zustand, Audit |
| `attachment-prepare` (Phase 2) | MIME/Bytes/Scope/Chat → reservierte Attachment-ID + Objektpfad |
| `attachment-finalize` (Phase 2) | Attachment-ID → servervalidierte Datei, `ready` oder `rejected` |
| `attachment-read/delete` (Phase 2) | Mitgliedschaft + Anhangrechte → kurze signierte URL / geprüfte Löschung + Audit |
| `document-save/export` (Phase 2) | erwartete Revision, Inhalt / Format PDF oder DOCX → neue Version / private Exportdatei |
| `human-handover` (Phase 2) | editierbare Zusammenfassung → derselbe Bestätigungsweg für Aufgabe |

SSE: `event: <name>\ndata: <JSON>\n\n`. Envelope `{version:1, requestId, sequence, conversationId, type, data}`; pro Request monoton. Ereignisse `message.started` (messageId + Modell-/Promptsnapshot), `message.delta` (Text), `source.added` (Quelle + belegter Ausschnitt), `proposal.ready` (gespeicherte proposalId + Revision + Ablauf + Preview), `usage.final` (Token/Kosten), `message.completed`, `error`. Abbruch erzeugt niemals bestätigte Aktion; eine abgebrochene Antwort wird als `interrupted` gespeichert. Keine ungeprüften Tool-JSONs direkt im UI; keine geheimen Providerdetails im Stream. Phase 1 streamt ausschließlich Antworten, Phase 2 erweitert Vorschläge.

Fehler: `{error:{code,message,requestId,retryable}}`. HTTP 400 `VALIDATION_FAILED`; 401 `AUTH_REQUIRED/SESSION_EXPIRED`; 403 `WORKSPACE_FORBIDDEN/MODE_FORBIDS_CREATE/ADMIN_REQUIRED`; 404 `RESOURCE_NOT_FOUND` (keine Fremd-ID-Auskunft); 409 `REVISION_CONFLICT/PROPOSAL_STALE/IDEMPOTENCY_CONFLICT`; 410 `PROPOSAL_EXPIRED`; 413 `UPLOAD_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; 422 `MODEL_UNAVAILABLE/CAPABILITY_UNSUPPORTED/UPLOAD_REJECTED`; 429 `RATE_LIMITED/BUDGET_EXCEEDED`; 502 `PROVIDER_FAILED`; 503 `PRICING_UNVERIFIED`; 500 `INTERNAL_ERROR`. Keine SQL-Details oder rohe Providerfehler ausliefern. DB-RPC: SQLSTATE `42501` fehlende Rechte, `P0002` unsichtbar/nicht vorhanden, `40001` Revisionskonflikt, `22023` ungültige Eingabe; später eine gemeinsame Übersetzung.

## Mode und bestätigte Aktionen (PLANNED Phase 2)

Effektiver Mode = `conversations.mode_override ?? agent_setting_versions.mode`; effektives Modell = Chat-Override oder Workspace-Standard. Snapshot im Request sichern. `answer_only`: Create-Tools **aus dem Anbieterrequest entfernen**, auch aus Toolchoice; niemals nur Prompttext. `create`: nur geprüfte, typisierte `propose_document/propose_task/propose_note/propose_handover`; kein allgemeines SQL-/Schreibtool. Provider-Toolcall erzeugt allein einen Vorschlag, kein Dokument/Task/Notiz. Handover bleibt auch in answer-only als sichtbarer menschlicher Button erlaubt, als serverseitige bewusst bestätigte Benutzerhandlung; Agent bietet verbal an, hat dort kein Create-Tool.

Server speichert Vorschlags-ID, Actor, Workspace, Chat, ursprüngliche Nachricht, Tool, erlaubtes Preview, Revision, Modell-/Prompt-/Mode-/Chatrevision-Snapshot, Kontext-SHA256 und Ablauf (15 Minuten). Rohes Providerargument ist niemals Autorisierung. UI zeigt bearbeitbare Vorschau, Empfänger/Absender, Termingrundlage und einen eindeutigen Bestätigungsbutton. Bearbeitungen werden serverseitig neu validiert; keine zusätzliche Art von Aktion, keine Workspace-/Actor-ID aus Preview übernehmen. Rechte, Session, Mode und Snapshot beim Bestätigen neu prüfen. Jede Änderung am Context/Mode/Modell/Prompt macht den Vorschlag stale; neue Vorschau erforderlich.

Eine **geplante service-only DB-Funktion** sperrt Vorschlag und Chatzeile (`FOR UPDATE`), prüft Actor/Mitgliedschaft/Snapshot/Ablauf, erfasst den Bestätigungsdatensatz, schreibt Ergebnis + erste Dokumentversion + Audit + Proposalzustand **in derselben Transaktion**. Unbestätigte Zustände besitzen kein Ergebnis. Unique `(workspace_id, created_by, idempotency_key)` plus Payloadhash verhindert doppelte Ergebnisse. Gleiches Key + gleicher Payload gibt denselben Erfolg zurück; abweichender Payload → 409. Keinen Providercall innerhalb dieser Transaktion. Gleichzeitige Bestätigungen müssen in Phase 2 getestet werden. Direktes Browser-DML ist nicht verfügbar. Menschliche manuelle Bearbeitungen gehen über separate geprüfte Versionierungs-RPCs.

## Provider, Kosten und Ehrlichkeit (PLANNED)

Anthropic und OpenAI zuerst, ein Adapterinterface mit normalisierten Deltas, Usage und Toolvorschlägen. Keine Adapterimplementierung in Phase 0. Der Seed enthält **deaktivierte, konfigurierbare Beispiele**, keine Behauptung zur aktuellen Verfügbarkeit. `supports_tools/vision = null`, Region `unverified`, Status `planned`, solange kein konkreter Endpoint/Account/Modell belegt ist. Ein Modell wird nur nach überprüfter Fähigkeit und verifizierter Preisversion `operational`. Keine Versionsnummernsperre; die echte Fähigkeit zählt. Mistral/EU-Endpoint erst nach technischer und vertraglicher Prüfung ergänzen. EU-Hosting des Supabase-Projekts sagt nichts über KI-Verarbeitung aus; kein pauschales EU-/No-training-Versprechen.

Serverkey ausschließlich Supabase Edge Secrets. Kein Browser-VITE-Providerkey. Anbieterrequest enthält nur notwendige, berechtigte Daten. Jede Antwort speichert Provider-ID, tatsächliche Modell-ID, Registry-Snapshot, Promptversion, Quellen und Usage; Wechsel betrifft den nächsten Request. Unknown Usage nicht als null Kosten buchen.

Rate: zunächst 10 Starts/Minute je Auth-User (workspaceübergreifend), höchstens 2 laufende Requests je Nutzer. Geplanter atomarer SQL-Zähler und Request-Lease, kein Edge-Memory-Limit. Monatscap: `workspace_budgets.monthly_cap_microusd`, USD, UTC-Kalendermonat; Demo-Seed = 0 (keine Ausgabe). Vor jedem Aufruf atomar Budgetzeile/Monatsstand sperren, bezahlte Usage plus alle aktiven Reservierungen plus Worst-case Höchstkosten gegen Cap prüfen. Tokeninput serverseitig mit überprüfter konservativer Schranke bestimmen, Ausgabe/Tolls/Images begrenzen, Preisversion sichern. Unbekannte Preise/oberer Tokenbound → verweigern. Keine automatische billigere Modellumleitung.

Reservierung umfasst auch Retries, Cache-, Bild-, Such-/Toolgebühren, sofern Anbieter sie abrechnet; nicht abbildbare Kostenfähigkeit bleibt abgeschaltet. Provideroutput hart begrenzen. Abrechnung transaktional, doppelte Request-IDs einmalig. Bei Timeout/fehlender Usage maximale Reservierung halten bzw. als konservative Belastung buchen, kein blindes Ablaufen mit freigegebenem Geld. Übernutzung → Workspace sperren und untersuchen, keine falsche Garantie exakter Rechnung. Usage unveränderlich, nur korrigierende Ledgerzeile. Monatswechsel: Request bucht Reservierungsmonat, neuer Monat hat eigenen Stand. Phase-2-Gate verlangt Parallel-/Abbruch-/Retrytests gegen gemockte Provider.

## Uploads, Export, Übergabe

Privater Bucket `care-private`, nie öffentliche URL. 10 MiB je PDF/JPEG/PNG/WebP, 5 Anhänge je Nachricht, 25 MiB je Chatrequest; keine Mengenbeschränkung ohne Zweck: diese Grenzen schützen Parser/Provider/Kosten. Server prüft Magic Bytes, tatsächliche Größe, Seiten-/Pixelgrenze, Schadsoftwarekonzept, verschlüsselte/unlesbare PDFs und entfernt EXIF vor Providertransfer. Dateiname nur Anzeige; Objektpfad `<workspace_uuid>/<attachment_uuid>/<zufallsname>` ohne Personendaten. Pfad bindet exakt an reservierte Metadaten und Uploader, kein Upsert. Mitgliedschaft erforderlich; `owner` nur Ersteller, `workspace` ausdrücklich geteilt. Nie ein fremder Upload durch bloße Pfadkenntnis. Pending/Rejected-Dateien dürfen kein Chatkontext werden. Signierte Leselinks maximal 60 Sekunden, Cache `no-store`; schon ausgegebene URL bis Ablauf ist eine Restgrenze. Löschung beseitigt Objekt, Metadaten, abgeleitete Texte/Chunks/Exporte nach dokumentierter Retention; Fehler wiederholbar und auditierbar.

Dokumenteditor speichert Version und Sender-/Empfänger-Snapshot. PDF/DOCX Phase 2, fiktiver DIN-5008-artiger Brief, kein Versandtool. `sent` ist ausdrücklich manuell markiert. Übergabe erstellt nach Bestätigung eine `handover`-Aufgabe mit knapper Zusammenfassung, Unsicherheiten, Quellen, offenen Fristen und relevanten IDs. Kein Emailversand und kein externer Empfänger ohne späteren Auftrag. Prompt: höfliches Sie, keine verbindliche Medizin/Rechtsauskunft, Unsicherheit benennen, offizielle belegbare Quellen, keine erfundenen Beträge/Fristen. Hinweise sind keine rechtliche Abnahme.

## Quellen und spätere Gates

Primärdokumentation geprüft am 06.10.2026: [RLS und Grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [private Storage-Rechte](https://supabase.com/docs/guides/storage/security/access-control), [Sessiongrenzen und Refresh](https://supabase.com/docs/guides/auth/sessions), [CLI-Konfiguration](https://supabase.com/docs/guides/local-development/cli/config), [Migrationen](https://supabase.com/docs/guides/local-development/database-migrations), [CLI/Typgenerierung](https://supabase.com/docs/reference/cli/introduction).

Phase 0: Schema/RLS/Seed/RPC, Typen, sichere Wiederholung und Ressourcenbereinigung. Kein Auth-Nutzertest. Phase 1: manuell angelegter Nutzer, beide Themes, echter Chat nach Designwahl. Phase 2: Nutzerchat → editierte Vorschau → Bestätigung → Dokument samt Export, gemockte und später autorisierte Provider, Mode-/Concurrency-/Budget-/Uploadtests. Vor Echtbetrieb separate Datenschutzprüfung; keine Compliancebehauptung durch diese Architektur.
