# TypeScript-Werkzeuge

Stand: 10.10.2026. Standardprüfung: `npm run typecheck`.

- Eigene direkte TypeScript-Prüfungen und Compiler-Ausgaben verwenden `tsc-rs@0.2.0` (fest in der Sperrdatei).
- `tsc-rs --version` meldet **TypeScript 7.1.0-dev**. Das ist die unterstützte Sprachversion, nicht die npm-Paketversion.
- Bestehende `typescript`-Pakete bleiben für Werkzeuge erhalten, die die JavaScript-Programmschnittstelle benötigen. Nicht durch einen Rust-Paketalias ersetzen.
- Vergleich: `npm run typecheck:legacy`
- Benannte Projektskripte verwenden. Ein nacktes `tsc` kann je nach Paketordner einen anderen Compiler aufrufen.
- Vorhandene strenge Prüfungen bleiben erhalten. Bei früheren TS-5-Projekten ohne `strict` macht `strict: false` die bisherige Vorgabe ausdrücklich; die Compilerumstellung ist kein zusätzlicher Wechsel der Prüfregeln.
- CSS- und Node-Typen werden ausdrücklich eingebunden. Keine Prüfbereiche ausschließen, um Fehlermeldungen zu verstecken.

## Plattformen und Editor

Version 0.2.0 veröffentlicht Binärpakete für **macOS arm64 und Linux x64/arm64**. Für Windows und Intel-Macs fehlt in dieser Veröffentlichung das Paket. Dort einen vorhandenen Vergleichscompiler ausdrücklich verwenden; keine fehlende Plattform als geprüften Rust-Erfolg ausgeben.

Der Rust-Sprachdienst lässt sich mit `tsc-rs --lsp --stdio` ansprechen. Die TypeScript-7-Erweiterung für VS Code kann über `js/ts.tsdk.path` auf das `lib`-Verzeichnis des tatsächlich installierten Plattformpakets zeigen. Das alte `typescript.tsdk` erwartet die JavaScript-Schnittstelle und darf nicht auf `tsc-rs` gesetzt werden. Plattformpfade und globale Editoreinstellungen werden nicht automatisch geändert. Der Hersteller nennt Speicherwachstum in langen Editorsitzungen sowie mögliche Abstürze von `-b --watch`; ein kurzer erfolgreicher Lauf widerlegt diese Grenzen nicht.

Rust beschleunigt die Entwicklung und Prüfung. Daraus folgen keine höheren Spiel-FPS und kein Nachweis für den ausgelieferten Browser-, Electron- oder Handyablauf.

Quellen: [TS Rust](https://github.com/pingdotgg/ts-rust), [Paket und bekannte Grenzen](https://github.com/pingdotgg/ts-rust/blob/main/npm/tsc-rs-readme.md), [geänderte TypeScript-Vorgaben](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/).
