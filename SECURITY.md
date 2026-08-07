# Security Policy

## Reporting a vulnerability

Do not disclose an exploitable vulnerability in a public issue. Contact the repository owner privately through an available GitHub security-reporting channel. Include the affected version, reproduction steps, impact, and any suggested mitigation.

Do not include real user answers, full response tokens, IP addresses, or unrelated personal data in a report.

## Security model

NexaCAPTCHA is a cost-increasing human-verification mechanism, not an authentication system and not a guarantee that automation is impossible.

Integrating applications must:

1. Send `challengeId` and `responseToken` to their own backend.
2. Call `/api/v1/siteverify` from that backend.
3. Accept the protected action only when the server response contains `success: true`.
4. Treat every response token as short-lived and single-use.

Frontend completion alone is never authoritative.

## Browser policy

- The public loader may be loaded cross-origin as a classic script.
- The challenge runs in an isolated iframe.
- The widget validates the exact parent and service origins for `postMessage`.
- The main website cannot be framed by external origins.
- The widget route is the only page with `frame-ancestors *`.
- Browser API calls are limited to the NexaCAPTCHA origin.
- `OPTIONS` requests allow only `GET`, `POST`, `OPTIONS`, and `Content-Type`.
- Credentials are not permitted in CORS responses.

## Operational limits

- Run behind HTTPS.
- Keep the render queue and active challenge count bounded.
- Keep temporary media below the configured cap and verify cleanup.
- Do not log answers or full tokens.
- Treat IP signals as temporary abuse-control data, not permanent identity.
- Run the test suite and resource-limit checks before deployment.

## Supported versions

NexaCAPTCHA is currently pre-1.0. Security fixes apply to the latest commit on `main` until a versioned support policy is published.
