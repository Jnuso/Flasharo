import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { verifyFirebaseToken, type Identity, type VerifyToken } from "./auth.js";
import { registerRoutes } from "./routes.js";
import { registerPublicRoutes } from "./public-routes.js";
import { syncProfile } from "./profile.js";

declare module "fastify" {
  interface FastifyRequest {
    identity: Identity;
  }
}

export async function createApp(options: { verifyToken?: VerifyToken } = {}) {
  const app = Fastify({ logger: true });
  const verifyToken = options.verifyToken ?? verifyFirebaseToken;

  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"],
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "Flasharo API", version: "0.1.0" },
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", { schema: { tags: ["system"], security: [] } }, async () => ({ ok: true }));
  app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger());
  registerPublicRoutes(app);

  await app.register(async (privateApp) => {
    privateApp.addHook("preHandler", async (request, reply) => {
      const header = request.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Sign in to continue." });
      }
      try {
        request.identity = await verifyToken(header.slice(7));
      } catch {
        return reply.code(401).send({ error: "Your session has expired. Sign in again." });
      }
      await syncProfile(request.identity);
    });
    registerRoutes(privateApp);
  }, { prefix: "/v1" });

  app.setErrorHandler((error, request, reply) => {
    if (error && typeof error === "object" && "validation" in error && error.validation) {
      return reply.code(400).send({ error: "Please check the information you entered." });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "Something went wrong. Please try again." });
  });

  return app;
}
