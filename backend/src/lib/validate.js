const { validationError } = require("./errors");

/** Jalankan zod schema; lempar VALIDATION_ERROR dengan detail per field. */
function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((i) => ({
    field: i.path.join(".") || "_",
    message: i.message,
  }));
  throw validationError(details);
}

module.exports = { parse };
