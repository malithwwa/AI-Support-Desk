import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes/index.ts";
import prisma from "./db.ts";
import { auth, trustedOrigin } from "./lib/auth.ts";
import { toNodeHandler } from "better-auth/node";
import { requireAuth } from "./middleware/require-auth.ts";
import { requireAdmin } from "./middleware/require-admin.ts";
import { errorHandler } from "./middleware/error-handler.ts";

if (!process.env.BETTER_AUTH_SECRET){ throw new Error("BETETR_AUTH_SECRET enironment variable is not set")}

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(helmet());
app.use(cors({ origin: trustedOrigin, credentials: true }));

const isProduction = process.env.NODE_ENV === "production";

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: () => !isProduction,
});

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

app.get("/api/me", apiLimiter, requireAuth, (req,res)=> {
  const { id, name, email, role} = req.user
  res.json({user: {id, name, email, role}})
})

// Express 5 auto-catches rejected promises from async handlers to custom(if implemented)/ in-Built error handler
// No try/catch needed. 
app.get("/api/users", apiLimiter, requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  res.json({ users });
});

app.use("/api", router);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
