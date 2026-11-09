const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./config");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const { notFoundHandler, errorHandler } = require("./middleware/error");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Proteksi CSRF tambahan: tolak request pengubah data dari origin yang tidak dikenal.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Origin tidak diizinkan" },
    });
  }
  next();
});

app.get("/api/health", (_req, res) => res.status(200).json({ success: true, data: { status: "ok" } }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
