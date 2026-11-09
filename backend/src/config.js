require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  if (isProd) {
    throw new Error("JWT_SECRET wajib diisi (minimal 16 karakter) di production");
  }
  console.warn("[config] JWT_SECRET belum diatur dengan benar, memakai nilai development.");
}

module.exports = {
  isProd,
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me-please",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  cookieName: "ctt_token",
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
};
