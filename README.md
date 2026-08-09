# NexaCAPTCHA

**ADAPTIVE HUMAN VERIFICATION**

## Homo Sapiens? Welcome onboard!

## AI? Get out!

NexaCAPTCHA keeps verification clear for legitimate users while increasing the time, computation, and uncertainty required for automated solving.

[Open the demo](https://nexacaptchademo.zeabur.app/) · [View integration](#integrate-nexacaptcha)

- Designed for human readability
- 45.8% model success in our test
- Two attempts before expiry

**LIVE DEMO · Ready**

## Try NexaCAPTCHA

Follow each color through the animation. Enter the four characters when you're ready.

[Open the live demo](https://nexacaptchademo.zeabur.app/)

**HOW IT WORKS**

## Security that remains usable.

NexaCAPTCHA distributes visual information across time. People follow a clear sequence, while automated systems must reconstruct it from changing frames.

### No complete still image

The answer is revealed over time instead of being exposed in a single frame.

### Independent motion profiles

Each character moves and rotates on its own schedule, complicating frame-by-frame alignment.

### Stable visual anchors

Distinct colors help people track characters through motion without exposing the answer in metadata.

### Variable reveal path

The visible region changes direction and pace, reducing the value of fixed-window extraction.

### Per-verification rendering

Timing, distortion, placement, and masking are regenerated for every verification.

### Server-enforced controls

Retry limits, expiry, cooldowns, and one-time response tokens are enforced by the server.

**VERIFICATION TEST · Tested build**

## Verification performance, measured.

Recorded mean completion time and success rate for human participants and GPT 5.6 Sol - Medium across three verification systems.

| Verification system | Human | GPT 5.6 Sol - Medium |
| --- | --- | --- |
| **NexaCAPTCHA** | **15.3** seconds average | **45.8%** success rate · **49.4** seconds average |
| **Google reCAPTCHA** | **1.9** seconds average | **99%** success rate · **42.9** seconds average |
| **hCaptcha** | **11.8** seconds average | **83.7%** success rate · **48.3** seconds average |

These results describe the recorded test runs and are not a guarantee of performance against every model or execution.

**INTEGRATION**

## Integrate NexaCAPTCHA.

Add the client script and verify completed responses on your server. No frontend framework is required.

### 1. Add the client script.

Load NexaCAPTCHA and place the container where the verification should appear.

HTML · page markup:

```html
<script src="https://nexacaptcha.zone.id/captcha.js" defer></script>

<div class="nexa-captcha" data-callback="onNexaComplete"></div>
```

### 2. Submit the completed result.

Add this to your frontend JavaScript and replace `yourSubmitFunction` with your existing submission handler.

JavaScript · frontend:

```js
function onNexaComplete(result) {
  if (!result.success) return;

  yourSubmitFunction({
    verificationId: result.verificationId,
    responseToken: result.responseToken
  });
}
```

### Values returned to the frontend.

| Value | Meaning |
| --- | --- |
| `verificationId` | The ID of the completed CAPTCHA. |
| `responseToken` | One-time proof that verification was completed. |

**SERVER VALIDATION**

## Validate every response server-side.

Before accepting a form submission, registration, or login, send both values to NexaCAPTCHA.

`POST /api/siteverify`

### Request

```json
{
  "verificationId": "<verificationId>",
  "responseToken": "<responseToken>"
}
```

### Response · success

```json
{
  "success": true,
  "verifiedAt": "2026-08-07T12:30:00.000Z"
}
```

### Response · failure

```json
{
  "success": false,
  "errorCode": "invalid-or-expired-verification"
}
```

### Node.js · backend

```js
const response = await fetch(
  "https://nexacaptcha.zone.id/api/siteverify",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verificationId,
      responseToken
    })
  }
);

const result = await response.json();
if (!result.success) {
  return res.status(403).send("Verification failed");
}
```

> Continue only when the response says `success: true`. A `responseToken` works once and expires after five minutes.

---

Motion-based verification with server-enforced controls.

25.0330° N · 121.5654° E

Made by [NeuralNexusLab](https://nxlab.zone.id) · [nexacaptcha@nxlab.zone.id](mailto:nexacaptcha@nxlab.zone.id) · [NexaCAPTCHA](https://nexacaptcha.zone.id)
