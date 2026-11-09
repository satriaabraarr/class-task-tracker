const { z } = require("zod");

const email = z
  .string({ required_error: "Email wajib diisi" })
  .trim()
  .toLowerCase()
  .min(1, "Email wajib diisi")
  .max(255, "Email terlalu panjang")
  .email("Format email tidak valid");

const password = z
  .string({ required_error: "Password wajib diisi" })
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Password harus mengandung huruf dan angka");

const classCode = z
  .string()
  .trim()
  .min(1, "Kode kelas wajib diisi")
  .max(30, "Kode kelas terlalu panjang")
  .transform((v) => v.toUpperCase());

const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Nama wajib diisi" })
      .trim()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter"),
    email,
    password,
    role: z.enum(["teacher", "student"], {
      errorMap: () => ({ message: "Peran harus guru atau siswa" }),
    }),
    // siswa: satu kode kelas; guru: satu atau lebih kode kelas
    classCode: classCode.optional(),
    classCodes: z.array(classCode).max(20).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "student" && !v.classCode) {
      ctx.addIssue({ code: "custom", path: ["classCode"], message: "Kode kelas wajib diisi" });
    }
    if (v.role === "teacher" && !(v.classCodes && v.classCodes.length)) {
      ctx.addIssue({
        code: "custom",
        path: ["classCodes"],
        message: "Minimal satu kode kelas yang diajar wajib diisi",
      });
    }
  });

const loginSchema = z.object({
  email,
  password: z.string({ required_error: "Password wajib diisi" }).min(1, "Password wajib diisi"),
});

const dueAt = z
  .string({ required_error: "Tenggat wajib diisi" })
  .min(1, "Tenggat wajib diisi")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Tenggat harus berupa tanggal/waktu valid")
  .transform((v) => new Date(v))
  .refine((d) => d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100, "Tenggat di luar rentang yang wajar");

const taskBase = {
  title: z
    .string({ required_error: "Judul wajib diisi" })
    .trim()
    .min(1, "Judul wajib diisi")
    .max(150, "Judul maksimal 150 karakter"),
  description: z
    .string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  dueAt,
  classId: z.string({ required_error: "Kelas wajib dipilih" }).uuid("Kelas tidak valid"),
};

const createTaskSchema = z.object(taskBase);

const updateTaskSchema = z
  .object({
    title: taskBase.title.optional(),
    description: taskBase.description,
    dueAt: dueAt.optional(),
    classId: taskBase.classId.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada field yang diubah" });

const listQuerySchema = z.object({
  q: z.string().trim().max(150).optional().default(""),
  status: z.enum(["all", "pending", "done"]).optional().default("all"),
  classId: z.string().uuid("Kelas tidak valid").optional(),
  page: z.coerce.number().int("Halaman harus bilangan bulat").min(1, "Halaman minimal 1").optional().default(1),
  limit: z.coerce.number().int().min(1, "Limit minimal 1").max(50, "Limit maksimal 50").optional().default(10),
});

const idParamSchema = z.object({ id: z.string().uuid("ID tidak valid") });

module.exports = {
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  listQuerySchema,
  idParamSchema,
};
