# NexaCAPTCHA

**Let humans through. Make bots pay.**

NexaCAPTCHA presents four smoothly moving characters with short readable intervals. People can follow the stable character skeletons over time, while direct frame stacking accumulates changing contours and decoy strokes.

Try it at [nexacaptcha.zone.id](https://nexacaptcha.zone.id).

## Why it is harder to automate

- **Readable intervals:** every character receives a 300–600 ms clarity window while the other characters remain incomplete.
- **Stable skeletons:** the main character shape remains recognizable; only light contour decoration and local brightness change.
- **Independent smooth motion:** characters move, rotate, and scale without instant jumps.
- **Stack-resistant decoration:** nearby decoy strokes look decorative in one frame but accumulate into misleading legal-character structures across frames.
- **Slow color exchange:** colors transition gradually, so a solver cannot rely on one fixed color per character.
- **Stable reading order:** four lane markers preserve the original order even when adjacent paths briefly approach.

NexaCAPTCHA is designed to raise the cost of automated solving. It does not claim that automation is impossible.

The animation starts loading immediately. A verification remains open for two minutes after playback begins. The first two incorrect answers each start a ten-second input cooldown; a third incorrect answer ends the verification. Replacing a verification also starts immediately.

## Add it to your site

### 1. Paste this into your HTML

The Script loads NexaCAPTCHA. The Div chooses where it appears.

```html
<script src="https://nexacaptcha.zone.id/captcha.js" defer></script>

<div
  class="nexa-captcha"
  data-callback="onNexaComplete"
  data-alternative-url="/accessible-verification"
></div>
```

`data-alternative-url` is optional. When provided, it must be a same-origin route owned by the integrating site, such as a staffed support or account-recovery flow. NexaCAPTCHA does not provide a weaker built-in bypass. The widget highlights this route for people who prefer reduced motion.

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
| `responseToken` | A 64-character proof that it was completed. It works once. |

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

## Anonymous test records

NexaCAPTCHA keeps a bounded in-memory list of anonymous test records and writes the same records to server logs. Each record contains only the CAPTCHA version, completion or failure, successful attempt number, end-to-end duration, and an anonymous visual-parameter class. Verification IDs, IP addresses, submitted answers, and answer hashes are not included.

The current instance records can be read from `GET /api/test-results`. Restarting the single application instance clears the in-memory list.

## Repeatable attack benchmark

```sh
npm run benchmark
```

This writes deterministic PGM images and a manifest to `tmp/benchmark` for:

- representative single frames;
- all-frame pixel maximum;
- all-frame average;
- four quarter-timeline maximum composites;
- four palette-group color-tracking composites.

Run the same OCR engine and settings against every generated image, compare its four-character output with `groundTruth` in `manifest.json`, and report exact-match success per attack. Keep OCR model name, version, preprocessing, hardware, and timeout fixed between releases.

For human acceptance testing, recruit at least 20 people and have each complete 10 randomized attempts. Use the anonymous records to calculate first-attempt success and median end-to-end time. The release targets are at least 85% first-attempt human success, median human completion below 20 seconds, and less than 10% first-attempt exact-match success for each automated baseline.

The release budget is 0.25 vCPU, 200 MB RAM, and 10 GB storage. The current store supports one application instance. Restarting the service invalidates unfinished CAPTCHA sessions.

Read [SECURITY.md](SECURITY.md) before production use.

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE).
