"use client";

import Link from "next/link";
import { Users, GraduationCap, ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-6 pt-24 relative overflow-hidden text-slate-900">
      {/* Premium Ambient Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ffda59]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2c49c5]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl text-center space-y-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl text-slate-900">
            EduBoard <span className="text-[#2c49c5]">PAI</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Platform pembelajaran Pendidikan Agama Islam berbasis <span className="text-[#2c49c5] font-black italic">Digital Board Game</span> interaktif untuk pengalaman belajar yang seru dan modern.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 max-w-4xl mx-auto">
          {/* Card untuk Guru */}
          <Link href="/login" className="group relative flex flex-col items-start p-8 rounded-[2rem] border border-slate-100 bg-white hover:border-[#2c49c5]/30 transition-all shadow-xl shadow-slate-200/30 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 translate-x-12 -translate-y-12 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 group-hover:bg-[#2c49c5] group-hover:text-white transition-all shadow-sm border border-blue-100">
              <GraduationCap className="w-8 h-8 text-[#2c49c5] group-hover:text-white" />
            </div>
            <div>
               <h2 className="text-xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-[#2c49c5] transition-colors">Panel Pendidik</h2>
               <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">Kendali penuh untuk guru: kelola bank soal, buat ruang permainan, dan pantau perkembangan siswa secara realtime.</p>
            </div>
            
            <div className="mt-auto w-full">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest group-hover:bg-[#2c49c5] transition-all shadow-lg shadow-slate-900/10">
                Akses Dashboard
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <ArrowRight size={16} />
                </motion.div>
              </div>
            </div>
          </Link>

          {/* Card untuk Siswa */}
          <Link href="/lobby" className="group relative flex flex-col items-start p-8 rounded-[2rem] border border-slate-100 bg-white hover:border-[#ffda59]/30 transition-all shadow-xl shadow-slate-200/30 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50/50 translate-x-12 -translate-y-12 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="bg-yellow-50 p-4 rounded-2xl mb-6 group-hover:bg-[#ffda59] group-hover:text-white transition-all shadow-sm border border-yellow-100">
              <Users className="w-8 h-8 text-yellow-600 group-hover:text-white" />
            </div>
            <div>
               <h2 className="text-xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-yellow-600 transition-colors">Masuk Arena</h2>
               <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">Bergabunglah dalam misi seru bersama teman sekelas. Gunakan kode unik untuk mulai menjelajahi dunia pengetahuan.</p>
            </div>

            <div className="mt-auto w-full">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest group-hover:bg-yellow-500 transition-all shadow-lg shadow-slate-900/10">
                Main Sekarang
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Gamepad2 size={16} />
                </motion.div>
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-20">
           <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-4">
               <div className="h-px w-20 bg-slate-100" />
               <div className="flex items-center gap-2">
                 <Sparkles size={12} />
                 <span>EduBoard PAI - Premium Edition</span>
               </div>
               <div className="h-px w-20 bg-slate-100" />
           </div>
        </div>
      </div>
    </div>
  );
}
