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
- **Frontend (`apps/web`)**: Next.js 16+ (App Router), Tailwind CSS v3, Zustand, TanStack Query, Konva.js (Papan Digital), Framer Motion
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
git clone <URL_REPOSITORY_ANDA>
cd EduBoard
```

### 2. Install Dependensi

Gunakan `pnpm` untuk menginstal semua dependensi di seluruh workspace monorepo.

```bash
pnpm install
```

### 3. Konfigurasi Environment Variables

Buat file `.env` di root proyek (sejajar dengan `package.json`). Anda dapat menyalin konfigurasi dari `.env.example` jika tersedia, atau isi dengan nilai konfigurasi Supabase Anda:

```env
# Koneksi Database Supabase
DATABASE_URL="postgresql://postgres.[PROYEK-ANDA]:[PASSWORD-ANDA]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROYEK-ANDA]:[PASSWORD-ANDA]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Kredensial Supabase untuk Frontend
NEXT_PUBLIC_SUPABASE_URL="https://[PROYEK-ANDA].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."

# URL WebSocket (Opsional: Jika backend berjalan di localhost)
NEXT_PUBLIC_WS_URL="http://localhost:4000"
```

### 4. Setup Database (Prisma)

Lakukan sinkronisasi skema Prisma ke database Supabase Anda dan *generate* Prisma Client:

```bash
# Push skema database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### 5. Jalankan Development Server

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

