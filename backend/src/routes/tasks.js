const express = require("express");
const prisma = require("../lib/prisma");
const { parse } = require("../lib/validate");
const {
  createTaskSchema,
  updateTaskSchema,
  listQuerySchema,
  idParamSchema,
} = require("../lib/schemas");
const { forbidden, notFound, validationError } = require("../lib/errors");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

/** Daftar id kelas yang boleh diakses pengguna (diturunkan dari database, bukan dari klien). */
async function accessibleClassIds(user) {
  if (user.role === "teacher") {
    const rows = await prisma.teacherClass.findMany({
      where: { teacherId: user.id },
      select: { classId: true },
    });
    return rows.map((r) => r.classId);
  }
  return user.classId ? [user.classId] : [];
}

function taskInclude(user) {
  const base = {
    class: { select: { id: true, name: true, classCode: true } },
    creator: { select: { id: true, name: true } },
  };
  if (user.role === "student") {
    return { ...base, completions: { where: { studentId: user.id }, select: { completedAt: true } } };
  }
  return {
    ...base,
    _count: { select: { completions: { where: { completedAt: { not: null } } } } },
  };
}

async function serialize(task, user) {
  const out = {
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt,
    classId: task.classId,
    className: task.class.name,
    classCode: task.class.classCode,
    createdBy: task.creator.id,
    createdByName: task.creator.name,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
  if (user.role === "student") {
    const completedAt = task.completions?.[0]?.completedAt ?? null;
    out.completed = Boolean(completedAt);
    out.completedAt = completedAt;
  } else {
    const studentCount = await prisma.user.count({ where: { classId: task.classId } });
    out.completedCount = task._count.completions;
    out.studentCount = studentCount;
  }
  return out;
}

router.get("/", async (req, res, next) => {
  try {
    const query = parse(listQuerySchema, req.query);
    const classIds = await accessibleClassIds(req.user);

    if (query.classId && !classIds.includes(query.classId)) {
      throw forbidden("Anda tidak memiliki akses ke kelas ini");
    }

    const where = {
      classId: query.classId ? query.classId : { in: classIds },
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}),
    };

    if (req.user.role === "student" && query.status !== "all") {
      const done = { some: { studentId: req.user.id, completedAt: { not: null } } };
      where.completions = query.status === "done" ? done : { none: done.some };
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: taskInclude(req.user),
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    const data = await Promise.all(tasks.map((t) => serialize(t, req.user)));
    res.status(200).json({
      success: true,
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = parse(idParamSchema, req.params);
    const classIds = await accessibleClassIds(req.user);
    const task = await prisma.task.findFirst({
      where: { id, classId: { in: classIds } },
      include: taskInclude(req.user),
    });
    if (!task) throw notFound("Tugas tidak ditemukan");
    res.status(200).json({ success: true, data: await serialize(task, req.user) });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRole("teacher"), async (req, res, next) => {
  try {
    const input = parse(createTaskSchema, req.body ?? {});
    const classIds = await accessibleClassIds(req.user);
    if (!classIds.includes(input.classId)) {
      throw forbidden("Anda tidak berwenang mengelola tugas pada kelas ini");
    }

    const created = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        dueAt: input.dueAt,
        classId: input.classId,
        createdBy: req.user.id,
      },
      include: taskInclude(req.user),
    });
    res.status(201).json({ success: true, data: await serialize(created, req.user) });
  } catch (err) {
    next(err);
  }
});

async function loadManagedTask(id, user) {
  const task = await prisma.task.findUnique({ where: { id }, select: { id: true, classId: true } });
  if (!task) throw notFound("Tugas tidak ditemukan");
  const classIds = await accessibleClassIds(user);
  if (!classIds.includes(task.classId)) {
    throw forbidden("Anda tidak berwenang mengelola tugas ini");
  }
  return { task, classIds };
}

router.patch("/:id", requireRole("teacher"), async (req, res, next) => {
  try {
    const { id } = parse(idParamSchema, req.params);
    const input = parse(updateTaskSchema, req.body ?? {});
    const { classIds } = await loadManagedTask(id, req.user);

    if (input.classId && !classIds.includes(input.classId)) {
      throw forbidden("Anda tidak berwenang memindahkan tugas ke kelas ini");
    }
    if (Object.prototype.hasOwnProperty.call(input, "title") && !input.title) {
      throw validationError([{ field: "title", message: "Judul wajib diisi" }]);
    }

    const updated = await prisma.task.update({
      where: { id },
      data: input,
      include: taskInclude(req.user),
    });
    res.status(200).json({ success: true, data: await serialize(updated, req.user) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireRole("teacher"), async (req, res, next) => {
  try {
    const { id } = parse(idParamSchema, req.params);
    await loadManagedTask(id, req.user);
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Siswa menandai tugas miliknya selesai. Idempotent: panggilan ulang tidak membuat data ganda.
router.put("/:id/completion", requireRole("student"), async (req, res, next) => {
  try {
    const { id } = parse(idParamSchema, req.params);
    const task = await prisma.task.findFirst({
      where: { id, classId: req.user.classId ?? "00000000-0000-0000-0000-000000000000" },
      select: { id: true },
    });
    if (!task) throw notFound("Tugas tidak ditemukan");

    const key = { taskId_studentId: { taskId: id, studentId: req.user.id } };
    let record = await prisma.taskCompletion.findUnique({ where: key });
    if (!record || !record.completedAt) {
      const now = new Date();
      record = await prisma.taskCompletion.upsert({
        where: key,
        create: { taskId: id, studentId: req.user.id, completedAt: now },
        update: { completedAt: now },
      });
    }

    res.status(200).json({
      success: true,
      data: { taskId: id, completed: true, completedAt: record.completedAt },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
