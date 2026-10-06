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
| Anmeldung | Vorhandenes Demo-Konto gelangt in seinen Arbeitsbereich; verständliche Fehler statt leerer Seite | Bestanden laut Root-Livebeleg: Nutzer selbst angemeldet, Demo-Zugang aktiv |
| Anmeldung speichern | Verständlich benannte, aufgrund des ausdrücklichen Nutzerwunschs vorausgewählte Option; Anzeige stimmt mit tatsächlicher 30-Tage-Regel überein | Root-Livebeleg plus SQL: aktiv, remember_session=true, Restdauer 30,00 Tage |
| Startseite | Martha Beispielwald, Pflegegrad 3, zugehörige Kasse und zwei offene Aufgaben sichtbar | Offen |
| Fragenvorlagen | Dialog mit Themen und Beispielsätzen in Alltagssprache; Satz übernimmt sich als bearbeitbare Eingabe | Bestanden laut Root: fünf Kategorien mit je drei Optionen tatsächlich geöffnet und gezählt |
| Entwurf erhalten | Vorhandene ungesendete Eingabe wird durch Vorlage nicht still überschrieben | Bestanden laut Root-DOM: Prefix, Leerzeile, vollständige Telefonatvorlage erhalten; nicht automatisch gesendet |
| Personenbezug | Neues Gespräch ist sichtbar Martha zugeordnet | Offen |
| Echte KI-Antwort | DeepSeek antwortet auf die gespeicherten Angaben und benennt das antwortende Modell | Noch offen: HTTP 401 durch falschen Anbieterweg erklärt; Umstellung auf OpenCode läuft, kein Schlüsseltausch mehr verlangt |
| Folgefrage | Einfache Nachfrage bezieht sich auf die vorherige Antwort | Offen |
| Neuladen | Anmeldung und abgeschlossene Unterhaltung bleiben im selben Tab erhalten | Anmeldung, derselbe Chat, Nutzernachricht und helles Design nach echtem Reload erhalten; abgeschlossene KI-Antwort noch nicht vorhanden |
| Erneutes Öffnen | Soweit ohne Fokuswechsel unterstützt: neuer eigener Tab derselben Website übernimmt die gültige gespeicherte Sitzung; Test-Tab danach schließen | Offen |
| Sitzungsende | Unabhängige Tests belegen Standard-/Speicherdauer und Entfernung nach Abmeldung; keine 30 Tage verstrichene Echtzeit behaupten | Offen |
| Gesprächsliste | Neu angelegtes Gespräch auffindbar; Titel und Personenbezug stimmen | Offen |
| Beide Designs | Startseite, Gespräch und Vorlagendialog in hellem und dunklem Design lesbar und bedienbar | Vorlagendialog hell/dunkel laut Root-Screenshots bestanden; vollständige übrige Ansichten separat offen |
| Schmale Ansicht | Nur soweit über die erlaubte bestehende Verbindung ohne Fokuswechsel unterstützt: Navigation, Dialog und Eingabe bedienbar | Nicht live nachgewiesen: Größenänderung wirkte nicht, ursprünglicher Zustand wiederhergestellt |
| Ehrliche Grenzen | Keine vorgetäuschten Uploads, Exporte, Rechtsauskünfte oder gespeicherten Dokumente | Offen |

Geplante erste Frage: „Was weißt du schon über Martha, und welche zwei Aufgaben stehen bei ihr an? Bitte erklär mir das ganz einfach.“ Danach: „Was sollte ich davon zuerst angehen? Verwende nur die hinterlegten Angaben und sag mir, wenn etwas fehlt.“

## Vorbereitende Quellprüfung

Die vorhandenen Komponenten besitzen bezeichnete Eingabefelder und Knöpfe für Anmeldung, neue Gespräche, Nachricht senden, Suche und Designwechsel. Das Dialogmuster verwendet ein natives modales Dialogelement mit Schließen und Escape. Der bisherige Anmeldespeicher ist flüchtig; die beauftragte Überarbeitung des Frontend-Agenten muss deshalb durch ein echtes Neuladen geprüft werden. Gesprächserstellung und Personenbezug werden getrennt vom KI-Antwortnachweis geprüft.

Zum Zeitpunkt der Vorbereitung war noch keine Live-Browserprüfung durchgeführt. Die späteren konkreten Root-Belege stehen unten. Dieser Prüfchat vergibt keine visuelle Bildschirmnote ohne eigene Screenshotbeobachtung.

## Übergabestand vom Orchestrator

Commit `2601b4a`: Live-API laut Orchestrator wieder gesund (`health` 200; Sitzung und Chat ohne Anmeldung 401 als JSON; unbekannter API-Pfad 404; fremder Ursprung 403; ungültiger Token nach Datenbankinitialisierung 401). Dies sind übernommene Infrastrukturbelege, keine von diesem Prüfchat selbst durchgeführten Login- oder Chatnachweise. Anmeldespeicherung und 30-Tage-Vertrag werden noch fertiggestellt. Nutzer meldet sich danach einmal selbst an; auf „Live bereit“ warten.

Commit `2b9bb8b`: Orchestrator meldet Live bereit, Vercel Ready und Einstiegspaket `index-nd6jmd1l.js` identisch zur lokal geprüften Version. Übergebene Prüfzahlen: 146 Frontend-, 134 Backend-, 579 SQL-, 12 Upgrade-, 33 Hosted- und 11 Cloud-Prüfungen bestanden.

Bei der anschließenden tatsächlichen Browserübernahme kann dieser Unteragent den vorhandenen App-Tab nicht beanspruchen: Er gehört bereits zur Browser-Sitzung des Orchestrators. Die erlaubte Browser-API bietet keine Übergabefunktion während dessen laufendem Turn. Deshalb noch keine DOM- oder Screenshotbeobachtung dieses Prüfchats; keine Appaktion ausgeführt. Orchestrator ist informiert und kann den Ablauf in der bereits verbundenen Sitzung weiterführen. Kein Umgehungsweg über Browser-Speicher, CDP oder andere Prozesse versucht.

## Konkrete Livebelege des Orchestrators

### Neue Anmeldung, Hauptdomain, Deployment `2b9bb8b` – erster Einstieg

Herkunft: Root-Orchestrator hat den vorhandenen App-Tab über seine bereits gebundene Browser-Verbindung neu geladen und die Oberfläche bedient. Dieser Unteragent bewertet den übermittelten Befund, hat diesen Bildschirm nicht selbst beobachtet.

- Neuer Knopf „Demo-Zugang verwenden“ sichtbar. Der Klick setzt die bekannte Demo-E-Mail und führt zum noch leeren Passwortfeld.
- „Anmelden“ bleibt deaktiviert; kein ausgefülltes Browser-Autofill beobachtet. Es wurde kein Passwort gelesen oder übertragen.
- Auswahl „Anmeldung auf diesem Gerät speichern“ ist aktiviert (`checked`, AX-Wert 1).
- Sichtbare Erklärung: „Mit dieser Auswahl bleiben Sie bis zu 30 Tage angemeldet. Beim Öffnen wird Ihr Zugang geprüft. Ihr Passwort wird nicht gespeichert.“
- Nutzer zur bereits gewünschten einmaligen eigenen Anmeldung aufgefordert. Zu diesem Zeitpunkt waren positiver Login und echte KI-Antwort noch offen.

Unabhängige Einordnung dieses ersten Schritts: Der gemeldete Einstieg entspricht dem beauftragten vereinfachten Login und täuscht keine bereits erfolgte Anmeldung vor. Die vorausgewählte Speicherung und angezeigte Dauer stimmen mit dem vereinbarten Vertrag überein. Zu diesem Zeitpunkt fehlte noch der Nachweis nach tatsächlicher Anmeldung und Neuladen.

### Tatsächliche Anmeldung und Sitzungserhaltung

Herkunft: Root-Livebelege auf derselben Hauptdomain und Version `2b9bb8b`; SQL-Befund ebenfalls vom Orchestrator übermittelt.

- Der Nutzer hat sich selbst angemeldet. Kontoanzeige „Demo-Zugang“ sichtbar.
- Zugehörige `session_activity`: `remember_session=true`, `active=true`, `remaining_days=30.00`.
- Nach tatsächlichem Neuladen bleiben Konto „Demo-Zugang“, derselbe Chat und die bereits gesendete Nutzernachricht erhalten. Das gewählte helle Design bleibt ebenfalls erhalten.

Einordnung: Reale Anmeldung und unmittelbare Sitzungserhaltung bei Reload sind nachgewiesen. Der SQL-Wert belegt die gesetzte 30-Tage-Regel, nicht einen 30 Tage lang durchgelaufenen Echtzeittest. Wiederöffnung in einem anderen Tab, Abmeldung und Ablauf bleiben gesonderte offene Punkte. Kein Passwort wurde vom Prüfchat gelesen oder eingegeben.

### Erster echter Chatversuch – noch fehlgeschlagen

- Frage zu Marthas gespeicherten Angaben, Aufgaben und Terminen tatsächlich gesendet.
- Gespräch: `f8e0a132-3371-43f9-9668-79fbb3537f6f`.
- Anfrage: `77bc9cdf-4e5e-4271-b1c7-90bef9274f75`.
- Ergebnis: `PROVIDER_FAILED`, Antwortinhalt leer (`content=0`), Nutzungswerte fehlen (`usage=NULL`). Backend-Bereichsinhaber untersucht den Fehler.

Einordnung: Die Anfrage ist kein Beleg für eine erfolgreiche Antwort des Providers. Datenbezug der KI, Modellantwort, Folgefrage und Erhaltung einer abgeschlossenen Antwort sind weiterhin nicht abgenommen. Aus `usage=NULL` lässt sich nicht sicher ableiten, ob beim Anbieter eine Nutzung entstand. Das Gesamtergebnis „Vorführung funktioniert“ bleibt offen, bis eine echte Antwort und die Folgeprüfung erfolgreich abgeschlossen sind.

### Fragenvorlagen und bestehender Entwurf

- Fünf Themenkategorien tatsächlich geöffnet; je drei auswählbare Beispiele gezählt.
- Kategorie „Ein Gespräch vorbereiten“ ausgewählt, Beispiel „Ein Telefonat vorbereiten“ gewählt.
- Vorhandener Text: „Bitte kurz und in einfachen Worten.“
- Nach Anhängen zeigt der DOM-Beleg genau den vorhandenen Text, eine Leerzeile und danach die vollständige ausgewählte Vorlage.
- Kein automatisches Senden; Dialog geschlossen und Fokus in der bearbeitbaren Nachrichteneingabe.

Einordnung: Die alltäglichen Vorlagen sind zugänglich, nach Themen geordnet und zerstören den vorhandenen Entwurf nicht. Auswahl und Versand sind getrennt. Das erfolgreiche Einfügen ist unabhängig vom weiterhin fehlerhaften KI-Antwortweg belegt.

### Zweiter echter Chatversuch – damaliger Zwischenstand

Herkunft: tatsächliche Root-Liveanfrage auf Vercel-Version `f489365` (Ready), zugehöriger bereinigter Serverbefund.

- Anfrage `ccfa9992-cef4-4ba8-9f47-89771a53ba9f`, Logzeit 19:18:13.
- Anbieterantwort: `reason=HTTP_REJECTED`, `httpStatus=401`, `contentType=json`.
- Das bedeutet eine zurückgewiesene Authentifizierung beim Anbieter. Eine erfolgreiche KI-Antwort ist weiter nicht vorhanden.
- Damals wurde ein geschützter Schlüsseltausch als nächster Schritt angenommen. Diese Aufforderung ist durch den nachfolgenden Anbieterbeleg überholt: Kein Schlüsseltausch wird mehr verlangt. Kein Schlüssel wurde für diese Diagnose ausgelesen oder ausgegeben.

Einordnung des damaligen Belegs: Die Verbindung erreichte den direkt angesprochenen Anbieter, der die Authentifizierung ablehnte. HTTP 401 allein bewies keinen ungültigen Schlüssel. Der inzwischen belegte Anbieterunterschied wird im nächsten Abschnitt korrigiert. Echte Antwort, Datenbezug, Folgefrage und erneutes Laden der vollständigen Unterhaltung bleiben verpflichtende Abschlussprüfungen.

### Korrigierte Ursache: OpenCode-Schlüssel am falschen Endpunkt

Herkunft: Nutzer-Screenshot und Link zur OpenCode-Konsole; Root-Abgleich mit `https://opencode.ai/docs/zen/` und `https://opencode.ai/zen/v1/models`. Dieser Prüfchat hat keine Schlüsselwerte gesehen und keine eigene Anbieterabfrage ausgeführt.

- Nutzerbeleg zeigt den Schlüssel bei OpenCode als aktiv. Das gewünschte V4.1-Modell ist in der OpenCode-Konsole aktiviert.
- Offizielle Modellkennung laut Root-Abgleich: `deepseek-v4.1-flash` über OpenCode Zen.
- Der bisherige Server schickte den vorhandenen Schlüssel an den direkten DeepSeek-Endpunkt. Diese falsche Anbieterzuordnung war ein Fehler unserer Einrichtung; sie ist kein belegter Fehler des vom Nutzer hinterlegten Schlüssels.
- Backend-Bereichsinhaber stellt den Provider auf `opencode` und den passenden Endpunkt um. Der bereits geschützte Wert soll über einen ausdrücklich dafür vorgesehenen Rückgriff auf den bisherigen Variablennamen nutzbar bleiben. Kein zusätzliches Eingeben oder Auslesen des Schlüssels nötig.

#### Unabhängige Prüfung des laufenden Diff-Stands

Nur Quellprüfung, keine neuen Tests oder Browseraktionen dieses Prüfchats:

- Die fertigen Frontendänderungen ergänzen „über OpenCode“ ausschließlich für den Provider `opencode` im Gesprächskopf, bei laufenden Antworten und in gespeicherten Modell-Snapshots. Ein vorhandener Zusatz wird nicht verdoppelt.
- Historische direkte DeepSeek-Antworten behalten ihre historische Anbieterzuordnung. Die Einstellungen zeigen unbekannte Anbieter unverfälscht statt eines irreführenden Mistral-Fallbacks.
- Der bestehende Stream-Leser akzeptiert die Providerkennung bereits als Zeichenkette. Der neue Name wird daher nicht durch eine veraltete Laufzeitliste verworfen.
- Zum Zeitpunkt dieser Quellprüfung ist der Backendumbau noch nicht geliefert: Handler, Verfügbarkeitsermittlung und gemeinsame Context-/Modelltypen enthalten noch den bisherigen Direktanbieter. Das ist als laufende Arbeit dokumentiert, nicht als abgeschlossener Integrationsfehler gewertet.

Vor der nächsten Liveabnahme zusammen prüfen: neue Providerkennung durch DB-Enum, Kontextvorbereitung, Verfügbarkeit und gemeinsame Typen; richtige Paarung von geschütztem Schlüssel und OpenCode-Endpunkt; aktuelle OpenCode-Modellkennung, Preisgrundlage und tatsächliche Stream-/Nutzungsdaten; Gesprächsstandard ohne versehentlich weiterwirkende Direktanbieter-Auswahl. Alte Antwort-Snapshots erhalten und keinen weiteren direkten DeepSeek-Versuch mit dem OpenCode-Schlüssel auslösen.

### Dialoglage, Tastatur und Bildschirmgröße

- Der Root fand den Vorlagendialog visuell oben links. Das ist ein tatsächlicher Layoutbefund.
- Frontendkorrektur `margin: auto` in Commit `60eb994` hochgeladen. Vercel-Bereitstellung `47XfCzDhxEU7GS8jeKwoLk7L1mfo` Ready.
- Tatsächlicher Root-Nachtest nach Reload mit Screenshots in hellem und dunklem Design: Dialog bei x=620, y=45, Breite 680, Höhe 732 in 1920 × 821. Das liegt horizontal mittig; oberer und unterer Abstand betragen 45 bzw. 44 Pixel. Kopf, Optionen und Fußbereich innerhalb des sichtbaren Ausschnitts und lesbar.
- Root-Bewertung der Dialoglage vorher 6/10, nach Korrektur in beiden Designs 9/10. Diese Noten stammen aus der tatsächlichen Screenshotbewertung des Roots; dieser Unteragent bestätigt die geometrische Folgerung aus den übermittelten Maßen und vergibt keine separate eigene Bildnote.
- Escape schließt den Dialog im tatsächlichen Liveablauf.
- Ein Browser-Größenoverride auf 1280 × 720 änderte das beobachtete DOM-Maß 1920 × 821 nicht. Der Override wurde zurückgesetzt.
- Damit kein Nachweis einer schmalen oder mobilen Liveansicht. Keine Bildschirmnote für unbeobachtete Varianten und keine behauptete Einhaltung der angeforderten Testauflösung durch diesen wirkungslosen Override.

## Abschlussstand dieser unabhängigen Belegauswertung

Die tatsächliche Anmeldung mit dem vom Nutzer selbst angelegten Konto, unmittelbare Sitzungserhaltung bei Reload, gespeicherte 30-Tage-Regel und die kategorisierten Vorlagen samt Erhaltung des vorhandenen Textes sind anhand der ausdrücklich benannten Root-Belege bestätigt. Zwei tatsächlich gesendete Chatversuche liefern keine erfolgreiche Modellantwort. Der inzwischen belegte Fehler war die Verwendung des direkten DeepSeek-Endpunkts für einen OpenCode-Schlüssel. Die passende Anbieteranbindung wird repariert; das Gesamtgate für einen funktionierenden Live-Chat bleibt bis zur echten Antwort offen.

Der tatsächliche Nachtest der Dialogkorrektur ist in beiden Designs abgeschlossen. Nach Bereitstellung des OpenCode-Anschlusses muss derselbe vollständige KI-Ablauf weitergeführt werden; die frühere Aufforderung zum Schlüsseltausch entfällt. Zusätzlich offen: übrige Ansichten in beiden Designs vollständig, schmale Ansicht, Wiederöffnung in neuem Tab sowie echter Sitzungsende-/Abmeldetest innerhalb der vereinbarten Zugangsgrenzen. Vorhandene automatisierte Prüfungen ersetzen diese Livebelege nicht.

## Bereinigung

Bisher keine eigenen Browser, Server oder Hintergrundprozesse gestartet.
Dieser Unteragent hat keine Nutzer-Tabs verändert, keinen neuen Tab erstellt, keine Geheimnisse gelesen und keinen Commit ausgeführt. Der Root hat seinen temporären Größenoverride zurückgesetzt. Nutzer-Browsersitzung und Tabs bleiben erhalten.
