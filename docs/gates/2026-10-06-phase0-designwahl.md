# Phase 0: gemeinsame Übergabe zur Designwahl

Frontend und Backend haben ihre ursprünglichen Aufgaben im selben jeweiligen TreeChat-Unterchat abgeschlossen. Phase-0-Meilenstein: `689e735`. Die nachfolgende Übergabe dokumentiert den Stand vor der Nutzerwahl.

## Nutzerentscheidung und Anschluss

Am 06.10.2026 hat der Nutzer entschieden: **„tagwerk sieht am besten aus damit weitermachen“**. Damit ist die Designwahl abgeschlossen und Phase 1 freigegeben. Dieselben ursprünglichen Unterchats erhalten jeweils einen vollständigen Phase-1-Auftrag; Frontend Opus 5.5/high, Backend Sol 6.1/xhigh. Sie erledigen Implementierung, eigene Prüfungen und Nacharbeit selbst. Der Orchestrator verbindet Vertrag und Lieferungen. Kein neuer Agent und kein Neustart des Hosting-Unterchats.

Tagwerk-Mocks bleiben die Designreferenz. Die tatsächliche App muss Supabase-Seed-Daten anzeigen; die bisher getrennten fiktiven Mock-/Seed-Familien werden bei der Datenanbindung zusammengeführt. Ein angemeldeter KI-Nutzertest bleibt abhängig von nutzerseitigem Auth-Konto, Provider-Secrets und freigegebenem Budget. Die Designentscheidung hebt Konto-, Geheimnis- und Kostenregeln nicht auf.

Die jüngste Nutzerkorrektur lautet: „bitte keine feedbacks geben sondern nur orchestrierer spielen und die sachen zusammenknüpfen nur wenn es sein muss, besser wenn die agenten alles selbst machen“. Nach dieser Korrektur haben die Agenten ihre eigene Nacharbeit und Abschlussprüfungen selbstständig beendet. Der Orchestrator übernimmt die gemeinsame Übergabe und den lokalen Meilenstein-Commit, keine App-Implementierung und keine weiteren kleinteiligen Designreviews.

## Design-Lieferung

[Galerie mit allen 24 Screens und drei Bewegungsfolgen](../mocks/index.html), [Frontend-Lieferbericht einschließlich eigener Vorher-/Nachher-Bewertungen](../mocks/README.md).

- **Linie:** Inter, Indigo/Grafit, klare Seitenleiste, sehr dezenter Friststrich.
- **Klartext:** IBM Plex, Petrol und gelber Marker, obere Navigation, breiter Sachbearbeiter-Einstieg.
- **Tagwerk:** warmes Papier/Tinte, Bricolage und Atkinson, Kobalt mit orangefarbenem Stempel.

Jede Richtung enthält Login, Dashboard, Chat mit vollständiger Bestätigungskarte und erstelltem Dokument sowie Einstellungen, jeweils dunkel und hell. 24 PNGs und zwölf Bewegungsbilder, jeweils 1280 × 720. Kein App-Code unter `src/`.

Der Frontend-Agent hat Quell-, Kontrast-, Layout-, PNG-, Bewegungs- und Abbruchprüfungen ausgeführt und eigene Screens nachgearbeitet. Sein endgültiger gespeicherter Renderbericht enthält 24 Screens, drei Bewegungsseiten und null Probleme; Flagprüfung bestanden und headless. 114 geprüfte Kontrastpaare bestehen. Der Orchestrator hat Bericht und Dateien zusammengeführt; frühere eigene Syntax-, Bildanzahl-/Maß- und Kontrastprüfungen sowie die erste Sichtprüfung sind im Verlauf dokumentiert. Die abschließende vollständige Sichtprüfung stammt vom Frontend-Agenten.

## Backend-Lieferung

[Backend-Prüfbericht](../backend-pruefung.md), [Anschlussvertrag v0.2](../api-contract.md), [Typen und ihre Herkunft](../../types/README.md).

Der eigene echte native Supabase-Stack hat beide Migrationen und den fiktiven Seed frisch angewendet. 21 Anwendungstabellen mit Workspace-/Akteurbezug, RLS, privatem Storage und vier auditierenden Metadaten-RPCs. Datenbanktypen stammen aus dieser tatsächlichen Datenbank. Keine Auth-Konten und kein eigenständiger PostgreSQL-Ersatz.

Abschlussprüfungen des Backend-Agenten: 295 SQL-Assertions, acht Assertions für einen echten Parallelkonflikt, acht Logiktests und strikte Typprüfung bestanden. Der Orchestrator hat den vollständigen Abschlussbericht, Vertrag und sichere Ergebnisdateien gelesen: der vollständige Zehn-Schritte-Lauf ist `passed`, der Paralleltest bestanden und seine Fixtures entfernt, Vitest 8/8 und null Fehler. Das ist das lokale Schema-Gate, kein Hosted-Nachweis.

## Anschluss und Grenzen

Die Designmocks und der Vertrag verwenden dieselben geplanten Modi und die konfigurierte 15-Minuten-Interaktionsgrenze. Live-Datenanbindung beginnt erst nach Designwahl; die unterschiedlichen fiktiven Familien in Mock und Seed sind noch nicht miteinander verbunden.

Neue Gesprächs-/Personenzuordnungs-RPCs, Login-/Logout-Nutzertests, Streaming, Provider, Bestätigungsaktionen, Kostensteuerung, Upload-/Exportflow und Wissenssuche sind weiterhin spätere Gates. Die statischen Bestätigungskarten sind keine laufende Chat-Engine. Keine Hosted-Migration oder Provideraufrufe im Backend-Auftrag. Dieser Bericht übernimmt keine Aussagen eines separaten Hosting-Auftrags.

Agenten-Selbstbewertungen und ihre Grenzen stehen in den verlinkten Lieferberichten. Geräte- und echte Screenreaderprüfungen stehen aus.

## Bereinigung und Entscheidung

Backend-Ergebnis: null eigene Prozesse, Ports 56421/56422 geschlossen. Frontend-Agent hat seine Browser und Wächter beendet. Der Orchestrator hat die gemeldete Browser-PID und alle Chrome-for-Testing-Arbeitsordner nachgeprüft: gemeldeter Browser beendet, keine Browser-PID mit diesem Projektordner. Fremde Browser blieben erhalten. Kein eigener Browser wurde vom Orchestrator gestartet.

Gemeinsamer Stand wurde lokal als Phase-0-Meilenstein committed, niemals gepusht. Die damalige Entscheidung **Linie, Klartext oder Tagwerk** ist inzwischen zugunsten **Tagwerk** gefallen; der aktuelle Anschluss steht am Anfang dieses Berichts.
