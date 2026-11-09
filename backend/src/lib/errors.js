class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message = "Permintaan tidak valid", details) =>
  new AppError(400, "BAD_REQUEST", message, details);
const unauthorized = (message = "Anda belum login") =>
  new AppError(401, "UNAUTHORIZED", message);
const forbidden = (message = "Anda tidak memiliki izin untuk aksi ini") =>
  new AppError(403, "FORBIDDEN", message);
const notFound = (message = "Data tidak ditemukan") =>
  new AppError(404, "NOT_FOUND", message);
const conflict = (message = "Data sudah ada", details) =>
  new AppError(409, "CONFLICT", message, details);
const validationError = (details) =>
  new AppError(400, "VALIDATION_ERROR", "Input tidak valid", details);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
};
