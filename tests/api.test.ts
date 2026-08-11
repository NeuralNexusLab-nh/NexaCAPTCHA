import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { VerificationStore } from "../src/store.js";

describe("NexaCAPTCHA HTTP API", () => {
  let directory: string;
  let store: VerificationStore;
  let app: ReturnType<typeof createApp>;
  let now: number;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "nexacaptcha-api-"));
    now = 1_700_000_000_000;
    store = new VerificationStore({
      answerFactory: () => "NEXA",
      renderer: () => Buffer.from("GIF89a", "ascii"),
      gravityAnswerFactory: () => "GRAV",
      gravityRenderer: () => Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      mediaDirectory: directory,
      clock: () => now
    });
    await store.start();
    app = createApp(store);
  });

  afterEach(async () => {
    await store.stop();
    await rm(directory, { recursive: true, force: true });
  });

  it("runs the complete create, answer, and verify protocol", async () => {
    const created = await request(app).post("/api/verifications").send({}).expect(201);
    expect(created.body.verificationId).toMatch(/^ver_[A-Za-z0-9_-]{12}$/);
    expect(created.body.verificationId).toHaveLength(16);
    expect(created.body.expiresInMs).toBe(120_000);

    await request(app)
      .get(created.body.animationUrl)
      .expect("Content-Type", /image\/gif/)
      .expect("Cache-Control", /no-store/)
      .expect(200);

    await request(app)
      .get(`/api/verifications/${created.body.verificationId}/status`)
      .expect("Cache-Control", /no-store/)
      .expect(200)
      .expect(({ body }) => expect(Number.isNaN(Date.parse(body.expiresAt))).toBe(false));

    const completed = await request(app)
      .post(`/api/verifications/${created.body.verificationId}/answer`)
      .send({ answer: "NEXA" })
      .expect(200);
    expect(completed.body.success).toBe(true);
    expect(completed.body.responseToken).toMatch(/^[A-Za-z0-9_-]{64}$/);

    const verification = {
      verificationId: created.body.verificationId,
      responseToken: completed.body.responseToken
    };
    await request(app)
      .post("/api/siteverify")
      .send(verification)
      .expect(200)
      .expect(({ body }) => expect(body.success).toBe(true));
    await request(app)
      .post("/api/siteverify")
      .send(verification)
      .expect(200)
      .expect(({ body }) => expect(body.success).toBe(false));
  });

  it("serves Gravity as a PNG with the same answer and siteverify protocol", async () => {
    const created = await request(app)
      .post("/api/verifications")
      .send({ captchaType: "gravity" })
      .expect(201);
    expect(created.body.captchaType).toBe("gravity");
    expect(created.body.imageUrl).toContain("/image");
    expect(created.body.animationUrl).toBeUndefined();

    await request(app)
      .get(created.body.imageUrl)
      .expect("Content-Type", /image\/png/)
      .expect("Cache-Control", /no-store/)
      .expect(200);
    await request(app)
      .get(`/api/verifications/${created.body.verificationId}/animation`)
      .expect(404);

    const completed = await request(app)
      .post(`/api/verifications/${created.body.verificationId}/answer`)
      .send({ answer: "GRAV" })
      .expect(200);
    await request(app)
      .post("/api/siteverify")
      .send({
        verificationId: created.body.verificationId,
        responseToken: completed.body.responseToken
      })
      .expect(200)
      .expect(({ body }) => expect(body.success).toBe(true));
  });

  it("applies separate CSP and frame rules to the website and widget", async () => {
    const website = await request(app).get("/").expect(200);
    expect(website.headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(website.headers["x-frame-options"]).toBe("SAMEORIGIN");

    const widget = await request(app).get("/widget").expect(200);
    expect(widget.headers["content-security-policy"]).toContain("frame-ancestors *");
    expect(widget.headers["content-security-policy"]).toContain("img-src 'self' data:");
    expect(widget.headers["x-frame-options"]).toBeUndefined();
    expect(widget.headers["cross-origin-opener-policy"]).toBe("unsafe-none");
  });

  it("enforces cooldown, attempt exhaustion, and expiry through the API", async () => {
    const created = await request(app).post("/api/verifications").send({}).expect(201);
    const answerUrl = `/api/verifications/${created.body.verificationId}/answer`;
    await request(app).get(created.body.animationUrl).expect(200);

    await request(app)
      .post(answerUrl)
      .send({ answer: "WRNG" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.attemptsRemaining).toBe(1);
        expect(body.retryAfterSeconds).toBe(20);
      });

    await request(app)
      .post(answerUrl)
      .send({ answer: "NEXA" })
      .expect(429)
      .expect(({ body }) => expect(body.errorCode).toBe("answer-cooldown"));

    now += 20_000;
    await request(app)
      .post(answerUrl)
      .send({ answer: "WRNG" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("verification_failed");
        expect(body.attemptsRemaining).toBe(0);
      });

    await request(app)
      .post(answerUrl)
      .send({ answer: "NEXA" })
      .expect(410)
      .expect(({ body }) => expect(body.errorCode).toBe("verification-expired"));

    const expiring = await request(app).post("/api/verifications").send({}).expect(201);
    await request(app).get(expiring.body.animationUrl).expect(200);
    now += 120_001;
    await request(app)
      .post(`/api/verifications/${expiring.body.verificationId}/answer`)
      .send({ answer: "NEXA" })
      .expect(410)
      .expect(({ body }) => expect(body.errorCode).toBe("verification-expired"));
  });

  it("serves the Horizon loader and its compatibility alias", async () => {
    await request(app)
      .get("/captcha/horizon.js")
      .expect("Access-Control-Allow-Origin", "*")
      .expect("Content-Type", /javascript/)
      .expect(200);
    await request(app)
      .get("/captcha.js")
      .expect("Access-Control-Allow-Origin", "*")
      .expect("Content-Type", /javascript/)
      .expect(200);
    await request(app).get("/captcha/phobetor.js").expect(404);
    await request(app).get("/captcha/warp.js").expect(404);
    await request(app)
      .get("/captcha/gravity.js")
      .expect("Access-Control-Allow-Origin", "*")
      .expect("Content-Type", /javascript/)
      .expect(200);
  });

  it("serves dedicated Horizon and Gravity demo pages", async () => {
    await request(app)
      .get("/horizon")
      .expect("Content-Type", /html/)
      .expect(200)
      .expect(({ text }) => expect(text).toContain("/captcha/horizon.js"));
    await request(app)
      .get("/gravity")
      .expect("Content-Type", /html/)
      .expect(200)
      .expect(({ text }) => expect(text).toContain("/captcha/gravity.js"));
  });

  it("denies cross-origin browser API calls", async () => {
    await request(app)
      .post("/api/verifications")
      .set("Origin", "https://attacker.example")
      .send({})
      .expect(403)
      .expect(({ body }) => {
        expect(body.errorCode).toBe("cross-origin-request-denied");
      });
  });

  it("handles a strict same-origin OPTIONS preflight", async () => {
    const response = await request(app)
      .options("/api/verifications")
      .set("Host", "nexacaptcha.zone.id")
      .set("Origin", "http://nexacaptcha.zone.id")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://nexacaptcha.zone.id"
    );
    expect(response.headers["access-control-allow-methods"]).toBe("GET, POST, OPTIONS");
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("rejects disallowed preflight headers", async () => {
    await request(app)
      .options("/api/verifications")
      .set("Host", "nexacaptcha.zone.id")
      .set("Origin", "http://nexacaptcha.zone.id")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization")
      .expect(403);
  });

  it("rejects disallowed preflight methods", async () => {
    await request(app)
      .options("/api/verifications")
      .set("Host", "nexacaptcha.zone.id")
      .set("Origin", "http://nexacaptcha.zone.id")
      .set("Access-Control-Request-Method", "DELETE")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(403);
  });

  it("rejects malformed and oversized inputs", async () => {
    await request(app)
      .post("/api/siteverify")
      .send({ verificationId: "bad", responseToken: "bad" })
      .expect(400);
    await request(app)
      .post("/api/verifications/not-real/answer")
      .send({ answer: "NEXA", extra: true })
      .expect(400);
    await request(app)
      .post("/api/verifications")
      .send({ unexpected: true })
      .expect(400);
  });
});
