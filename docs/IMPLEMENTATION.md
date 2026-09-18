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
- [x] Regional reading filters
- [x] Seed 9 provinces, 25 districts, 25 substations, 200 installations and 134,400 readings; verified September 14
- [x] User login with bcrypt and JWT; local scripts provision installation-scoped device tokens
- [x] Enforce national/province/district read access and installation-scoped writes
- [x] Conditional GET, ETag, Last-Modified and content negotiation
- [x] District generation summary
- [x] OpenAPI documentation and Swagger UI
- [x] Database-backed integration and security tests
- [x] Local authentication configuration generated without printing secrets
- [x] Offline test suite: 66 tests passed September 17
- [x] Provision demo users and execute updated authenticated solar/security verification against Atlas
- [x] HTTPS deployment and readiness verification at `solar-api-puce.vercel.app` on September 18
- [x] Incremental Git commits as milestones are reviewed
- [ ] Student-authored report, truthful AI disclosure, declaration and viva preparation

Do not expose resource routes publicly until authentication and authorization are tested. No Device collection is planned. Reading measurements will be append-only through the HTTP API. The optional mutable-resource admin routes and If-Match support are deferred until needed.

Seed-data energy semantics: plan to use meter-lifetime cumulative kWh and document the initial synthetic baseline; solar generation must follow Sri Lanka local daytime (UTC+05:30).

The remaining submission work is the student-authored report, truthful AI disclosure, declaration, screenshots and viva preparation.
