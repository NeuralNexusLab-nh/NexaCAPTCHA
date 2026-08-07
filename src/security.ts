import type { NextFunction, Request, Response } from "express";

const WEBSITE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "manifest-src 'self'"
].join("; ");

const WIDGET_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors *",
  "form-action 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'"
].join("; ");

export function websiteHeaders(
  _request: Request,
  response: Response,
  next: NextFunction
): void {
  response.setHeader("Content-Security-Policy", WEBSITE_CSP);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
}

export function widgetHeaders(
  _request: Request,
  response: Response,
  next: NextFunction
): void {
  response.setHeader("Content-Security-Policy", WIDGET_CSP);
  response.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  response.removeHeader("X-Frame-Options");
  next();
}

function effectiveOrigin(request: Request): string | null {
  const host = request.get("host");
  if (!host) return null;
  const forwardedProtocol = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
    ? forwardedProtocol
    : request.protocol;
  return `${protocol}://${host}`;
}

export function sameOriginApi(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const origin = request.get("origin");
  if (!origin) {
    next();
    return;
  }

  const expectedOrigin = effectiveOrigin(request);
  if (!expectedOrigin || origin !== expectedOrigin) {
    response.status(403).json({
      errorCode: "cross-origin-request-denied",
      message: "Browser API requests must originate from NexaCAPTCHA."
    });
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  next();
}

export function apiPreflight(request: Request, response: Response): void {
  const origin = request.get("origin");
  const expectedOrigin = effectiveOrigin(request);
  if (!origin || !expectedOrigin || origin !== expectedOrigin) {
    response.status(403).end();
    return;
  }

  const requestedMethod = request.get("access-control-request-method")?.toUpperCase();
  if (requestedMethod !== "GET" && requestedMethod !== "POST") {
    response.status(403).end();
    return;
  }

  const requestedHeaders = request
    .get("access-control-request-headers")
    ?.split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean) ?? [];
  const allowedHeaders = new Set(["content-type"]);
  if (requestedHeaders.some((header) => !allowedHeaders.has(header))) {
    response.status(403).end();
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Max-Age", "600");
  response.setHeader("Vary", "Origin, Access-Control-Request-Headers");
  response.status(204).end();
}
