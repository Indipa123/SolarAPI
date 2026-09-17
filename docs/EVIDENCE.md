# Additional evidence to capture

The first twelve screenshots were captured by the student. Do not replace or fabricate those results. Hide passwords, Authorization headers, signing secrets and Atlas connection strings.

## Swagger
Open http://localhost:3000/api-docs/ and capture its title, API groups and server URL. Swagger offers separate user and device bearer schemes; Authorize with the user token for GET routes. Never capture the authorization dialog with a visible token.

## Regional readings
As the national user, request `/api/v1/readings?districtId=YOUR_DISTRICT_ID&pageSize=10&sort=timestamp:asc`. Capture URL, 200, `pagination` and a sample reading. A district user's request for a different district should show 403. Optional filters `provinceId`, `substationId`, and `installationId` combine with AND semantics.

## Historical district summary
Request `/api/v1/districts/YOUR_DISTRICT_ID/generation-summary?date=2026-09-06`. Capture 200 and counts/power/energy. Without `date`, the current Sri Lankan day is used. Old seed data does not imply current generation: zero fresh installations is an honest result.

## Conditional GET
1. GET `/api/v1/installations/YOUR_INSTALLATION_ID` with your user token.
2. Capture 200 and response `ETag`, `Last-Modified`, and `Cache-Control`.
3. Copy the complete quoted ETag into a request header named `If-None-Match`.
4. Send again. Capture 304 and the empty body. Keep authorization enabled.
5. If Postman adds `Cache-Control: no-cache`, remove that request header for this demonstration; it instructs the server to revalidate rather than treating the client copy as fresh.

## Negotiation
GET a protected API endpoint with user authentication and `Accept: application/xml`. Capture 406 and `NOT_ACCEPTABLE`. Restore `Accept: application/json` afterwards.

## Deployment evidence (pending)
Repeat Swagger, readiness, authenticated GET and 304 using the final public HTTPS hostname. Screenshots of localhost do not demonstrate deployment.

## Declaration and submission
Use the institution's original declaration form. Complete your own name/student ID, review the AI record and sign it yourself. No signature has been generated. The report draft is AI-assisted working material; revise it and ensure its use is allowed by your declaration before submission.
