/**
 * Integration test. Membutuhkan database yang sudah dimigrasi dan di-seed:
 *   npm run db:deploy && npm run db:seed && npm test
 */
process.env.NODE_ENV = "test";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

const PASSWORD = "Password123";
const agent = () => request.agent(app);

async function login(email) {
  const a = agent();
  const res = await a.post("/api/auth/login").send({ email, password: PASSWORD });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return a;
}

let classA;
let classB;
const createdEmails = [];

before(async () => {
  classA = await prisma.class.findUnique({ where: { classCode: "KELAS-7A" } });
  classB = await prisma.class.findUnique({ where: { classCode: "KELAS-7B" } });
  assert.ok(classA && classB, "Jalankan seeder dulu (npm run db:seed)");
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  await prisma.$disconnect();
});

test("registrasi: validasi dan email duplikat", async () => {
  const bad = await request(app).post("/api/auth/register").send({ name: "A", email: "x", password: "1", role: "student" });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, "VALIDATION_ERROR");
  assert.ok(bad.body.error.details.length >= 3);

  const email = `uji-${Date.now()}@example.com`;
  createdEmails.push(email);
  const ok = await request(app)
    .post("/api/auth/register")
    .send({ name: "Siswa Uji", email, password: PASSWORD, role: "student", classCode: "kelas-7a" });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.passwordHash, undefined);
  assert.equal(ok.body.data.classes[0].classCode, "KELAS-7A");

  const row = await prisma.user.findUnique({ where: { email } });
  assert.notEqual(row.passwordHash, PASSWORD);
  assert.match(row.passwordHash, /^\$2[aby]\$/);

  const dup = await request(app)
    .post("/api/auth/register")
    .send({ name: "Siswa Uji", email, password: PASSWORD, role: "student", classCode: "KELAS-7A" });
  assert.equal(dup.status, 409);
});

test("auth: tanpa sesi ditolak 401, login salah 401", async () => {
  assert.equal((await request(app).get("/api/tasks")).status, 401);
  assert.equal((await request(app).get("/api/auth/me")).status, 401);
  const res = await request(app).post("/api/auth/login").send({ email: "siswa1@example.com", password: "SalahTotal1" });
  assert.equal(res.status, 401);
});

test("siswa tidak boleh POST/PATCH/DELETE tugas (403)", async () => {
  const s = await login("siswa1@example.com");
  const list = await s.get("/api/tasks");
  const id = list.body.data[0].id;

  const post = await s.post("/api/tasks").send({ title: "x", dueAt: new Date().toISOString(), classId: classA.id });
  assert.equal(post.status, 403);
  assert.equal((await s.patch(`/api/tasks/${id}`).send({ title: "baru" })).status, 403);
  assert.equal((await s.delete(`/api/tasks/${id}`)).status, 403);
});

test("siswa hanya melihat tugas kelasnya", async () => {
  const s = await login("siswa1@example.com");
  const res = await s.get("/api/tasks?limit=50");
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.every((t) => t.classId === classA.id));

  const other = await prisma.task.findFirst({ where: { classId: classB.id } });
  assert.equal((await s.get(`/api/tasks/${other.id}`)).status, 404);
  assert.equal((await s.put(`/api/tasks/${other.id}/completion`)).status, 404);
  assert.equal((await s.get(`/api/tasks?classId=${classB.id}`)).status, 403);
});

test("guru: CRUD tugas dan validasi", async () => {
  const t = await login("guru@example.com");

  const invalid = await t.post("/api/tasks").send({ title: "  ", dueAt: "bukan-tanggal", classId: "abc" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");

  const created = await t
    .post("/api/tasks")
    .send({ title: "Tugas Uji CRUD", description: "", dueAt: new Date(Date.now() + 86400000).toISOString(), classId: classA.id });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.description, null);
  const id = created.body.data.id;

  const upd = await t.patch(`/api/tasks/${id}`).send({ title: "Tugas Uji Diubah" });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.title, "Tugas Uji Diubah");

  const s = await login("siswa1@example.com");
  const seen = await s.get("/api/tasks?q=tugas uji diubah");
  assert.equal(seen.body.data.length, 1);

  assert.equal((await t.delete(`/api/tasks/${id}`)).status, 204);
  assert.equal((await t.get(`/api/tasks/${id}`)).status, 404);
  const gone = await s.get("/api/tasks?q=tugas uji diubah");
  assert.equal(gone.body.data.length, 0);
});

test("penyelesaian idempotent + filter status + paginasi", async () => {
  const s = await login("siswa2@example.com");
  const all = await s.get("/api/tasks?limit=50");
  const target = all.body.data[1];
  assert.equal(target.completed, false);

  const r1 = await s.put(`/api/tasks/${target.id}/completion`);
  const r2 = await s.put(`/api/tasks/${target.id}/completion`);
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r1.body.data.completedAt, r2.body.data.completedAt);
  assert.equal(await prisma.taskCompletion.count({ where: { taskId: target.id, student: { email: "siswa2@example.com" } } }), 1);

  const done = await s.get("/api/tasks?status=done&limit=50");
  const pending = await s.get("/api/tasks?status=pending&limit=50");
  assert.ok(done.body.data.every((t) => t.completed));
  assert.ok(pending.body.data.every((t) => !t.completed));
  assert.equal(done.body.meta.total + pending.body.meta.total, all.body.meta.total);

  const p1 = await s.get("/api/tasks?limit=2&page=1");
  const p2 = await s.get("/api/tasks?limit=2&page=2");
  assert.equal(p1.body.data.length, 2);
  assert.notEqual(p1.body.data[0].id, p2.body.data[0].id);
  assert.equal(p1.body.meta.limit, 2);

  const combo = await s.get("/api/tasks?q=LAPORAN&status=pending");
  assert.ok(combo.body.data.every((t) => /laporan/i.test(t.title) && !t.completed));

  assert.equal((await s.get("/api/tasks?limit=1000")).status, 400);

  // Guru tidak boleh menandai selesai
  const t = await login("guru@example.com");
  assert.equal((await t.put(`/api/tasks/${target.id}/completion`)).status, 403);
});

test("logout menghapus sesi", async () => {
  const s = await login("siswa1@example.com");
  assert.equal((await s.post("/api/auth/logout")).status, 200);
  assert.equal((await s.get("/api/auth/me")).status, 401);
});
