# NexaCAPTCHA

**ADAPTIVE HUMAN VERIFICATION**

## Human by design.

## Automation denied.

NexaCAPTCHA keeps verification clear for legitimate users while increasing the time, computation, and uncertainty required for automated solving.

[Explore CAPTCHA modules](https://nexacaptcha.zone.id/#demo) · [View callback integration](#callback)

- Designed for human readability
- 11.8% model success in our test
- Two attempts before expiry

**CAPTCHA MODULES**

## Choose a verification.

Horizon reveals information through motion. Warp bends four characters into a static image. Both use the same callback and server-side verification flow.

### Horizon · Live demo

Follow each color through the animation and enter the four characters when you're ready.

[Try NexaCAPTCHA Horizon](https://nexacaptcha.zone.id/#demo)

### Add this HTML to your page.

```html
<script
  src="https://nexacaptcha.zone.id/captcha/horizon.js"
  defer
></script>

<div
  class="nexa-captcha"
  data-callback="onCaptchaComplete"
></div>
```

`/captcha.js` currently loads Horizon too. It remains available as the compatibility URL for existing integrations.

### Warp · Live demo

Read the four distorted characters in the image, then enter them below.

[Try NexaCAPTCHA Warp](https://nexacaptcha.zone.id/#demo)

### Add Warp to your page.

```html
<script
  src="https://nexacaptcha.zone.id/captcha/warp.js"
  defer
></script>

<div
  class="nexa-captcha"
  data-callback="onCaptchaComplete"
></div>
```

Warp uses the same callback result and server-side verification flow as Horizon.

**VERIFICATION TEST · Tested build**

## Verification performance, measured.

Agent results were measured on first exposure, without prior examples, conversation history, or CAPTCHA-specific guidance.

| Verification system | Human | GPT 5.6 Sol - Medium |
| --- | --- | --- |
| **NexaCAPTCHA Horizon** | **18.3** seconds average | **11.8%** success rate · **60.3** seconds average |
| **NexaCAPTCHA Warp** | **0.0** seconds average | **0.0%** success rate · **0.0** seconds average |
| **Google reCAPTCHA** | **1.9** seconds average | **99%** success rate · **7.6** seconds average |
| **hCaptcha** | **11.8** seconds average | **85.7%** success rate · **49.6** seconds average |

These results describe the recorded test runs and are not a guarantee of performance against every model or execution.

<a id="callback"></a>

**CALLBACK**

## Use the completed result.

Every NexaCAPTCHA module uses the same callback result. Send the returned ID and token to your backend with the form being protected.

### Example callback

This is only an example. You may rename `onCaptchaComplete` and change its submission logic. Set `data-callback` in the HTML to the same function name you choose.

```html
<script
  src="https://nexacaptcha.zone.id/captcha/horizon.js"
  defer
></script>

<div
  class="nexa-captcha"
  data-callback="onCaptchaComplete"
></div>
```

The callback name is yours to choose. Use exactly the same name in `data-callback` and your frontend JavaScript.

JavaScript · frontend:

```js
function onCaptchaComplete(result) {
  if (!result.success) return;

  yourSubmitFunction({
    verificationId: result.verificationId,
    responseToken: result.responseToken
  });
}
```

The callback is a frontend handoff, not final proof. Accept the form only after `/api/siteverify` returns `success: true`.

### Callback parameters

| Value | Meaning |
| --- | --- |
| `result` | The object passed into your callback function. |
| `result.success` | A boolean. It is `true` when the verification has been completed. |
| `result.verificationId` | The 16-character verification ID. Send it to your backend. |
| `result.responseToken` | The 64-character one-time token. Send it to your backend without changing it. |

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
