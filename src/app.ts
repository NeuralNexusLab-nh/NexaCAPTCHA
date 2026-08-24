import path from "node:path";
import compression from "compression";
import express, { type ErrorRequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { config } from "./config.js";
import { PublicError } from "./errors.js";
import {
  apiPreflight,
  sameOriginApi,
  websiteHeaders,
  widgetHeaders
} from "./security.js";
import { VerificationStore } from "./store.js";

const answerSchema = z
  .object({
    answer: z.string().min(1).max(12)
  })
  .strict();

const createVerificationSchema = z
  .object({
    captchaType: z.literal("gravity").optional()
  })
  .strict();

const verificationSchema = z
  .object({
    verificationId: z.string().regex(/^ver_[A-Za-z0-9_-]{12}$/),
    responseToken: z.string().regex(/^[A-Za-z0-9_-]{64}$/)
  })
  .strict();

function routeParameter(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function limiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      errorCode: "rate-limited",
      message: "Too many requests. Please retry later."
    }
  });
}

export function createApp(store: VerificationStore) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false
    })
  );
  app.use(compression({ threshold: 1024 }));

  app.get("/health/live", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json({ status: "ok" });
  });

  app.get("/health/ready", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json({ status: "ready", ...store.getStats() });
  });

  app.options(/^\/api\//, apiPreflight);
  app.use("/api", sameOriginApi);
  app.use("/api", express.json({ limit: "4kb", strict: true }));

  app.post(
    "/api/verifications",
    limiter(60_000, 120),
    async (_request, response, next) => {
      try {
        const input = createVerificationSchema.parse(_request.body);
        const verification = await store.create(input.captchaType ?? "gravity");
        response.setHeader("Cache-Control", "no-store");
        response.status(201).json(verification);
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/media/:mediaTicket",
    limiter(60_000, 120),
    async (request, response, next) => {
      try {
        const media = await store.claimMedia(routeParameter(request.params.mediaTicket));
        response.setHeader("Cache-Control", "no-store, max-age=0");
        response.setHeader("Content-Type", "image/png");
        response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        response.sendFile(media.mediaPath, (error) => {
          media.release();
          if (error) next(error);
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/audio/:audioTicket",
    limiter(60_000, 120),
    async (request, response, next) => {
      try {
        const audio = await store.claimAudio(routeParameter(request.params.audioTicket));
        response.setHeader("Cache-Control", "no-store, max-age=0");
        response.setHeader("Content-Type", "audio/mpeg");
        response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        response.sendFile(audio.audioPath, (error) => {
          audio.release();
          if (error) next(error);
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/verifications/:verificationId/status",
    limiter(60_000, 120),
    async (request, response, next) => {
      try {
        const expiresAt = await store.getPlaybackExpiry(
          routeParameter(request.params.verificationId)
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ expiresAt });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/verifications/:verificationId/answer",
    limiter(60_000, 120),
    async (request, response, next) => {
      try {
        const input = answerSchema.parse(request.body);
        const result = await store.submitAnswer(
          routeParameter(request.params.verificationId),
          input.answer
        );
        response.setHeader("Cache-Control", "no-store");
        response.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/siteverify",
    limiter(60_000, 120),
    async (request, response, next) => {
      try {
        const input = verificationSchema.parse(request.body);
        const result = await store.verify(input.verificationId, input.responseToken);
        response.setHeader("Cache-Control", "no-store");
        response.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.get("/captcha.js", widgetHeaders, (_request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Cache-Control", "public, max-age=300");
    response.sendFile(path.join(config.publicDirectory, "captcha.js"));
  });

  app.get("/captcha/gravity.js", widgetHeaders, (_request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Cache-Control", "public, max-age=300");
    response.sendFile(path.join(config.publicDirectory, "captcha.js"));
  });

  app.get("/widget", widgetHeaders, (_request, response) => {
    response.setHeader("Cache-Control", "public, max-age=300");
    response.sendFile(path.join(config.publicDirectory, "widget.html"));
  });

  app.use("/widget-assets", widgetHeaders, express.static(
    path.join(config.publicDirectory, "widget"),
    { fallthrough: false, maxAge: "5m" }
  ));

  app.use(
    "/vendor/fontawesome",
    websiteHeaders,
    express.static(path.resolve("node_modules", "@fortawesome", "fontawesome-free"), {
      fallthrough: false,
      maxAge: "1d"
    })
  );

  app.use(
    "/vendor/fonts/inter",
    websiteHeaders,
    express.static(path.resolve("node_modules", "@fontsource-variable", "inter"), {
      fallthrough: false,
      maxAge: "1d"
    })
  );

  app.use(
    "/vendor/fonts/space-grotesk",
    websiteHeaders,
    express.static(
      path.resolve("node_modules", "@fontsource-variable", "space-grotesk"),
      { fallthrough: false, maxAge: "1d" }
    )
  );

  app.use(
    "/vendor/fonts/oxanium",
    websiteHeaders,
    express.static(path.resolve("node_modules", "@fontsource-variable", "oxanium"), {
      fallthrough: false,
      maxAge: "1d"
    })
  );

  app.use(websiteHeaders);
  app.get(["/404", "/404.html"], (_request, response) => {
    response.status(404).sendFile(path.join(config.publicDirectory, "404.html"));
  });
  app.use(express.static(config.publicDirectory, { extensions: ["html"], maxAge: "5m" }));
  app.get("/", (_request, response) => {
    response.sendFile(path.join(config.publicDirectory, "index.html"));
  });

  app.use((request, response) => {
    const wantsWebsitePage =
      (request.method === "GET" || request.method === "HEAD") &&
      !request.path.startsWith("/api/") &&
      Boolean(request.accepts("html"));
    if (wantsWebsitePage) {
      response.status(404).sendFile(path.join(config.publicDirectory, "404.html"));
      return;
    }
    response.status(404).json({
      errorCode: "not-found",
      message: "The requested resource was not found."
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        errorCode: "invalid-request",
        message: "The request body is invalid."
      });
      return;
    }
    if (error instanceof PublicError) {
      response.status(error.statusCode).json({
        errorCode: error.code,
        message: error.message
      });
      return;
    }
    console.error("Unhandled request error", error);
    response.status(500).json({
      errorCode: "internal-error",
      message: "An unexpected error occurred."
    });
  };
  app.use(errorHandler);

  return app;
}
