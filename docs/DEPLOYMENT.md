# HTTPS deployment handoff

Status: code and `render.yaml` prepared; no hosting account or deployed URL yet. The user confirmed on September 17 that no Render/Railway account exists. No public deployment is claimed.

1. Create a Render account yourself at https://dashboard.render.com/register and complete any email verification and terms acceptance.
2. Push the project commits to your GitHub repository. Confirm `.env` is ignored; do not upload credentials, tokens or screenshots containing them.
3. In Render choose New → Blueprint, connect the GitHub repository, and select its branch. Render reads the root `render.yaml`. Review the selected free plan before creating anything; do not accept a paid upgrade unless intended.
4. Enter `MONGODB_URI` privately in the Render setup screen. Use an Atlas application database user with read/write permission for `solar_generation_api`, not Atlas administration privileges. The blueprint generates a separate production JWT signing secret.
5. In the Render service dashboard, find Connect → Outbound and copy all listed outbound IP ranges. Add those exact ranges to Atlas Network Access. The user's home IP entry does not authorize Render. Redeploy if the first startup failed before network access was configured.
6. Render supplies `PORT`. The build command is `npm ci --omit=dev`; the start command is `npm start`; health checks use `/ready`. Both `/api-docs/` and `/openapi.json` use relative URLs, so Swagger works on the public HTTPS origin.
7. If using the existing seeded Atlas database, no seed rerun is necessary. If using a separate production database, seed it and provision users from a trusted local environment pointing to that database before verification; do not add seed commands to server startup. Production does not need `SEED_USER_PASSWORD` to serve login requests.
8. Test public `/health`, `/ready`, `/api-docs/`, and `/openapi.json`. Log in with a provisioned user, then verify `/api/v1/provinces`, installation history, global readings, and generation summary. Copy an ETag and repeat the GET with `If-None-Match`; expect 304. `Accept: application/xml` should return 406.
9. Local device tokens signed with the development secret will not work in production. Issue device tokens in a trusted environment using the production signing secret and correct database; never expose the secret through an HTTP endpoint or commit it.
10. Capture the HTTPS address and Swagger page, plus redacted authenticated results. Fill the actual deployment URL and verification date into the README and report only after successful checks.

References checked September 17, 2026:
- [Render Express deployment](https://render.com/docs/deploy-node-express-app)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses)
- [MongoDB Atlas Render integration](https://www.mongodb.com/docs/atlas/reference/partner-integrations/render/)

Free hosting can have cold starts and resource limits. Treat this as a coursework deployment, not an operational SLSEA service. Existing synthetic substations and measurements are demonstrations.
