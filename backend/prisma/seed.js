/**
 * Seeder DEVELOPMENT/TESTING saja. Aman dijalankan ulang (upsert + bersihkan data contoh).
 * Jangan gunakan kredensial ini di produksi.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PASSWORD = "Password123";

const day = 24 * 60 * 60 * 1000;
const inDays = (n, hour = 23) => {
  const d = new Date(Date.now() + n * day);
  d.setHours(hour, 59, 0, 0);
  return d;
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seeder tidak boleh dijalankan di production");
  }

  const hash = await bcrypt.hash(PASSWORD, 10);

  const kelas7a = await prisma.class.upsert({
    where: { classCode: "KELAS-7A" },
    update: { name: "Kelas 7A" },
    create: { name: "Kelas 7A", classCode: "KELAS-7A" },
  });
  const kelas7b = await prisma.class.upsert({
    where: { classCode: "KELAS-7B" },
    update: { name: "Kelas 7B" },
    create: { name: "Kelas 7B", classCode: "KELAS-7B" },
  });

  // Bersihkan data contoh sebelumnya
  const seedEmails = [
    "guru@example.com",
    "siswa1@example.com",
    "siswa2@example.com",
    "siswa3@example.com",
  ];
  await prisma.task.deleteMany({
    where: { creator: { email: { in: seedEmails } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: seedEmails } } });

  const teacher = await prisma.user.create({
    data: {
      name: "Bu Rina (Guru)",
      email: "guru@example.com",
      passwordHash: hash,
      role: "teacher",
      teaching: { create: [{ classId: kelas7a.id }, { classId: kelas7b.id }] },
    },
  });

  const students = await Promise.all(
    [
      ["Andi Pratama", "siswa1@example.com", kelas7a.id],
      ["Budi Santoso", "siswa2@example.com", kelas7a.id],
      ["Citra Lestari", "siswa3@example.com", kelas7b.id],
    ].map(([name, email, classId]) =>
      prisma.user.create({
        data: { name, email, passwordHash: hash, role: "student", classId },
      })
    )
  );

  const defs = [
    ["Latihan Soal Aljabar Bab 3", "Kerjakan soal nomor 1-15 pada buku paket halaman 42.", -2, kelas7a],
    ["Laporan Percobaan IPA", "Tulis laporan percobaan pemuaian zat cair, maksimal 2 halaman.", 1, kelas7a],
    ["Rangkuman Sejarah Kerajaan Hindu-Buddha", "Buat rangkuman satu halaman dengan bahasa sendiri.", 3, kelas7a],
    ["Presentasi Bahasa Inggris", "Presentasi 3 menit tentang liburan favorit.", 5, kelas7a],
    ["Membaca Cerpen dan Menulis Ulasan", "Pilih satu cerpen, tulis ulasan 200 kata.", 7, kelas7a],
    ["Proyek Poster Lingkungan", "Buat poster tentang pengelolaan sampah di sekolah.", 10, kelas7a],
    ["Latihan Soal Geometri", "Soal nomor 1-10 tentang luas dan keliling.", 2, kelas7b],
    ["Praktik Menulis Teks Prosedur", "Tulis teks prosedur membuat teh manis.", 4, kelas7b],
    ["Kuis Mandiri PPKn", "Jawab 10 pertanyaan pada LKS halaman 18.", 6, kelas7b],
  ];

  const tasks = [];
  for (const [title, description, offset, cls] of defs) {
    tasks.push(
      await prisma.task.create({
        data: {
          title,
          description,
          dueAt: inDays(offset),
          classId: cls.id,
          createdBy: teacher.id,
        },
      })
    );
  }

  // Satu tugas sudah diselesaikan siswa pertama
  await prisma.taskCompletion.create({
    data: { taskId: tasks[0].id, studentId: students[0].id, completedAt: new Date() },
  });

  console.log("Seeder selesai.");
  console.log("Kode kelas  : KELAS-7A, KELAS-7B");
  console.log(`Guru        : guru@example.com / ${PASSWORD}`);
  console.log(`Siswa       : siswa1@example.com (7A), siswa2@example.com (7A), siswa3@example.com (7B) / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
