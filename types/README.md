# Backend-Typen v1.4

`database.types.ts` stammt tatsächlich aus der frisch migrierten lokalen Supabase-App-DB: Supabase CLI 2.119.0, elf Migrationen, 25 Tabellen. Keine handgeschriebene Schemaersatzdatei. Wiederholung: `node backend/scripts/phase1-check.mjs`; darin `supabase gen types --local --lang typescript --schema public` im eigenen Spiegel und SUPABASE_HOME.

Frontend nutzt **BackendDatabase aus rpc.ts**: sechs Browser-RPCs samt echter Nullbarkeit, insbesondere null-Overrides, Personenzuordnung und `p_reset_to_default`. Server-only RPCs aus den rohen generierten Typen sind absichtlich nicht Teil dieses Browservertrags. Insert-/Update-Typen sind Schemaformen, keine Schreibrechte.

**phase1.ts**: tatsächlich implementierter HTTP-/SSE-Vertrag für `session` und `chat-stream`. `api.ts` exportiert diese Phase-1-Typen und enthält zusätzlich ausdrücklich geplante Phase-2-Vorschläge/Bestätigung. Diese geplanten Typen sind keine erreichbaren Endpoints.

`cd backend && npm run typecheck` prüft gültige und unzulässige Null-/Mode-/RPC-Formen strikt. `npm run build` baut die echten Node-Einstiegspunkte; keine Edge- oder Deno-Laufzeit. `PHASE1_API` nennt `/api/session`, `/api/chat-stream`, `/api/health`. OpenAI/DeepSeek sind im Herkunftstyp enthalten; Budget-NULL bedeutet ausdrücklich unbegrenzt. Normale Vercel-Node-Funktionen verwenden denselben Vertrag. Details und Grenzen in `docs/api-contract.md` und `docs/backend-phase1-randfaelle.md`.

`SessionRequest` erlaubt `rememberSession` nur bei `touch`. `SessionResult` verknüpft `sessionPolicy` mit exakten 900/28800 bzw. 2592000/2592000 Sekunden. Die zusätzliche server-only SQL-Überladung und `session_activity.remember_session` stammen aus echter CLI-Generierung. Neue Kontext-Snapshots führen vertrauenswürdige Berlin-Zeit; historische Replays dürfen diese Felder noch nicht enthalten.
