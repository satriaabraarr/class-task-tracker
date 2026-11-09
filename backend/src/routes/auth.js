const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma");
const { parse } = require("../lib/validate");
const { registerSchema, loginSchema } = require("../lib/schemas");
const { conflict, unauthorized, validationError } = require("../lib/errors");
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} = require("../middleware/auth");

const router = express.Router();

const BCRYPT_COST = process.env.NODE_ENV === "test" ? 4 : 12;
// Hash tiruan agar waktu respons login tidak membedakan email terdaftar atau tidak
const DUMMY_HASH = bcrypt.hashSync("dummy-password-1", 4);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Batas percobaan GAGAL per IP per 15 menit (atur lewat LOGIN_MAX_ATTEMPTS di .env)
  limit: Number(process.env.LOGIN_MAX_ATTEMPTS) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.",
      },
    }),
});

async function loadProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      studentClass: { select: { id: true, name: true, classCode: true } },
      teaching: { select: { class: { select: { id: true, name: true, classCode: true } } } },
    },
  });
  const classes =
    user.role === "teacher"
      ? user.teaching.map((t) => t.class).sort((a, b) => a.name.localeCompare(b.name))
      : user.studentClass
        ? [user.studentClass]
        : [];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    classes,
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const input = parse(registerSchema, req.body ?? {});

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw conflict("Email sudah terdaftar", [{ field: "email", message: "Email sudah terdaftar" }]);
    }

    let studentClassId = null;
    let teacherClassIds = [];

    if (input.role === "student") {
      const cls = await prisma.class.findUnique({ where: { classCode: input.classCode } });
      if (!cls) {
        throw validationError([{ field: "classCode", message: "Kode kelas tidak ditemukan" }]);
      }
      studentClassId = cls.id;
    } else {
      const codes = [...new Set(input.classCodes)];
      const classes = await prisma.class.findMany({ where: { classCode: { in: codes } } });
      const found = new Set(classes.map((c) => c.classCode));
      const missing = codes.filter((c) => !found.has(c));
      if (missing.length) {
        throw validationError([
          { field: "classCodes", message: `Kode kelas tidak ditemukan: ${missing.join(", ")}` },
        ]);
      }
      teacherClassIds = classes.map((c) => c.id);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          classId: studentClassId,
          teaching: teacherClassIds.length
            ? { create: teacherClassIds.map((classId) => ({ classId })) }
            : undefined,
        },
        select: { id: true },
      });
    } catch (e) {
      if (e.code === "P2002") {
        throw conflict("Email sudah terdaftar", [{ field: "email", message: "Email sudah terdaftar" }]);
      }
      throw e;
    }

    const profile = await loadProfile(user.id);
    res.status(201).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const input = parse(loginSchema, req.body ?? {});
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, passwordHash: true, role: true },
    });

    const ok = await bcrypt.compare(input.password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) throw unauthorized("Email atau password salah");

    const token = signToken(user);
    setAuthCookie(res, token);
    const profile = await loadProfile(user.id);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, data: { message: "Berhasil keluar" } });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile = await loadProfile(req.user.id);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
