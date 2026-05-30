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
import { z } from "zod";

const registerUserBodySchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

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

  app.use(express.json());

  app.post("/api/users/register", async (req, res) => {
    const parsedBody = registerUserBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Invalid request body",
        issues: parsedBody.error.issues,
      });
    }

    try {
      const result = await auth.api.signUpEmail({
        body: parsedBody.data,
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error(error);

      return res.status(400).json({
        error: "Unable to register user",
      });
    }
  });

  app.get("/", (_req, res) => {
    res.status(200).send("OK");
  });

  return app;
}
