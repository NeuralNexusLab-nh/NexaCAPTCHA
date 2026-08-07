# NexaCAPTCHA

NexaCAPTCHA is a motion-based human verification service. It shows four uppercase letters or digits a little at a time. People follow the moving view, while automated tools need to process the complete animation.

Website and demo: [nexacaptcha.zone.id](https://nexacaptcha.zone.id)

## Features

- Four uppercase English letters or digits; ambiguous `I`, `O`, `0`, and `1` are excluded.
- Each character changes direction, speed, rotation, and shape independently on a 1.25–5 second cycle.
- The reveal window changes speed, sometimes moves backward, and normally shows only a fragment.
- A complete character is visible only briefly.
- Five minutes to complete the CAPTCHA and five attempts per CAPTCHA.
- One-time verification results.
- No account, site key, or authorization header.

## Add NexaCAPTCHA

### 1. Load the widget — HTML page markup

```html
<script src="https://nexacaptcha.zone.id/v1/captcha.js" defer></script>

<div
  class="nexa-captcha"
  data-callback="onNexaComplete"
></div>
```

### 2. Submit the result — frontend JavaScript

Replace `yourSubmitFunction` with the function that submits your form to your backend.

```js
function onNexaComplete(result) {
  if (!result.success) return;

  yourSubmitFunction({
    verificationId: result.verificationId,
    responseToken: result.responseToken
  });
}
```

Only two values are needed:

| Value | Meaning |
| --- | --- |
| `verificationId` | Identifies which completed CAPTCHA is being checked. |
| `responseToken` | A 32-character, one-time proof returned after the correct answer. |

## Confirm from your backend

Send both values to:

`POST https://nexacaptcha.zone.id/api/v1/siteverify`

The `/v1/` paths are stable and will not be renamed.

Request:

```json
{
  "verificationId": "<verificationId>",
  "responseToken": "<responseToken>"
}
```

Successful response:

```json
{
  "success": true,
  "verifiedAt": "2026-08-07T12:30:00.000Z"
}
```

Invalid, expired, or already used response:

```json
{
  "success": false,
  "errorCode": "invalid-or-expired-verification"
}
```

Node.js backend example:

```js
const response = await fetch(
  "https://nexacaptcha.zone.id/api/v1/siteverify",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verificationId, responseToken })
  }
);

const result = await response.json();

if (!result.success) {
  return res.status(403).send("Verification failed");
}
```

Only accept the protected form, signup, or login when `siteverify` returns `success: true`. Each `responseToken` works once and expires after five minutes.

## Run locally

Requires Node.js 20 or newer and npm.

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

Create a service from this GitHub repository and select the native Node.js runtime. The included `zbpack.json` supplies the build and start commands.

## Checks and limits

```sh
npm run check
```

The release budget is 0.25 vCPU, 100 MB RAM, and 10 GB storage. Rendering is queued, temporary animation storage is capped at 64 MB, and the production JavaScript heap is limited to 64 MB.

The current in-memory store supports one application instance. Restarting the service invalidates unfinished CAPTCHA sessions.

Read [SECURITY.md](SECURITY.md) before production use.

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE).
