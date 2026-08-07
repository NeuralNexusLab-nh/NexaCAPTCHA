import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ChallengeStore } from "../src/store.js";

describe("NexaCAPTCHA HTTP API", () => {
  let directory: string;
  let store: ChallengeStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "nexacaptcha-api-"));
    store = new ChallengeStore({
      answerFactory: () => "NEXA",
      renderer: () => Buffer.from("GIF89a", "ascii"),
      mediaDirectory: directory
    });
    await store.start();
    app = createApp(store);
  });

  afterEach(async () => {
    await store.stop();
    await rm(directory, { recursive: true, force: true });
  });

  it("runs the complete create, answer, and verify protocol", async () => {
    const created = await request(app).post("/api/v1/challenges").send({}).expect(201);
    expect(created.body.challengeId).toMatch(/^chl_[A-Za-z0-9_-]{22}$/);

    await request(app)
      .get(created.body.animationUrl)
      .expect("Content-Type", /image\/gif/)
      .expect("Cache-Control", /no-store/)
      .expect(200);

    const completed = await request(app)
      .post(`/api/v1/challenges/${created.body.challengeId}/answer`)
      .send({ answer: "NEXA" })
      .expect(200);
    expect(completed.body.success).toBe(true);

    const verification = {
      challengeId: created.body.challengeId,
      responseToken: completed.body.responseToken
    };
    await request(app)
      .post("/api/v1/siteverify")
      .send(verification)
      .expect(200)
      .expect(({ body }) => expect(body.success).toBe(true));
    await request(app)
      .post("/api/v1/siteverify")
      .send(verification)
      .expect(200)
      .expect(({ body }) => expect(body.success).toBe(false));
  });

  it("applies separate CSP and frame rules to the website and widget", async () => {
    const website = await request(app).get("/").expect(200);
    expect(website.headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(website.headers["x-frame-options"]).toBe("SAMEORIGIN");

    const widget = await request(app).get("/widget").expect(200);
    expect(widget.headers["content-security-policy"]).toContain("frame-ancestors *");
    expect(widget.headers["x-frame-options"]).toBeUndefined();
    expect(widget.headers["cross-origin-opener-policy"]).toBe("unsafe-none");
  });

  it("denies cross-origin browser API calls", async () => {
    await request(app)
      .post("/api/v1/challenges")
      .set("Origin", "https://attacker.example")
      .send({})
      .expect(403)
      .expect(({ body }) => {
        expect(body.errorCode).toBe("cross-origin-request-denied");
      });
  });

  it("handles a strict same-origin OPTIONS preflight", async () => {
    const response = await request(app)
      .options("/api/v1/challenges")
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
      .options("/api/v1/challenges")
      .set("Host", "nexacaptcha.zone.id")
      .set("Origin", "http://nexacaptcha.zone.id")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization")
      .expect(403);
  });

  it("rejects disallowed preflight methods", async () => {
    await request(app)
      .options("/api/v1/challenges")
      .set("Host", "nexacaptcha.zone.id")
      .set("Origin", "http://nexacaptcha.zone.id")
      .set("Access-Control-Request-Method", "DELETE")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(403);
  });

  it("rejects malformed and oversized inputs", async () => {
    await request(app)
      .post("/api/v1/siteverify")
      .send({ challengeId: "bad", responseToken: "bad" })
      .expect(400);
    await request(app)
      .post("/api/v1/challenges/not-real/answer")
      .send({ answer: "NEXA", extra: true })
      .expect(400);
    await request(app)
      .post("/api/v1/challenges")
      .send({ unexpected: true })
      .expect(400);
  });
});
