import express from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./routes/index.ts";
import usersRouter from "./routes/users.ts";
import prisma from "./db.ts";
import { auth, trustedOrigin } from "./lib/auth.ts";
import { toNodeHandler } from "better-auth/node";
import { apiLimiter } from "./middleware/rate-limit.ts";
import { errorHandler } from "./middleware/error-handler.ts";

if (!process.env.BETTER_AUTH_SECRET){ throw new Error("BETETR_AUTH_SECRET enironment variable is not set")}

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(helmet());
app.use(cors({ origin: trustedOrigin, credentials: true }));

// Registers a route handler in Express that listens to all HTTP methods (GET, POST, PUT, DELETE)
// toNodeHandler is a bridge adapter. It converts Express req/res objects into Web Standard Request/Response objects, hands them to Better Auth, and maps Better Auth's response back into Express.
app.all("/api/auth/*splat", apiLimiter, toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: "degraded", database: "unreachable" });
  }
});

app.use("/api", usersRouter);
app.use("/api", router);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});