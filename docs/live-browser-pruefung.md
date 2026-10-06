# Live-Prüfung der Vorführung

Stand: 06.10.2026. Ziel: den veröffentlichten Ablauf mit dem vom Nutzer angelegten Demo-Konto auf `https://pflege-dashboard-puce.vercel.app` tatsächlich abschließen.

## Vorgehen und Grenzen

- Vorhandener Chrome-Tab über das ChatGPT-Browser-Plugin. Kein eigener Browserprozess, keine Ersatz-App, kein Fokuswechsel. Nutzer-Tabs bleiben erhalten.
- Nur fiktive Daten. Keine Zugangsdaten, Sitzungsschlüssel oder Browser-Speicher auslesen. Keine Konto- oder Passwortänderung.
- Orchestrator stellt die geprüfte Online-Version und bei Bedarf den geschützten Zugang bereit. Dieser Prüfchat beginnt den Browserablauf erst nach dessen Meldung „Live bereit“.
- Quellprüfung und erfolgreiche Paketprüfungen sind kein Beleg für erfolgreichen Login oder echte KI-Antworten.
- Der Nutzer möchte die Anmeldung speichern. Die bewusste Option ist für diese Vorführung daher vorausgewählt. Geplanter Vertrag: Standard-Sitzung 15 Minuten ohne Aktivität/maximal 8 Stunden; ausdrücklich gespeicherte Sitzung 30 Tage. Tatsächliche Oberfläche und Serververhalten werden gegen diesen Vertrag geprüft.
- Kein vorzeitiges Abmelden des vorhandenen Kontos: Ohne bekanntes Passwort würde das den selbstständigen weiteren Live-Test blockieren. Abmelde- und Löschverhalten zunächst anhand der unabhängigen Tests dokumentieren; echter Abmeldetest erst ganz am Ende, wenn eine erneute Anmeldung durch den Nutzer ohnehin möglich ist.

## Vorbereiteter Prüflauf

| Schritt | Erwartetes tatsächliches Ergebnis | Stand |
| --- | --- | --- |
| Anmeldung | Vorhandenes Demo-Konto gelangt in seinen Arbeitsbereich; verständliche Fehler statt leerer Seite | Offen |
| Anmeldung speichern | Verständlich benannte, aufgrund des ausdrücklichen Nutzerwunschs vorausgewählte Option; Anzeige stimmt mit tatsächlicher 30-Tage-Regel überein | Offen |
| Startseite | Martha Beispielwald, Pflegegrad 3, zugehörige Kasse und zwei offene Aufgaben sichtbar | Offen |
| Fragenvorlagen | Dialog mit Themen und Beispielsätzen in Alltagssprache; Satz übernimmt sich als bearbeitbare Eingabe | Offen |
| Entwurf erhalten | Vorhandene ungesendete Eingabe wird durch Vorlage nicht still überschrieben | Offen |
| Personenbezug | Neues Gespräch ist sichtbar Martha zugeordnet | Offen |
| Echte KI-Antwort | DeepSeek antwortet auf die gespeicherten Angaben und benennt das antwortende Modell | Offen |
| Folgefrage | Einfache Nachfrage bezieht sich auf die vorherige Antwort | Offen |
| Neuladen | Anmeldung und abgeschlossene Unterhaltung bleiben im selben Tab erhalten | Offen |
| Erneutes Öffnen | Soweit ohne Fokuswechsel unterstützt: neuer eigener Tab derselben Website übernimmt die gültige gespeicherte Sitzung; Test-Tab danach schließen | Offen |
| Sitzungsende | Unabhängige Tests belegen Standard-/Speicherdauer und Entfernung nach Abmeldung; keine 30 Tage verstrichene Echtzeit behaupten | Offen |
| Gesprächsliste | Neu angelegtes Gespräch auffindbar; Titel und Personenbezug stimmen | Offen |
| Beide Designs | Startseite, Gespräch und Vorlagendialog in hellem und dunklem Design lesbar und bedienbar | Offen |
| Schmale Ansicht | Nur soweit über die erlaubte bestehende Verbindung ohne Fokuswechsel unterstützt: Navigation, Dialog und Eingabe bedienbar | Offen |
| Ehrliche Grenzen | Keine vorgetäuschten Uploads, Exporte, Rechtsauskünfte oder gespeicherten Dokumente | Offen |

Geplante erste Frage: „Was weißt du schon über Martha, und welche zwei Aufgaben stehen bei ihr an? Bitte erklär mir das ganz einfach.“ Danach: „Was sollte ich davon zuerst angehen? Verwende nur die hinterlegten Angaben und sag mir, wenn etwas fehlt.“

## Vorbereitende Quellprüfung

Die vorhandenen Komponenten besitzen bezeichnete Eingabefelder und Knöpfe für Anmeldung, neue Gespräche, Nachricht senden, Suche und Designwechsel. Das Dialogmuster verwendet ein natives modales Dialogelement mit Schließen und Escape. Der bisherige Anmeldespeicher ist flüchtig; die beauftragte Überarbeitung des Frontend-Agenten muss deshalb durch ein echtes Neuladen geprüft werden. Gesprächserstellung und Personenbezug werden getrennt vom KI-Antwortnachweis geprüft.

Noch keine Live-Browserprüfung durchgeführt. Keine Bildschirmnote vergeben, da kein aktueller Online-Bildschirm beobachtet wurde.

## Übergabestand vom Orchestrator

Commit `2601b4a`: Live-API laut Orchestrator wieder gesund (`health` 200; Sitzung und Chat ohne Anmeldung 401 als JSON; unbekannter API-Pfad 404; fremder Ursprung 403; ungültiger Token nach Datenbankinitialisierung 401). Dies sind übernommene Infrastrukturbelege, keine von diesem Prüfchat selbst durchgeführten Login- oder Chatnachweise. Anmeldespeicherung und 30-Tage-Vertrag werden noch fertiggestellt. Nutzer meldet sich danach einmal selbst an; auf „Live bereit“ warten.

## Bereinigung

Bisher keine eigenen Browser, Server oder Hintergrundprozesse gestartet.
