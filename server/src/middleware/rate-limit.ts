import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: () => process.env.NODE_ENV !== "production",
});