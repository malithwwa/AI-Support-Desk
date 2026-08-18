import express from "express";
import cors from "cors";
import router from "./routes/index.ts";
import prisma from "./db.ts";
import { auth } from "./lib/auth.ts";
import { toNodeHandler } from "better-auth/node";
import { requireAuth } from "./middleware/require-auth.ts";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());

//Registers a route handler in Express that listens to all HTTP methods (GET, POST, PUT, DELETE)
//toNodeHandler is a bridge adapter. It converts Express req/res objects into Web Standard Request/Response objects, hands them to Better Auth, and maps Better Auth's response back into Express.
app.all("/api/auth/*splat", toNodeHandler(auth)); 

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

app.get("/api/me", requireAuth, (req,res)=> {
  res.json({user: req.user, session: req.session})
})

app.use("/api", router);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
