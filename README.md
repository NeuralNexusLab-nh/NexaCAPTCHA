<p align="center">
  <img src="public/assets/logo.svg" width="88" height="88" alt="NexaCAPTCHA logo">
</p>

<h1 align="center">NexaCAPTCHA</h1>

<p align="center"><strong>Open-source human verification in motion.</strong></p>

<p align="center">
  <a href="https://nexacaptcha.zone.id">Website</a> ·
  <a href="#integration">Integration</a> ·
  <a href="#http-api">API</a> ·
  <a href="LICENSE">Apache-2.0</a>
</p>

NexaCAPTCHA is a lightweight motion CAPTCHA designed to increase the cost of automated visual solving. It reveals continuously distorted characters through a narrow moving region, asks the user to enter all four characters, and returns a short-lived one-time token after a correct answer.

No account, site key, Bearer credential, `.env` file, or client framework is required.

> [!IMPORTANT]
> NexaCAPTCHA does not claim to be AI-proof. Always verify its response token from your backend, and treat automated solver evaluation as ongoing work.

## How it works

1. **Load** — Add one hosted script and one mount point.
2. **Verify** — The user enters the characters revealed through motion.
3. **Confirm** — Your backend verifies and consumes the short-lived response token.

Each challenge allows five incorrect answers. The fifth incorrect answer terminally fails the challenge. A correct answer returns a 32-character token with 192 bits of randomness. The token expires quickly and can be verified only once.

## Integration

Add the loader and a mount point:

```html
<script
  src="https://nexacaptcha.zone.id/v1/captcha.js"
  defer
></script>

<div
  class="nexa-captcha"
  data-callback="onNexaComplete"
></div>
```

Receive the completed browser output:

```html
<script>
  function onNexaComplete(result) {
    if (!result.success) return;

    console.log(result.challengeId);
    console.log(result.responseToken);
  }
</script>
```

Successful output:

```json
{
  "success": true,
  "challengeId": "chl_G5uQkATY0vYfXxWSMEuT6w",
  "responseToken": "GD8dR4qbKj7s0LmPWz2YxT5eU9nAcFhV"
}
```

Programmatic mounting is also available:

```js
const widget = NexaCAPTCHA.render("#captcha", {
  onComplete(result) {
    console.log(result);
  }
});

widget.getResult();
widget.reset();
widget.destroy();
```

The loader inserts an isolated iframe. If the integrating website uses CSP, allow NexaCAPTCHA in both `script-src` and `frame-src`:

```text
script-src 'self' https://nexacaptcha.zone.id;
frame-src 'self' https://nexacaptcha.zone.id;
```

## Verify from your backend

Send both browser values to your own backend, then call NexaCAPTCHA:

```js
const response = await fetch(
  "https://nexacaptcha.zone.id/api/v1/siteverify",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      challengeId: req.body.challengeId,
      responseToken: req.body.responseToken
    })
  }
);

const verification = await response.json();

if (!verification.success) {
  return res.status(403).json({
    error: "CAPTCHA verification failed"
  });
}
```

Request input:

```json
{
  "challengeId": "chl_G5uQkATY0vYfXxWSMEuT6w",
  "responseToken": "GD8dR4qbKj7s0LmPWz2YxT5eU9nAcFhV"
}
```

Successful output:

```json
{
  "success": true,
  "verifiedAt": "2026-08-07T12:30:00.000Z"
}
```

Failed output:

```json
{
  "success": false,
  "errorCode": "invalid-or-expired-verification"
}
```

Frontend completion is informational only. Never grant access based on the callback without server verification.

## HTTP API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/challenges` | Create and render a challenge |
| `GET` | `/api/v1/challenges/:challengeId/media` | Retrieve flattened animated media |
| `POST` | `/api/v1/challenges/:challengeId/answer` | Submit the human answer |
| `POST` | `/api/v1/siteverify` | Verify and consume a response token |
| `GET` | `/health/live` | Process liveness |
| `GET` | `/health/ready` | Service readiness and bounded queue state |

### Answer input

```json
{
  "answer": "NEXA"
}
```

### Incorrect answer output

```json
{
  "success": false,
  "status": "incorrect",
  "attemptsRemaining": 4
}
```

### Fifth incorrect answer output

```json
{
  "success": false,
  "status": "challenge_failed",
  "attemptsRemaining": 0
}
```

### Correct answer output

```json
{
  "success": true,
  "status": "completed",
  "challengeId": "chl_G5uQkATY0vYfXxWSMEuT6w",
  "responseToken": "GD8dR4qbKj7s0LmPWz2YxT5eU9nAcFhV",
  "expiresAt": "2026-08-07T12:32:00.000Z"
}
```

## Security boundaries

- The browser receives flattened GIF media, never the answer or generation parameters.
- Answers are normalized and stored only as runtime-keyed HMAC digests after rendering.
- Response tokens are stored only as SHA-256 hashes.
- Attempt changes and token consumption occur synchronously in the single Node.js process.
- Challenge and token responses use `Cache-Control: no-store`.
- The widget is isolated in an iframe and validates exact `postMessage` origins.
- The main website and widget have separate CSP policies.
- Only the widget may be framed by external websites.
- Browser API requests are same-origin. Unknown cross-origin requests and disallowed `OPTIONS` headers are rejected.
- Server-to-server `/siteverify` calls omit the browser `Origin` header and require no credential in anonymous v1.
- Request bodies, active challenges, queue length, temporary storage, and request rates are bounded.
- Answers and full response tokens must never be logged.

See [SECURITY.md](SECURITY.md) for reporting and operational details.

## Zero-configuration limitations

Anonymous v1 intentionally has no per-site identity. It therefore cannot provide per-site quotas, a private dashboard, reliable customer attribution, or individual-site revocation. Optional project keys and shared storage may be added later without removing the simple anonymous mode.

## Local development

Requirements:

- Node.js 20 or newer
- npm

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Production:

```bash
npm run build
npm start
```

The server reads only `process.env.PORT`, with a default of `3000`. It does not install `dotenv` or require a `.env` file.

Container deployment with the project resource limits:

```bash
docker compose up --build
```

`compose.yaml` applies `0.25` CPU, `100m` memory, a read-only root filesystem, a PID limit, and a dedicated temporary-media volume. NexaCAPTCHA additionally caps its own temporary media at 64 MB and removes expired files. The complete deployment must still be monitored because a Node heap ceiling is not the same as total process RSS.

## Tests

```bash
npm run check
```

The suite covers challenge lifecycle, five-attempt failure, token binding, single-use verification, malformed requests, route CSP, cross-origin denial, and strict `OPTIONS` handling.

## Architecture

```text
src/
  app.ts            Express routes and middleware
  renderer.ts       Bounded vector-to-indexed-GIF renderer
  store.ts          Short-lived challenge and token state
  security.ts       CSP, Origin, CORS, and OPTIONS policy
  server.ts         Runtime entrypoint and shutdown
public/
  captcha.js        Embeddable loader
  widget.html       Isolated CAPTCHA document
  widget/           Widget behavior and styles
  index.html        English homepage and live demo
tests/              Protocol and security tests
```

The default service uses one Node.js process, in-memory metadata, and short-lived temporary GIF files. Restarting the process invalidates active challenges. A future Redis adapter is required for horizontal multi-instance deployment.

## Resource budget

The production release is designed for a hard ceiling of:

- 0.25 vCPU
- 100 MB RAM
- 10 GB storage

Rendering is serialized through a bounded queue with a 25% work/cooldown duty-cycle target. Frames are encoded incrementally into a compact indexed-color GIF, and media files are deleted after expiry. Production starts Node with a 64 MB JavaScript heap ceiling, but release checks must measure total RSS rather than treating the heap limit as total memory. Container CPU quotas remain the authoritative hard limit.

## Accessibility

The surrounding UI supports keyboard operation, visible focus, labels, live status announcements, and reduced decorative motion. The challenge itself depends on motion; NexaCAPTCHA documents that limitation and must add a non-motion alternative before claiming broad accessibility compliance.

## Prior work

NexaCAPTCHA does not claim to have invented motion CAPTCHA as a category. Ghost Font and CHAMSIN are relevant prior work. NexaCAPTCHA’s code, interface, branding, renderer, and protocol are independently implemented.

## License

Licensed under the [Apache License 2.0](LICENSE). Third-party packages, fonts, and icon assets retain their own licenses and notices.
