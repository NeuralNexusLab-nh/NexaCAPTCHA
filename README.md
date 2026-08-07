# NexaCAPTCHA

**Let humans through. Make bots pay.**

NexaCAPTCHA turns four characters into a moving target. People follow it naturally. Bots must chase incomplete, distorted pieces across the full animation—on every attempt.

Try it at [nexacaptcha.zone.id](https://nexacaptcha.zone.id).

## Why it is harder to automate

- **Incomplete by design:** most frames show only fragments, and at least one character is never shown in full.
- **Constant distortion:** characters keep bending, stretching, rotating, and changing shape.
- **Independent movement:** every character moves in its own direction and at its own changing speed.
- **An unpredictable window:** the visible area speeds up, slows down, and moves backward without a simple rhythm.
- **Different every time:** motion, distortion, timing, and the hidden character change with every CAPTCHA.
- **Higher solving cost:** bots must inspect many frames, track moving fragments, and rebuild the answer instead of reading one image.

NexaCAPTCHA is designed to raise the cost of automated solving. It does not claim that automation is impossible.

## Add it to your site

### 1. Paste this into your HTML

The Script loads NexaCAPTCHA. The Div chooses where it appears.

```html
<script src="https://nexacaptcha.zone.id/captcha.js" defer></script>

<div
  class="nexa-captcha"
  data-callback="onNexaComplete"
></div>
```

### 2. Add this to your frontend JavaScript

Replace `yourSubmitFunction` with the function that already submits your form to your backend.

```js
function onNexaComplete(result) {
  if (!result.success) return;

  yourSubmitFunction({
    verificationId: result.verificationId,
    responseToken: result.responseToken
  });
}
```

NexaCAPTCHA returns two values:

| Value | Meaning |
| --- | --- |
| `verificationId` | The ID of the completed CAPTCHA. |
| `responseToken` | Proof that it was completed. It works once. |

## Check the result on your backend

Before accepting the form, signup, or login, send both values to:

`POST https://nexacaptcha.zone.id/api/siteverify`

Request:

```json
{
  "verificationId": "<verificationId>",
  "responseToken": "<responseToken>"
}
```

Success:

```json
{
  "success": true,
  "verifiedAt": "2026-08-07T12:30:00.000Z"
}
```

Failure:

```json
{
  "success": false,
  "errorCode": "invalid-or-expired-verification"
}
```

Node.js backend example:

```js
const response = await fetch(
  "https://nexacaptcha.zone.id/api/siteverify",
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

Continue only when the response says `success: true`. A `responseToken` works once and expires after five minutes.

## Run it yourself

Requires Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

Production:

```sh
npm run build
npm start
```

For Zeabur, create a service from this repository and choose the native Node.js runtime. `zbpack.json` supplies the build and start commands.

## Limits and checks

```sh
npm run check
```

The release budget is 0.25 vCPU, 100 MB RAM, and 10 GB storage. The current store supports one application instance. Restarting the service invalidates unfinished CAPTCHA sessions.

Read [SECURITY.md](SECURITY.md) before production use.

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE).
