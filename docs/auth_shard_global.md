# AUTH_IDB_KQL_SHEETS_GLOBAL_v5 (Google Apps Script)

This repository now tracks the frozen Google Apps Script shard used for global ASX authentication across apps and users. The implementation lives in [`auth_idb_kql_sheets_global_v5.gs`](./auth_idb_kql_sheets_global_v5.gs) and is designed for direct deployment via Apps Script Web App with IndexedDB + KQL client access.

## Capabilities

- **Google ID token verification** against the configured OAuth Web Client ID.
- **SecuroLink HMAC token issuance** using a shared secret stored in script properties.
- **Per-user spreadsheets** (auto-created) to track identity, sessions, API keys, app usage, events, and RLHF signals.
- **Global API keys** per user with automatic reuse and last-used stamping.
- **Deterministic `db.json` snapshot** generation covering all tables for downstream clients.

## Routes

- `GET` → health/metadata `{ ok, shard, version, time }`.
- `POST { "action": "securoLogin", "idToken" | "credential", "app_id" }` → securo login payload with `securoToken`, API key, and `db_json` snapshot.

## Required Script Properties

| Key | Purpose |
| --- | --- |
| `SECUROLINK_HMAC_SECRET` | HMAC signing key for SecuroLink token generation. |
| `USER_SHEETS_MAP` | JSON map of `external_id → spreadsheetId` (auto-maintained). |
| `AUTH_API_KEYS` | JSON map of API key records (auto-maintained). |

## Deployment Notes

1. Set the script properties above (Apps Script → Project Settings → Script properties).
2. Deploy as a Web App with **Execute as: Me** and **Who has access: Anyone** (or restrict as needed).
3. Clients call the web app URL using the routes above; all persistence stays in the user-specific Google Sheet plus client IndexedDB/KQL per design.

The shard is **frozen/canonical**; changes should be versioned by adding new files rather than mutating this one.
