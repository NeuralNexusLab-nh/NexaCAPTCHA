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
      gravityAnswerFactory: () => "GRAV",
      gravityRenderer: () => Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      algebraProblemFactory: () => ({
        answerX: -12,
        answerY: 34,
        equations: ["2(x+y)=44", "3(x-y)=-138"]
      }),
      algebraRenderer: () => Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      dataDirectory: directory,
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
      .get(created.body.imageUrl)
      .expect("Content-Type", /image\/png/)
      .expect("Cache-Control", /no-store/)
      .expect(200);
    await request(app)
      .get(created.body.imageUrl)
      .expect(410)
      .expect(({ body }) => expect(body.errorCode).toBe("media-consumed"));

    await request(app)
      .get(`/api/verifications/${created.body.verificationId}/status`)
      .expect("Cache-Control", /no-store/)
      .expect(200)
      .expect(({ body }) => expect(Number.isNaN(Date.parse(body.expiresAt))).toBe(false));

    const completed = await request(app)
      .post(`/api/verifications/${created.body.verificationId}/answer`)
      .send({ answer: "GRAV" })
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

  it("serves Gravity explicitly with the same answer and siteverify protocol", async () => {
    const created = await request(app)
      .post("/api/verifications")
      .send({ captchaType: "gravity" })
      .expect(201);
    expect(created.body.captchaType).toBe("gravity");
    expect(created.body.imageUrl).toContain("/api/media/");

    await request(app)
      .get(created.body.imageUrl)
      .expect("Content-Type", /image\/png/)
      .expect("Cache-Control", /no-store/)
      .expect(200);
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

  it("creates Algebra through its own endpoint and reuses answer and siteverify", async () => {
    const created = await request(app)
      .post("/api/algebra/verifications")
      .send({})
      .expect(201);
    expect(created.body.captchaType).toBe("algebra");
    await request(app).get(created.body.imageUrl).expect("Content-Type", /image\/png/).expect(200);
    const completed = await request(app)
      .post(`/api/verifications/${created.body.verificationId}/answer`)
      .send({ answer: "-12,34" })
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

  it("serves a localized HTML 404 page without changing API errors", async () => {
    const page = await request(app)
      .get("/route-that-does-not-exist")
      .set("Accept", "text/html")
      .expect("Content-Type", /html/)
      .expect(404);
    expect(page.text).toContain("This route ends here.");
    expect(page.text).toContain('value="zh-Hant"');
    expect(page.text).toContain('value="ja"');

    await request(app)
      .get("/api/route-that-does-not-exist")
      .set("Accept", "text/html")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect(({ body }) => expect(body.errorCode).toBe("not-found"));
  });

  it("enforces cooldown, attempt exhaustion, and expiry through the API", async () => {
    const created = await request(app).post("/api/verifications").send({}).expect(201);
    const answerUrl = `/api/verifications/${created.body.verificationId}/answer`;
    await request(app).get(created.body.imageUrl).expect(200);

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
      .send({ answer: "GRAV" })
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
      .send({ answer: "GRAV" })
      .expect(410)
      .expect(({ body }) => expect(body.errorCode).toBe("verification-expired"));

    const expiring = await request(app).post("/api/verifications").send({}).expect(201);
    await request(app).get(expiring.body.imageUrl).expect(200);
    now += 120_001;
    await request(app)
      .post(`/api/verifications/${expiring.body.verificationId}/answer`)
      .send({ answer: "GRAV" })
      .expect(410)
      .expect(({ body }) => expect(body.errorCode).toBe("verification-expired"));
  });

  it("serves the Gravity loader and its compatibility alias", async () => {
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
    await request(app)
      .get("/captcha/algebra.js")
      .expect("Access-Control-Allow-Origin", "*")
      .expect("Content-Type", /javascript/)
      .expect(200);
    await request(app).get("/captcha/parallax.js").expect(404);
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
      .set("Host", "nexacaptcha.nxlabtw.com")
      .set("Origin", "http://nexacaptcha.nxlabtw.com")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://nexacaptcha.nxlabtw.com"
    );
    expect(response.headers["access-control-allow-methods"]).toBe("GET, POST, OPTIONS");
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("rejects disallowed preflight headers", async () => {
    await request(app)
      .options("/api/verifications")
      .set("Host", "nexacaptcha.nxlabtw.com")
      .set("Origin", "http://nexacaptcha.nxlabtw.com")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization")
      .expect(403);
  });

  it("rejects disallowed preflight methods", async () => {
    await request(app)
      .options("/api/verifications")
      .set("Host", "nexacaptcha.nxlabtw.com")
      .set("Origin", "http://nexacaptcha.nxlabtw.com")
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
      .send({ answer: "GRAV", extra: true })
      .expect(400);
    await request(app)
      .post("/api/verifications")
      .send({ unexpected: true })
      .expect(400);
  });

  it("allows 120 verification creations per IP each minute", async () => {
    for (let index = 0; index < 120; index += 1) {
      await request(app).post("/api/verifications").send({}).expect(201);
    }
    await request(app)
      .post("/api/verifications")
      .send({})
      .expect(429)
      .expect(({ body }) => expect(body.errorCode).toBe("rate-limited"));
  });
});
