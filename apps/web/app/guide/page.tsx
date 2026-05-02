"use client";

import { 
  Gamepad2, 
  BookOpen, 
  Target, 
  Flame, 
  ArrowRight,
  Sparkles,
  Timer
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function GuidePage() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6 sm:px-12 max-w-5xl mx-auto relative">
      {/* Decorative background elements */}
      <div className="absolute top-20 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-64 h-64 bg-yellow-500/5 blur-[100px] rounded-full pointer-events-none" />

      <header className="mb-20 text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 text-[#2c49c5] text-xs font-black uppercase tracking-[0.2em] mb-6"
        >
          <Sparkles className="w-4 h-4" />
          Panduan Lengkap Permainan
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tighter mb-6"
        >
          Siap Untuk Menjadi <br />
          <span className="text-[#2c49c5]">Pemenang Berikutnya?</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-500 max-w-2xl mx-auto font-medium"
        >
          Pelajari mekanisme dasar, jenis kartu, dan strategi untuk menguasai papan EduBoard PAI dan mengumpulkan poin terbanyak.
        </motion.p>
      </header>

      <div className="space-y-32 relative z-10">
        {/* Step 1: Dice & Movement */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 mb-8">
              <Gamepad2 className="w-8 h-8 text-[#2c49c5]" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Melempar Dadu & Melangkah</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Setiap giliran dimulai dengan melempar dadu virtual. Angka yang muncul (1-6) akan menentukan berapa banyak petak yang harus dilalui oleh kelompokmu. Pastikan posisi timmu selalu terpantau di papan permainan!
            </p>
            <ul className="space-y-4 pt-4">
              <ListItem text="Dadu diputar secara otomatis dengan animasi 3D premium." />
              <ListItem text="Posisi tim akan berpindah secara otomatis setelah dadu berhenti." />
            </ul>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-slate-50 aspect-video rounded-[2.5rem] border-4 border-white shadow-2xl flex items-center justify-center relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-grid-premium opacity-50" />
             <div className="w-24 h-24 bg-white rounded-[1.8rem] shadow-2xl flex items-center justify-center animate-bounce border border-slate-100 z-10 p-5">
                {/* Dice Face with 5 Dots */}
                <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-2">
                   <div className="w-full h-full bg-[#2c49c5] rounded-full" />
                   <div />
                   <div className="w-full h-full bg-[#2c49c5] rounded-full" />
                   <div />
                   <div className="w-full h-full bg-[#2c49c5] rounded-full" />
                   <div />
                   <div className="w-full h-full bg-[#2c49c5] rounded-full" />
                   <div />
                   <div className="w-full h-full bg-[#2c49c5] rounded-full" />
                </div>
             </div>
          </motion.div>
        </section>

        {/* Step 2: The Cards */}
        <section>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Mengenal Jenis Kartu</h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">Terdapat tiga jenis misi utama yang akan kamu temui di setiap petak papan permainan.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GuideCard 
              icon={<BookOpen className="w-8 h-8" />}
              title="Kartu Dasar"
              desc="Soal pilihan ganda tentang materi PAI. Jawab dengan benar untuk mendapatkan poin maksimal sebelum waktu habis."
              color="blue"
            />
            <GuideCard 
              icon={<Target className="w-8 h-8" />}
              title="Kartu Aksi"
              desc="Misi interaktif yang memerlukan kerja tim. Bisa berupa instruksi langsung atau tantangan fisik yang seru."
              color="red"
            />
            <GuideCard 
              icon={<Flame className="w-8 h-8" />}
              title="Kartu Tantangan"
              desc="Tugas esai atau unjuk performa. Jawabanmu akan dievaluasi dan diberi nilai langsung oleh Guru melalui Dashboard."
              color="orange"
            />
          </div>
        </section>

        {/* Step 3: Game Flow */}
        <section className="bg-[#2c49c5] rounded-[3rem] p-12 sm:p-20 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20 text-center">
           <div className="absolute top-0 left-0 w-full h-full bg-grid-premium opacity-10" />
           <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
             <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
                <Timer className="w-8 h-8 text-[#ffda59]" />
             </div>
             <h2 className="text-4xl font-black tracking-tight mb-6 leading-tight">Waktu Global & Penentuan Pemenang</h2>
             <p className="text-blue-100 text-lg font-medium leading-relaxed mb-10">
               Setiap sesi permainan memiliki durasi global yang bisa diatur oleh Guru. Pemenang ditentukan berdasarkan total poin tertinggi yang dikumpulkan oleh tim saat waktu habis.
             </p>
             <Link 
                href="/lobby"
                className="group flex items-center gap-3 bg-[#ffda59] text-slate-900 px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-500/20"
             >
                Mulailah Bermain <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </Link>
           </div>
        </section>
      </div>

      <footer className="mt-40 text-center pt-20 border-t border-slate-100">
         <p className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">EduBoard PAI &bull; Panduan Resmi</p>
      </footer>
    </main>
  );
}

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-[#2c49c5]" />
      </div>
      <span className="text-slate-600 font-semibold">{text}</span>
    </li>
  );
}

function GuideCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100",
    red: "bg-red-50 text-red-600 border-red-100 shadow-red-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-100"
  };

  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className={`p-10 rounded-[2rem] border-2 bg-white flex flex-col items-center text-center shadow-xl ${colorMap[color]}`}
    >
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-inner ${colorMap[color]}`}>
        {icon}
      </div>
      <h4 className="text-xl font-black mb-4 tracking-tight text-slate-900">{title}</h4>
      <p className="text-slate-500 text-sm leading-relaxed font-semibold">{desc}</p>
    </motion.div>
  );
}

