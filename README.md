# Solar Generation API

Backend for the NB6007CEM solar-generation coursework, using Node.js, Express and MongoDB/Mongoose. The implementation covers the domain model, geographic and installation read API, historical readings, and synthetic seed data.

## Local setup

Requires Node.js 22+ and a running MongoDB instance (local or Atlas).

```sh
npm ci
cp .env.example .env
# Edit .env to configure MONGODB_URI.
npm run dev
```

The default HTTP port is 3000. Startup connects to MongoDB before accepting requests; invalid configuration or an unreachable database fails startup. SIGINT/SIGTERM close the HTTP server and database connection.

Environment variables: `PORT`, `MONGODB_URI`, `NODE_ENV`, `JWT_SECRET`, and `JWT_EXPIRES_IN`. `SEED_USER_PASSWORD` is used only by the local demo-user provisioning command. `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` provision a separate installation administrator. Never commit `.env`, tokens, passwords, or database credentials.

Before using the protected API routes, set `JWT_SECRET` in `.env` to a random value at least 32 characters long. For local development, generate one with `openssl rand -base64 48`. Set `SEED_USER_PASSWORD` to a separate, unique password of at least 12 characters before running `npm run seed:users`.

Alternatively, run `npm run setup:auth` to generate missing values directly in `.env`, preserve configured values, and restrict the file to its owner. It never prints secrets. Restart the running server after environment changes.

## Available endpoints

- `GET /health`: process liveness, returns 200.
- `GET /ready`: database connection readiness, returns 200 when connected or 503 otherwise.
- `GET /api/v1/provinces`
- `GET /api/v1/provinces/:provinceId`
- `GET /api/v1/provinces/:provinceId/districts`
- `GET /api/v1/districts/:districtId`
- `GET /api/v1/districts/:districtId/substations`
- `GET /api/v1/substations/:substationId`
- `GET /api/v1/substations/:substationId/installations`
- `GET /api/v1/installations/:installationId`
- `GET /api/v1/installations/:installationId/overview`
- `GET /api/v1/installations/:installationId/latest-reading`
- `GET /api/v1/installations/:installationId/readings`
- `GET /api/v1/installations/:installationId/readings/:readingId`
- `POST /api/v1/auth/device-token`
- `POST /api/v1/installations` (installation administrator)
- `PUT`, `PATCH`, and `DELETE /api/v1/installations/:installationId` (installation administrator, `If-Match` required)
- `POST /api/v1/installations/:installationId/device-credentials` (installation administrator)

Unknown routes and malformed/oversized JSON use a consistent error envelope. Helmet adds security headers; request bodies are limited to 100 KB. Swagger is available at `/api-docs/`; the OpenAPI document is at `/openapi.json`.

All geographic, installation and reading `GET` routes require a Bearer token for an SLSEA user. National users can read all data; province users can read only their own province and its descendants; district users can read only their own district and its descendants. `POST /api/v1/installations/:installationId/readings` requires a device Bearer token with `reading:write` scope for that exact installation. Device tokens cannot read data and user tokens cannot submit readings.

Create the three demo users after setting the environment values:

```sh
npm run seed:users
```

They use `national.officer@slsea.demo`, `western.officer@slsea.demo`, and `gampaha.officer@slsea.demo`, with the password supplied through `SEED_USER_PASSWORD`. Obtain a user token by sending its email and password to `POST /api/v1/auth/login`.

For device authentication, an installation administrator first provisions a one-time device credential, then a device exchanges its `meterId` and that credential at `POST /api/v1/auth/device-token`. The returned token only allows uploads for that exact installation. The legacy local token command remains a development tool only:

```sh
npm run issue:device-token -- INSTALLATION_ID
```

The command prints the token once; it is never stored in MongoDB or source control. Tokens expire according to `JWT_EXPIRES_IN`, which defaults to one hour. Reissueing a token requires the current signing secret, so rotate `JWT_SECRET` if a token is exposed.

Create a separate administrator only after setting a unique email and password of at least 16 characters:

```sh
npm run seed:admin
```

Administration permission is separate from NATIONAL read scope. An installation write requires an exact, current ETag in `If-Match`; missing ETags return `428`, and stale or concurrently changed installations return `412`. DELETE is a soft decommission: public routes exclude the installation while its historical readings are retained internally.

Installation lists accept `page`, `pageSize` (1–100), and `status` (`ACTIVE`, `INACTIVE`, `MAINTENANCE`). Historical readings accept `page`, `pageSize`, `sort=timestamp:asc` or `timestamp:desc` (default), and inclusive `from`/`to` UTC timestamps such as `2026-09-06T00:00:00Z`. Invalid or unknown query parameters return 400. Collection responses include counts and next/previous links. Missing installations or readings return 404; an existing installation without readings returns an empty history, a null latest reading in its overview, and 404 at its latest-reading endpoint.

## Domain model

`Province → District → GridSubstation → SolarInstallation → GenerationReading`

The six main collections are `provinces`, `districts`, `gridsubstations`, `solarinstallations`, `generationreadings`, and `users`. Meter and optional inverter identifiers belong to the installation. Readings are separate timestamped documents, with a unique compound installation/timestamp index that supports historical and latest-reading queries in either time direction.

Installation administrators must also remain within their user jurisdiction: NATIONAL administrators can manage all installations, while PROVINCE and DISTRICT administrators can create, update, decommission or rotate device credentials only within their assigned region. Reassignment checks both the current installation and destination substation.

Users have NATIONAL, PROVINCE or DISTRICT roles. Regional roles require their corresponding reference; a district user's province is derived through the district. Password hashes are excluded from default queries and JSON output. Bcrypt login, JWT signature verification and jurisdiction middleware are implemented. Signed tokens missing the required regional scope are rejected. Role changes take effect on new tokens; existing signed tokens remain valid until expiration or signing-secret rotation.

References are not database foreign-key constraints: future services must verify that referenced documents exist. Mongoose's `unique` option declares database indexes, not validation rules. Index uniqueness must also be checked in database integration tests. Readings will have append-only HTTP routes; the schema alone does not prevent database updates.

## Tests

```sh
npm test
npm run test:coverage
```

The automated tests run without MongoDB and cover model validation, HTTP errors, solar-generation invariants, login, invalid/expired tokens, device scope, jurisdiction checks, analytics, HTTP caching, Swagger, strict reading payload validation, installation concurrency control and device-credential exchange.

After seeding the data and demo users, `npm run verify:solar` logs in as the national user, performs read-only database-backed HTTP checks, and checks the installed unique reading index. `npm run verify:auth` logs in with all three roles, tests allowed/denied reads, issues a device token in memory, submits one demonstration reading and checks duplicate rejection. Credentials and tokens are never printed. These scripts require Atlas connectivity and development dependencies.

The auth verification retains one demonstration reading at September 13, 2026, 00:00 Sri Lanka time, immediately after the seed window. Reruns reuse that timestamp and check for 409 instead of creating additional events. Total readings after successful auth verification are normally 134,401; the original seven-day seed window still contains 134,400.

Run `npm run seed` to populate nine provinces, all 25 districts, 25 demonstration substations, 200 installations, and 134,400 readings. Substation names and coordinates are illustrative city-based fixtures, not verified physical infrastructure. Installations and measurements are synthetic. Codes are project identifiers.

The initial seed ends at the most recent completed 15-minute interval and covers the preceding seven days. Generation follows Sri Lankan local time (UTC+05:30): it is zero overnight and follows a deterministic daytime curve. Energy is a synthetic cumulative total. Every inserted seed row has metadata timestamps. Run `npm run seed:refresh` shortly before a demonstration to append a rolling current window and backfill missing `updatedAt` values from older seed versions. It retains previous readings and does not present synthetic data as measured generation.

Geography is updated by code; demo installations are inserted by meter ID. Readings use insert-only upserts keyed by installation and timestamp. No collections are deleted. Seed meters use the `DEMO-` prefix.

The public coursework deployment is available at https://solar-api-puce.vercel.app. Its Swagger page is https://solar-api-puce.vercel.app/api-docs/. See [the deployment record](docs/DEPLOYMENT.md) and [evidence guide](docs/EVIDENCE.md) for verification and screenshots.
