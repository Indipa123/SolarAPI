# HTTPS deployment

**Live API:** https://solar-api-puce.vercel.app

**Deployment status:** deployed to Vercel Hobby on September 18, 2026. `GET /ready` returned HTTP 200 with `{"status":"READY","database":"connected"}` after deployment.

## Configuration

- Source repository: `Indipa123/SolarAPI`, branch `main`.
- Vercel uses `api/index.js` as the serverless request handler and `vercel.json` rewrites all routes to it.
- The handler connects to MongoDB before passing the request to the existing Express app.
- Production environment variables are `MONGODB_URI`, `NODE_ENV=production`, `JWT_SECRET`, and `JWT_EXPIRES_IN=1h`. They are configured in Vercel and must never be committed or included in evidence screenshots.
- Atlas Network Access includes the `0.0.0.0/0` entry labelled `Vercel Hobby`, because Hobby deployments do not have a fixed outbound IP address. Atlas database-user authentication remains required.

## Verification targets

Open these public HTTPS URLs:

- `/health`
- `/ready`
- `/api-docs/`
- `/openapi.json`

For protected API routes, log in using a demo user and send the resulting Bearer token. Capture the live Swagger page, the readiness response, an authenticated request, and an ETag-based `304 Not Modified` response. Redact all tokens and connection strings.

## Vercel Hobby limits

This is a coursework demonstration deployment. Vercel runs the Express API as a serverless function, so it can have cold starts. It is not intended as a production SLSEA service. See [Vercel's Express deployment guide](https://vercel.com/docs/frameworks/backend/express) and [Hobby plan documentation](https://vercel.com/docs/plans).
