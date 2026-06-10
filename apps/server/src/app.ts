import { createContext } from "@mazing-bolao/api/context";
import { appRouter } from "@mazing-bolao/api/routers/index";
import { auth } from "@mazing-bolao/auth";
import { env } from "@mazing-bolao/env/server";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

const allowedOrigins = new Set(env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean));

const isAllowedOrigin = (origin: string) => {
  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => callback(null, origin ? isAllowedOrigin(origin) : true),
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  exposedHeaders: "*",
};

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    const origin = req.header("origin");

    if (origin && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
      res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers") ?? "Content-Type, Authorization");
      res.header("Access-Control-Expose-Headers", "*");
      res.header("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(cors(corsOptions));
  app.options("/{*path}", cors(corsOptions));

  app.all("/api/auth{/*path}", toNodeHandler(auth));

  const rpcHandler = new RPCHandler(appRouter, {
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  });

  const apiHandler = new OpenAPIHandler(appRouter, {
    plugins: [
      new OpenAPIReferencePlugin({
        schemaConverters: [new ZodToJsonSchemaConverter()],
      }),
    ],
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  });

  app.use(async (req, res, next) => {
    for (const prefix of ["/rpc", "/api/rpc"] as const) {
      const rpcResult = await rpcHandler.handle(req, res, {
        prefix,
        context: await createContext({ req }),
      });
      if (rpcResult.matched) return;
    }

    for (const prefix of ["/api-reference", "/api/api-reference"] as const) {
      const apiResult = await apiHandler.handle(req, res, {
        prefix,
        context: await createContext({ req }),
      });
      if (apiResult.matched) return;
    }

    next();
  });

  app.get("/", (_req, res) => {
    res.status(200).send("OK");
  });

  return app;
}
