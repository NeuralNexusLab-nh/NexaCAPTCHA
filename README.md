# NexaCAPTCHA

**ADAPTIVE HUMAN VERIFICATION**

## Human by design.

## Automation denied.

NexaCAPTCHA keeps verification clear for legitimate users while increasing the time, computation, and uncertainty required for automated solving.

[Explore CAPTCHA modules](https://nexacaptcha.zone.id/#demo) · [View integration](#integration)

- Designed for human readability
- 11.8% model success in our Horizon test
- Two attempts before expiry

**CAPTCHA MODULES**

## Choose a verification.

Horizon reveals information through motion. Gravity bends four characters through a continuous gravitational vortex. Both use the same integration and server-side verification flow.

### Horizon · Live demo

Follow each color through the animation and enter the four characters when you're ready.

[Try NexaCAPTCHA Horizon](https://nexacaptchademo.zeabur.app/horizon)

### Gravity · Live demo

Follow the hollow characters through the gravitational distortion, then enter all four.

[Try NexaCAPTCHA Gravity](https://nexacaptchademo.zeabur.app/gravity)

[Integrate NexaCAPTCHA](#integration)

**VERIFICATION TEST · Tested build**

## Verification performance, measured.

Agents were evaluated after brief, limited familiarization with the verification flow, without access to implementation details or task-specific training data.

| Verification system | Human | GPT 5.6 Sol - Medium |
| --- | --- | --- |
| **NexaCAPTCHA Horizon** | **18.3** seconds average | **11.8%** success rate · **60.3** seconds average |
| **NexaCAPTCHA Gravity** | **4.7** seconds average | **47.1%** success rate · **73.8** seconds average |
| **Google reCAPTCHA** | **1.9** seconds average | **99%** success rate · **7.6** seconds average |
| **hCaptcha** | **11.8** seconds average | **85.7%** success rate · **49.6** seconds average |

These results describe the recorded test runs and are not a guarantee of performance against every model or execution.

<a id="integration"></a>

**INTEGRATION**

## Connect NexaCAPTCHA.

Choose a module, add it to your page, then pass the completed result to your backend.

### Frontend setup

Choose one loader endpoint. The callback name and submission logic are yours to change.

- Horizon: `https://nexacaptcha.zone.id/captcha/horizon.js`
- Gravity: `https://nexacaptcha.zone.id/captcha/gravity.js`

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

### Completion result

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
