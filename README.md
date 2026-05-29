---
title: EduBoard API
emoji: 🎓
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# EduBoard PAI

EduBoard PAI adalah aplikasi **web game digital edukatif** yang mengadaptasi mekanisme board game (papan permainan, giliran, kartu soal, tantangan, skor) ke dalam format digital. Produk ini dirancang khusus untuk mendukung pembelajaran Pendidikan Agama Islam (PAI) untuk jenjang SMA.

Proyek ini dibangun menggunakan arsitektur **Monorepo (Turborepo)** dengan pemisahan antara frontend (Next.js) dan backend (Fastify + Socket.io), serta menggunakan Supabase sebagai layanan database.

---

## 🎯 Fitur Utama

- **Mode Guru & Siswa**: Guru dapat membuat ruang permainan (room), mengelola soal, memantau permainan, dan menilai jawaban secara real-time. Siswa dapat langsung bermain tanpa harus membuat akun.
- **Papan Permainan Real-time**: Papan permainan interaktif yang tersinkronisasi antar semua perangkat dalam room yang sama.
- **Kartu Pertanyaan**: Tiga tipe soal—Dasar (objektif), Tantangan (subjektif/lisan), dan Pemahaman (subjektif/tertulis).
- **Penilaian Langsung**: Guru dapat langsung memberi nilai (0-100) untuk pertanyaan tipe subjektif saat permainan berlangsung.
- **Bank Soal Terpusat**: Pengelolaan soal yang mudah melalui dashboard guru.

## 🛠️ Stack Teknologi

- **Monorepo**: Turborepo
- **Frontend (`apps/web`)**: Next.js 16+ (App Router), Tailwind CSS v4, Zustand, React Three Fiber (@react-three/drei), Framer Motion, Supabase Auth
- **Backend (`apps/api`)**: Fastify v4, Socket.io v4 (Real-time Engine), Zod
- **Database & ORM (`packages/db`)**: PostgreSQL 16+ (Supabase), Prisma v5
- **Package Manager**: pnpm

---

## 📋 Syarat Sistem (Prerequisites)

Sebelum menjalankan proyek ini, pastikan Anda telah menginstal perangkat lunak berikut:

1. [Node.js](https://nodejs.org/en/) (v18.x atau lebih baru disarankan)
2. [pnpm](https://pnpm.io/installation) (v9.5.0 atau lebih baru) — *Ini adalah package manager utama yang digunakan di proyek ini.*
3. [Git](https://git-scm.com/)
4. Akun [Supabase](https://supabase.com/) (untuk pengaturan database secara cloud)

---

## 🚀 Cara Setup dan Menjalankan Proyek

### 1. Clone Repository

```bash
git clone git@github.com:Araihan413/EduBoard.git
cd EduBoard
```

### 2. Install Dependensi

Gunakan `pnpm` untuk menginstal semua dependensi di seluruh workspace monorepo.

```bash
pnpm install
```

### 3. Konfigurasi Environment Variables

Seluruh konfigurasi environment variables disederhanakan dan dipusatkan dalam **satu file `.env` di root directory**. 

Silakan salin `.env.example` di root menjadi `.env`:

```bash
cp .env.example .env
```

Lalu sesuaikan nilai-nilai berikut di dalam file `/.env` tersebut:

```env
# ─── DATABASE CONFIGURATION (SUPABASE / POSTGRES) ─────────────────────────────
# Connection pooler URL (e.g. Supabase port 6543)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database, used for migrations (e.g. Supabase port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# ─── SUPABASE CLIENT CONFIGURATION (AUTH) ─────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-public-key"

# ─── API BACKEND SERVER CONFIGURATION ─────────────────────────────────────────
# Fastify server port (Default: 4000)
PORT=4000

# HS256 JWT Secret used for Fastify server session authentication
JWT_SECRET="your-generate-32-character-jwt-secret"

# CORS configuration (leave empty to default to localhost:3000 in dev)
CORS_ORIGIN=""

# ─── FRONTEND NEXT.JS CLIENT DEPLOYMENT CONFIGURATION ──────────────────────────
# Point these to your VPS URL (e.g., https://api.eduboard.online) for production,
# or http://localhost:4000 for local development.
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WS_URL="http://localhost:4000"
```

> [!NOTE]
> - **Frontend (`apps/web`)** akan otomatis memuat file `.env` dari root ini melalui `next.config.ts`.
> - **Backend (`apps/api`)** akan memuat file `.env` dari root sebagai fallback lokal.
> - **Database (`packages/db`)** otomatis memuat file `.env` dari root karena Prisma CLI mencari ke folder induk (parent folder) secara rekursif jika file `.env` lokal tidak ditemukan.

### 4. Konfigurasi Supabase & Google Auth

Aplikasi ini menggunakan **Google OAuth** untuk autentikasi Guru. Berikut langkah-langkah pengaturannya:

#### A. Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru atau pilih proyek yang sudah ada.
3. Buka **APIs & Services > OAuth consent screen**. Pilih User Type **External**, lalu isi informasi aplikasi.
4. Buka **APIs & Services > Credentials**. Klik **Create Credentials > OAuth client ID**.
5. Pilih Application Type **Web application**.
6. Pada bagian **Authorized redirect URIs**, masukkan URL callback dari Supabase Anda (bisa didapatkan di langkah B.3 di bawah). Formatnya biasanya: `https://[PROYEK-ANDA].supabase.co/auth/v1/callback`.
7. Simpan, lalu catat **Client ID** dan **Client Secret**.

#### B. Dashboard Supabase
1. Buka dashboard proyek [Supabase](https://supabase.com/) Anda.
2. Pergi ke menu **Authentication > Providers > Google**.
3. Aktifkan (Enable) Google Provider.
4. Masukkan **Client ID** dan **Client Secret** yang Anda dapatkan dari Google Cloud Console tadi.
5. Pada menu **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:3000` (untuk dev) atau domain produksi Anda.
   - **Redirect URLs**: Tambahkan `http://localhost:3000/**` agar redirect setelah login berjalan lancar di lokal.

### 5. Setup Database (Prisma)

Karena skema database berada di dalam package tersendiri, Anda dapat menjalankan perintah Prisma melalui `pnpm` dari root atau masuk ke foldernya langsung:

```bash
# Opsi 1: Dari root menggunakan pnpm filter (Direkomendasikan)
pnpm --filter @repo/db db:push
pnpm --filter @repo/db db:generate

# Opsi 2: Masuk ke direktori package secara manual
cd packages/db
npx prisma db push
npx prisma generate
```

> [!IMPORTANT]
> Pastikan Anda menjalankan `db:generate` setidaknya sekali sebelum menjalankan server agar TypeScript dapat mengenali skema database terbaru.

### 6. Import Data Preset (Seeding)

Aplikasi ini dilengkapi dengan data soal preset (PAI Kelas X s.d XII). Untuk memasukkannya ke database, jalankan perintah berikut:

```bash
# Opsi 1: Dari root menggunakan pnpm filter (Direkomendasikan)
pnpm --filter @repo/db db:seed

# Opsi 2: Masuk ke direktori package secara manual
cd packages/db
npx prisma db seed
```

Proses ini akan membersihkan data lama dan memasukkan data soal baru dari folder `packages/db/prisma/presets` ke database Anda.

### 7. Jalankan Development Server

Jalankan semua aplikasi (frontend dan backend) secara serentak menggunakan Turborepo:

```bash
pnpm run dev
```

Secara default:
- **Frontend (Next.js)** akan berjalan di `http://localhost:3000`
- **Backend (Fastify/Socket.io)** akan berjalan di `http://localhost:4000`

---

## 📁 Struktur Proyek (Monorepo)

```text
eduboard-pai/                ← root (Turborepo)
├── apps/
│   ├── web/                 ← Frontend (Next.js)
│   └── api/                 ← Backend (Fastify + Socket.io)
├── packages/
│   ├── db/                  ← Prisma schema & client
│   ├── types/               ← Shared TypeScript types & Zod schemas
│   └── config/              ← Shared configs (ESLint, Prettier, tsconfig)
└── package.json
```

