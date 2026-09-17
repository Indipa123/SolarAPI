# Implementation progress

Reference: user-provided `NB6007CEM_Node_Express_MongoDB_APlus_Guide.md`.

## First milestone

- [x] Node/Express project and environment example
- [x] MongoDB connection and graceful shutdown
- [x] Liveness and database readiness endpoints
- [x] Six domain models and reading compound index
- [x] Model validation and consistent HTTP error contract
- [x] Foundation and model tests verified: 19 tests across 3 suites passed
- [x] Geographic seed data: 9 provinces, 25 districts, and 25 grid substations
- [x] Read-only geographic routes

## Remaining milestones

- [x] Atlas persistence and solar API smoke test completed September 14
- [x] Installation read services/routes and composite overview
- [x] Individual/latest/historical reading routes
- [x] Pagination, sorting and date filters
- [x] JWT login, device-scoped reading ingestion and user jurisdiction checks
- [ ] Regional reading filters
- [x] Seed 9 provinces, 25 districts, 25 substations, 200 installations and 134,400 readings; verified September 14
- [x] User login with bcrypt and JWT; local scripts provision installation-scoped device tokens
- [x] Enforce national/province/district read access and installation-scoped writes
- [ ] Conditional GET, ETag, Last-Modified and content negotiation
- [ ] District generation summary
- [ ] OpenAPI documentation and Swagger UI
- [ ] Database-backed integration and security tests
- [x] Local authentication configuration generated without printing secrets
- [x] Offline test suite: 53 tests passed September 16
- [ ] Provision demo users and execute updated authenticated solar/security verification against Atlas
- [ ] Production database, HTTPS deployment and live verification
- [ ] Incremental Git commits as milestones are reviewed
- [ ] Student-authored report, truthful AI disclosure, declaration and viva preparation

Do not expose resource routes publicly until authentication and authorization are tested. No Device collection is planned. Reading measurements will be append-only through the HTTP API. The optional mutable-resource admin routes and If-Match support are deferred until needed.

Seed-data energy semantics: plan to use meter-lifetime cumulative kWh and document the initial synthetic baseline; solar generation must follow Sri Lanka local daytime (UTC+05:30).

September 16: Atlas server selection failed during `npm run seed:users`. Local changes and offline tests are complete, but demo-user provisioning and live authentication verification are pending restored connectivity. Check the cluster state and current network IP access entry. Resume with `npm run seed:users`, `npm run verify:auth`, and `npm run verify:solar`.
