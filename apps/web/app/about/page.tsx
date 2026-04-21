"use client";

import { 
  Heart, 
  Sparkles, 
  ShieldCheck, 
  ArrowLeft,
  GraduationCap,
  Globe,
  Palette
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6 sm:px-12 max-w-5xl mx-auto relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-0 w-[80%] h-[80%] bg-[#2c49c5]/5 blur-[150px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[60%] h-[60%] bg-[#ffda59]/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto text-center mb-32 relative z-10"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-[2rem] shadow-2xl border border-slate-100 mb-10 mb-10 animate-pulse">
           <GraduationCap className="w-12 h-12 text-[#2c49c5]" />
        </div>
        <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter mb-8 italic">
           Belajar Agama <br />
           <span className="text-[#2c49c5] not-italic">Tanpa Bosan.</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed">
          EduBoard PAI hadir untuk mengubah cara siswa berinteraksi dengan materi Pendidikan Agama Islam melalui teknologi game digital yang dinamis dan kompetitif.
        </p>
      </motion.div>

      <div className="space-y-40 relative z-10">
        {/* Story Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
           <div className="space-y-8">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Visi & Misi EduBoard</h2>
              <p className="text-slate-500 text-lg leading-relaxed font-medium">
                 Kami percaya bahwa pembelajaran yang efektif berawal dari rasa ingin tahu dan kesenangan. EduBoard PAI dikembangkan untuk menjembatani antara kurikulum sekolah yang terstruktur dengan antarmuka permainan yang interaktif.
              </p>
              <div className="grid grid-cols-2 gap-6">
                 <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="text-[#2c49c5] font-black text-3xl mb-2">95%</div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-tight">Siswa lebih antusias belajar</p>
                 </div>
                 <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="text-[#ffda59] font-black text-3xl mb-2">Realtime</div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-tight">Interaksi guru & siswa langsung</p>
                 </div>
              </div>
           </div>
           <div className="relative">
              <div className="bg-slate-900 rounded-[3rem] p-12 aspect-[4/5] flex flex-col justify-end shadow-2xl relative overflow-hidden group">
                 {/* Decorative Glows */}
                 <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-600/30 transition-colors" />
                 <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[60px] rounded-full pointer-events-none" />
                 
                 <div className="absolute inset-0 bg-grid-premium opacity-10" />
                 
                 <div className="relative z-10 space-y-6">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                       <Heart className="w-8 h-8 text-[#ffda59] fill-[#ffda59]/20" />
                    </div>
                    <div className="space-y-3">
                       <h3 className="text-3xl font-black text-white italic tracking-tight">Made with Love <br /> for Education</h3>
                       <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                          Setiap baris kode dan elemen visual dirancang dengan hati untuk menciptakan keseimbangan sempurna antara hiburan dan nilai-nilai luhur pendidikan.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Values Section */}
        <section className="text-center">
           <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-16 underline decoration-[#ffda59] decoration-8 underline-offset-8">Mengapa EduBoard PAI?</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <ValueCard 
                icon={<Sparkles className="w-6 h-6" />}
                title="Modern UI"
                desc="Desain Premium Light yang nyaman di mata."
              />
              <ValueCard 
                icon={<Globe className="w-6 h-6" />}
                title="Interaktif"
                desc="Sinkronisasi data langsung via Socket.io."
              />
              <ValueCard 
                icon={<ShieldCheck className="w-6 h-6" />}
                title="Terintegrasi"
                desc="Dashboard khusus guru untuk evaluasi nyata."
              />
              <ValueCard 
                icon={<Palette className="w-6 h-6" />}
                title="Kustomisasi"
                desc="Bank soal yang dapat ditambah kapan saja."
              />
           </div>
        </section>

        {/* Tech Footer Link */}
        <section className="text-center pt-20 border-t border-slate-100">
           <p className="text-slate-400 font-medium mb-8">Siap membuat sesi belajar lebih berwarna?</p>
           <div className="flex justify-center gap-6">
              <Link href="/" className="px-8 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-[#2c49c5] transition-all flex items-center gap-2">
                 <ArrowLeft className="w-4 h-4" /> Kembali
              </Link>
              <Link href="/login" className="px-8 py-4 bg-[#2c49c5] text-white border border-[#2c49c5] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1a34a8] transition-all shadow-xl shadow-blue-500/20">
                 Coba Sekarang
              </Link>
           </div>
        </section>
      </div>

      <footer className="mt-40 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] pb-10">
         EduBoard PAI &bull; Educational Entertainment &bull; 2026
      </footer>
    </main>
  );
}

function ValueCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 bg-white border border-slate-50 rounded-3xl shadow-sm hover:shadow-xl transition-all group">
       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#2c49c5] group-hover:text-white transition-all">
          {icon}
       </div>
       <h4 className="text-lg font-black text-slate-900 mb-2 tracking-tight">{title}</h4>
       <p className="text-slate-400 text-xs font-bold leading-relaxed">{desc}</p>
    </div>
  );
}

