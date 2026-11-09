const { AppError } = require("../lib/errors");
const config = require("../config");

function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // JSON body rusak
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "Body JSON tidak valid" },
    });
  }

  // Jangan bocorkan stack trace ke klien
  console.error("[error]", config.isProd ? err.message : err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" },
  });
}

module.exports = { notFoundHandler, errorHandler };
