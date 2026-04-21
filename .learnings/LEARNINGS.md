# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---
## [LRN-20260421-001] best_practice

**Logged**: 2026-04-21T13:45:00Z
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Atlas IP links synchronization must use the real Keycloak web flow plus the DataTables POST endpoint `/lien/parc`, not a guessed GET on `/lien`.

### Details
The working flow requires parsing the login form action dynamically, authenticating, parsing the MFA form, selecting the `Tél pro` credential id, posting the TOTP with `login=Connexion`, then querying the server-side DataTables endpoint at `/lien/parc`. The page HTML exposed that health filtering and the `sante` field come from this POST endpoint.

### Suggested Action
Keep the backend sync aligned with the observed browser flow and the `/lien/parc` JSON contract. When validating, inspect Atlas page scripts before assuming API shapes.

### Metadata
- Source: error
- Related Files: backend/src/services/ip-links.service.ts
- Tags: atlas, keycloak, mfa, datatables, unyc

---
