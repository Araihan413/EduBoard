"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  User,
  FileText,
  Play,
  Upload,
  Laptop,
  AlertCircle,
  PlusCircle,
  Sliders,
  ListCollapse
} from "lucide-react";

type GuideSubTab = "GURU" | "SOAL";

export default function GuidesManager() {
  const [activeSubTab, setActiveSubTab] = useState<GuideSubTab>("GURU");

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-[#2c49c5]" />
            Panduan EduBoard PAI
          </h1>
          <p className="text-slate-500 text-sm">
            Pelajari cara mengelola kelas dan menyusun paket soal mandiri dengan mudah.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-col gap-4 lg:gap-0 lg:flex-row w-full md:w-max bg-slate-50 p-1.5 rounded-2xl border border-slate-100 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab("GURU")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeSubTab === "GURU"
                ? "bg-white text-[#2c49c5] shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <User size={14} />
            Panduan Guru
          </button>
          <button
            onClick={() => setActiveSubTab("SOAL")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeSubTab === "SOAL"
                ? "bg-white text-[#2c49c5] shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileText size={14} />
            Pembuatan Soal
          </button>
        </div>
      </div>

      {/* Guide Content Area */}
      <AnimatePresence mode="wait">
        {activeSubTab === "GURU" ? (
          <motion.div
            key="guide-guru"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Persiapan Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Laptop className="w-5 h-5 text-[#2c49c5]" />
                Persiapan Sebelum Kelas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PrepItem
                  title="Perangkat Guru"
                  desc="Laptop/PC terhubung ke internet. Browser direkomendasikan Google Chrome atau Mozilla Firefox."
                />
                <PrepItem
                  title="Proyektor Kelas"
                  desc="Layar proyektor siap menampilkan papan board game digital EduBoard ke seluruh siswa di kelas."
                />
                <PrepItem
                  title="Perangkat Siswa"
                  desc="Siswa berkelompok/tim membawa smartphone, tablet, atau laptop yang terhubung ke internet."
                />
                <PrepItem
                  title="Rencana Durasi"
                  desc="Tentukan estimasi total durasi sesi permainan dan batas waktu menjawab per kartu soal."
                />
              </div>
            </div>

            {/* Alur Sesi Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-8">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-500" />
                Alur Pelaksanaan Sesi Permainan
              </h2>

              <div className="relative border-l border-slate-100 pl-6 ml-4 space-y-8">
                <StepItem
                  step="1"
                  title="Konfigurasi di Setup Hub"
                  desc="Pilih paket soal yang diinginkan (preset resmi atau paket mandiri Anda), lalu tentukan durasi total permainan serta durasi menjawab kartu."
                />
                <StepItem
                  step="2"
                  title="Buat Sesi & Bagikan Kode Room"
                  desc="Klik tombol 'Buat Sesi Permainan'. Kode akses room unik akan tertera di lobby. Minta siswa membuka eduboard.online, klik 'Masuk Arena', lalu masukkan kode tersebut beserta nama tim mereka."
                />
                <StepItem
                  step="3"
                  title="Mulai Misi Permainan"
                  desc="Setelah semua tim siswa terdaftar di daftar lobby secara real-time, klik 'Mulai Misi' untuk menampilkan papan permainan serentak di layar siswa dan proyektor."
                />
                <StepItem
                  step="4"
                  title="Monitor & Nilai Jawaban Siswa"
                  desc="Saat permainan berlangsung secara otomatis bergantian (turn-based), guru memantau jalannya laga di Live Monitoring. Guru bertindak sebagai penilai untuk Kartu Tantangan (jawaban lisan) dan Kartu Pemahaman (isian singkat)."
                />
                <StepItem
                  step="5"
                  title="Tutup Sesi & Simpan Riwayat"
                  desc="Permainan akan otomatis selesai saat waktu global habis. Peringkat akhir dan total skor tampil pada papan klasemen. Klik 'Kembali ke Lobby' untuk mengakhiri sesi secara aman."
                />
              </div>
            </div>

            {/* Live Monitoring Info */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                Mekanisme Penilaian Guru (Live Monitoring)
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Di dalam dashboard Live Monitoring, guru akan menerima notifikasi jawaban kelompok secara instan dan dapat memilih tombol penilaian berikut:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                <GradingInfoCard
                  badge="✓ Tuntas"
                  color="bg-emerald-50 text-emerald-600 border-emerald-100"
                  points="Poin Penuh"
                  desc="Diberikan jika jawaban tertulis siswa benar atau praktik lisan diselesaikan dengan baik."
                />
                <GradingInfoCard
                  badge="½ Setengah"
                  color="bg-amber-50 text-amber-600 border-amber-100"
                  points="Setengah Poin"
                  desc="Diberikan jika jawaban siswa kurang lengkap atau praktik lisan sebagian benar."
                />
                <GradingInfoCard
                  badge="✗ Salah"
                  color="bg-rose-50 text-rose-600 border-rose-100"
                  points="0 Poin"
                  desc="Diberikan jika jawaban siswa salah, tidak tepat, atau melewati batas waktu menjawab."
                />
              </div>
            </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="guide-soal"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Tipe Kartu Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ListCollapse className="w-5 h-5 text-[#2c49c5]" />
                Karakteristik Jenis Kartu Soal
              </h2>
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-sm font-black uppercase tracking-wider text-slate-400">Jenis Kartu</th>
                      <th className="p-4 text-sm font-black uppercase tracking-wider text-slate-400">Format Soal</th>
                      <th className="p-4 text-sm font-black uppercase tracking-wider text-slate-400">Metode Penilaian</th>
                      <th className="p-4 text-sm font-black uppercase tracking-wider text-slate-400 text-right">Rekomendasi Poin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <CardTypeRow
                      name="DASAR"
                      color="bg-blue-50 text-blue-600 border-blue-100"
                      format="Pilihan Ganda (A, B, C, D)"
                      grading="Otomatis oleh sistem"
                      points="10 Poin"
                    />
                    <CardTypeRow
                      name="TANTANGAN"
                      color="bg-rose-50 text-rose-600 border-rose-100"
                      format="Jawaban Lisan / Praktik verbal"
                      grading="Manual oleh Guru (Teacher Grade)"
                      points="30 Poin"
                    />
                    <CardTypeRow
                      name="PEMAHAMAN"
                      color="bg-amber-50 text-amber-600 border-amber-100"
                      format="Isian Singkat Tertulis"
                      grading="Manual oleh Guru (Teacher Grade)"
                      points="20 Poin"
                    />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Metode Import (Excel/CSV) */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#2c49c5]" />
                  Metode Impor Excel/CSV (Rekomendasi)
                </h2>
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Cepat & Praktis
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Metode ini sangat cocok jika Anda ingin mengunggah banyak pertanyaan sekaligus. Silakan ikuti langkah-langkah berikut:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ImportStepCard
                  num="1"
                  title="Unduh Template"
                  desc="Klik tombol 'Template' di Bank Soal dan unduh format Excel (.xlsx) atau CSV (.csv)."
                />
                <ImportStepCard
                  num="2"
                  title="Isi Template"
                  desc="Tulis jenis kartu (DASAR, TANTANGAN, PEMAHAMAN) pada kolom type. Tulis 'Teacher Grade' pada kolom answerKey khusus tipe Tantangan/Pemahaman."
                />
                <ImportStepCard
                  num="3"
                  title="Unggah File"
                  desc="Buka halaman paket baru Anda, klik tombol 'Import' dan pilih file Excel/CSV yang telah disimpan. Soal otomatis terimpor!"
                />
              </div>

              {/* Alert Note */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm leading-relaxed">
                  <span className="font-black text-sm">Penting:</span> Kolom <code className="bg-white/50 px-1 py-0.5 rounded">type</code> harus menggunakan huruf kapital semua (DASAR, TANTANGAN, PEMAHAMAN). Baris pertama template (header) tidak boleh diubah/dihapus.
                </div>
              </div>
            </div>

            {/* Metode Manual */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#2c49c5]" />
                Metode Input Manual (Satu Per Satu)
              </h2>
              <div className="space-y-4">
                <ManualStepItem
                  num="1"
                  desc="Buka Bank Soal, lalu klik tombol '+ Paket Baru' untuk membuat paket sebagai wadah."
                />
                <ManualStepItem
                  num="2"
                  desc="Masuk ke paket yang baru dibuat, lalu klik tombol '+ Tambah Soal' di pojok kanan atas."
                />
                <ManualStepItem
                  num="3"
                  desc="Pilih Kategori Kartu, ketik pertanyaan, atur Poin Hadiah, dan tentukan pilihan jawaban beserta kunci (khusus Kartu Dasar)."
                />
                <ManualStepItem
                  num="4"
                  desc="Klik 'Simpan Soal'. Ulangi langkah di atas untuk menambah pertanyaan lainnya."
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helper UI Components ─────────────────────────────────────────────────────

function PrepItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex flex-col gap-1 text-sm">
      <h3 className="font-black text-[#2c49c5] uppercase tracking-wider">{title}</h3>
      <p className="text-slate-600 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function StepItem({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="relative group">
      {/* Node Number */}
      <div className="absolute -left-[37px] top-0.5 w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black border border-white shadow-sm group-hover:bg-[#2c49c5] group-hover:text-white transition-all">
        {step}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-black text-slate-800 tracking-tight">{title}</h3>
        <p className="text-slate-600 text-sm font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function GradingInfoCard({
  badge,
  color,
  points,
  desc
}: {
  badge: string;
  color: string;
  points: string;
  desc: string;
}) {
  return (
    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 space-y-3">
      <div className="grid grid-cols-2 items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-black uppercase tracking-wider border ${color}`}>
          {badge}
        </span>
        <span className="text-sm md:text-sm font-black text-[#2c49c5] uppercase tracking-wider text-end">{points}</span>
      </div>
      <p className="text-slate-600 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function CardTypeRow({
  name,
  color,
  format,
  grading,
  points
}: {
  name: string;
  color: string;
  format: string;
  grading: string;
  points: string;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors">
      <td className="p-4">
        <span className={`px-3 py-1 rounded-full text-sm font-black tracking-wider border ${color}`}>{name}</span>
      </td>
      <td className="p-4 text-sm font-semibold text-slate-700">{format}</td>
      <td className="p-4 text-sm font-semibold text-slate-500">{grading}</td>
      <td className="p-4 text-sm font-black text-slate-900 text-right">{points}</td>
    </tr>
  );
}

function ImportStepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 space-y-2 relative">
      <div className="w-7 h-7 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-sm font-black text-[#2c49c5] shadow-sm">
        {num}
      </div>
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider pt-2">{title}</h3>
      <p className="text-slate-600 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function ManualStepItem({ num, desc }: { num: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="w-6 h-6 rounded-full bg-blue-50 text-[#2c49c5] flex items-center justify-center text-sm font-black flex-shrink-0">
        {num}
      </div>
      <p className="text-slate-600 text-sm leading-relaxed pt-0.5">{desc}</p>
    </div>
  );
}
