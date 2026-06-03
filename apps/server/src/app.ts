import { createContext } from "@mazing-bolao/api/context";
import { appRouter } from "@mazing-bolao/api/routers/index";
import { auth } from "@mazing-bolao/auth";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

const isAllowedOrigin = (origin: string) => {
  try {
    const { protocol, hostname } = new URL(origin);
    return ["http:", "https:"].includes(protocol) && ["localhost", "127.0.0.1", "::1", "[::1]", "192.168.15.11"].includes(hostname);
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
    const rpcResult = await rpcHandler.handle(req, res, {
      prefix: "/rpc",
      context: await createContext({ req }),
    });
    if (rpcResult.matched) return;

    const apiResult = await apiHandler.handle(req, res, {
      prefix: "/api-reference",
      context: await createContext({ req }),
    });
    if (apiResult.matched) return;

    next();
  });

  app.get("/", (_req, res) => {
    res.status(200).send("OK");
  });

  return app;
}
