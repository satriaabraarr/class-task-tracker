# Class Task Tracker

Aplikasi manajemen tugas kelas sesuai PRD v1.0.

- **Frontend**: Next.js 14 (responsif: desktop, tablet, ponsel)
- **Backend**: Node.js + Express, REST API JSON
- **Database**: PostgreSQL + Prisma ORM
- **Desktop (opsional)**: pembungkus Electron

```
class-task-tracker/
├── backend/    API, Prisma schema, migrasi, seeder, test
├── frontend/   Next.js (login, registrasi, dashboard guru, daftar siswa, form, detail)
├── desktop/    Pembungkus Electron (opsional)
└── docker-compose.yml   PostgreSQL via Docker (opsional)
```

## Prasyarat

1. **Node.js 20 LTS atau lebih baru**
2. **PostgreSQL 14+**

## Langkah menjalankan

Buka terminal (cmd/PowerShell) di folder `class-task-tracker`.

### 1. Install dependency

```
npm run setup
```

### 2. Atur environment

```
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

Edit `backend\.env`:
- `DATABASE_URL` → sesuaikan password PostgreSQL Anda, mis.
  `postgresql://postgres:PASSWORD_ANDA@localhost:5432/class_task_tracker?schema=public`
  (pakai `postgres:postgres` jika memakai Docker)
- `JWT_SECRET` → isi string acak panjang (minimal 32 karakter).

### 3. Buat tabel (migrasi) dan isi data contoh

```
cd backend
npx prisma migrate dev
npm run db:seed
cd ..
```

`migrate dev` membuat database bila belum ada, menerapkan migrasi, dan membuat Prisma Client.
Jika Anda diminta memberi nama migrasi baru, isi `sync` lalu Enter.

### 4. Jalankan aplikasi

```
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/health

### 5. Login dengan akun contoh (hanya development)

| Peran | Email | Password |
|---|---|---|
| Guru (mengajar 7A & 7B) | `guru@example.com` | `Password123` |
| Siswa Kelas 7A | `siswa1@example.com`, `siswa2@example.com` | `Password123` |
| Siswa Kelas 7B | `siswa3@example.com` | `Password123` |

Kode kelas untuk registrasi: `KELAS-7A`, `KELAS-7B`.

Kelas baru dibuat pihak sekolah, mis. lewat Prisma Studio: `cd backend && npx prisma studio` → tabel `classes`.

## Ringkasan API

| Method & path | Akses | Fungsi |
|---|---|---|
| POST `/api/auth/register` | Publik | Registrasi (password di-hash bcrypt) |
| POST `/api/auth/login` | Publik | Login, cookie HttpOnly |
| POST `/api/auth/logout` | Login | Logout |
| GET `/api/auth/me` | Login | Profil + kelas |
| GET `/api/tasks?q=&status=&page=&limit=` | Login | Daftar (status: `all`/`pending`/`done`, khusus siswa) |
| GET `/api/tasks/:id` | Login | Detail |
| POST `/api/tasks` | Guru | Buat tugas |
| PATCH `/api/tasks/:id` | Guru berwenang | Ubah |
| DELETE `/api/tasks/:id` | Guru berwenang | Hapus (204) |
| PUT `/api/tasks/:id/completion` | Siswa | Tandai selesai (idempotent) |

Respons: `{success, data, meta}` atau `{success:false, error:{code, message, details}}`.