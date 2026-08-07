# NexaCAPTCHA

NexaCAPTCHA is an open-source, motion-based human verification service. Instead of placing the complete answer in one stable image, it reveals readable portions of four distorted characters over time. A person follows the motion and combines what they see; an automated solver must sample and align frames, track changing fragments, compensate for deformation, reconstruct the characters, and then recognize them.

It is not presented as AI-proof. Its goal is to make reliable automated recognition less direct and more computationally expensive while keeping the interaction understandable for people.

Website and documentation: [nexacaptcha.zone.id](https://nexacaptcha.zone.id)

## What is different

- Only four uppercase English letters or digits are used. Ambiguous `I`, `O`, `0`, and `1` are excluded.
- Roughly 1.3 to 1.6 characters remain visible, making the text easier to follow than a narrow slit.
- Reveal position, direction, speed, floating motion, and distortion vary over time.
- The answer never appears as one clean, stable frame.
- Each verification permits five incorrect answers and stays open for three minutes.
- A correct answer returns a 32-character, single-use token valid for five minutes.
- No account, site key, authorization header, or client framework is required.

## Quick start

Add the hosted loader and a mount point:

```html
<script src="https://nexacaptcha.zone.id/v1/captcha.js" defer></script>

<div
  class="nexa-captcha"
  data-callback="onNexaComplete"
></div>
```

Receive the successful browser result:

```js
function onNexaComplete(result) {
  if (!result.success) return;

  console.log(result.verificationId);
  console.log(result.responseToken);
}
```

Browser output:

```json
{
  "success": true,
  "verificationId": "ver_G5uQkATY0vYfXxWSMEuT6w",
  "responseToken": "GD8dR4qbKj7s0LmPWz2YxT5eU9nAcFhV"
}
```

Send both fields to your own backend. Browser completion alone must never authorize a protected action.

## Backend confirmation

```js
const response = await fetch(
  "https://nexacaptcha.zone.id/api/v1/siteverify",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verificationId: req.body.verificationId,
      responseToken: req.body.responseToken
    })
  }
);

const verification = await response.json();

if (!verification.success) {
  return res.status(403).json({ error: "CAPTCHA verification failed" });
}
```

The token is consumed by the first successful confirmation. Reusing it returns `success: false`.

## HTTP API

All request and response bodies below are JSON. The animation endpoint returns `image/gif`.

### Create a verification

`POST /api/v1/verifications`

Input:

```json
{}
```

Output — `201 Created`:

```json
{
  "verificationId": "ver_G5uQkATY0vYfXxWSMEuT6w",
  "animationUrl": "/api/v1/verifications/ver_G5uQkATY0vYfXxWSMEuT6w/animation",
  "expiresAt": "2026-08-07T12:33:00.000Z"
}
```

Retrieve the animation with `GET <animationUrl>`.

### Submit the answer

`POST /api/v1/verifications/:verificationId/answer`

Input:

```json
{
  "answer": "A7K3"
}
```

Output — correct:

```json
{
  "success": true,
  "status": "completed",
  "verificationId": "ver_G5uQkATY0vYfXxWSMEuT6w",
  "responseToken": "GD8dR4qbKj7s0LmPWz2YxT5eU9nAcFhV",
  "expiresAt": "2026-08-07T12:35:00.000Z"
}
```

Output — incorrect:

```json
{
  "success": false,
  "status": "incorrect",
  "attemptsRemaining": 4
}
```

The fifth incorrect answer returns `status: "verification_failed"` with zero attempts remaining.

### Confirm from your backend

`POST /api/v1/siteverify`

Input:

```json
{
  "verificationId": "ver_G5uQkATY0vYfXxWSMEuT6w",
  "responseToken": "GD8dR4qbKj7s0LmPWz2YxT5eU9nAcFhV"
}
```

Output — accepted:

```json
{
  "success": true,
  "verifiedAt": "2026-08-07T12:30:00.000Z"
}
```

Output — invalid, expired, or already used:

```json
{
  "success": false,
  "errorCode": "invalid-or-expired-verification"
}
```

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

Production build:

```sh
npm run build
npm start
```

## Deploy on Zeabur

Create a service from this GitHub repository and select the native Node.js runtime. The included `zbpack.json` defines the build and start commands, so no Docker image is used.

After deployment, attach `nexacaptcha.zone.id` in the Zeabur networking settings and enable HTTPS.

## Security boundaries

- Answers are stored only as keyed digests with per-record salts.
- Response tokens are stored only as SHA-256 hashes and are single-use.
- Verification media and API responses use `Cache-Control: no-store`.
- The widget runs in an isolated iframe and validates message origins.
- Content Security Policy, same-origin API enforcement, strict `OPTIONS` handling, request size limits, and rate limits are enabled.
- Answers and full tokens are never logged by the application.

Read [SECURITY.md](SECURITY.md) before production use.

## Resource limits

The service is designed for a maximum release budget of 0.25 vCPU, 100 MB RAM, and 10 GB storage. Rendering is queued and duty-cycle limited, active records are bounded, temporary animation storage is capped at 64 MB, and the production process uses a 64 MB JavaScript heap limit.

Run all validation, including the resource probe:

```sh
npm run check
```

The current store is in-memory and intended for a single application instance. Restarting the service invalidates open verifications. Horizontal scaling requires a shared state adapter while preserving token atomicity and resource bounds.

## Accessibility

The surrounding interface supports keyboard input, visible focus, labels, live status announcements, and reduced decorative motion. The verification itself depends on motion. A non-motion alternative is required before claiming broad accessibility compliance.

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution and project-origin notes.
