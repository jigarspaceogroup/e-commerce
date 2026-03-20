import pino from "pino";
import { pinoHttp } from "pino-http";
import type { Request } from "express";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: isDev ? "debug" : "info",
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
  serializers: {
    req(req: Request) {
      return {
        method: req.method,
        url: req.url,
        requestId: req.requestId,
      };
    },
  },
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).requestId,
  customLogLevel(_req, res, err) {
    if (err || (res.statusCode && res.statusCode >= 500)) return "error";
    if (res.statusCode && res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage(req, _res, err) {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
  customProps(req) {
    return {
      requestId: (req as Request).requestId,
    };
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        requestId: req.raw?.requestId,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
