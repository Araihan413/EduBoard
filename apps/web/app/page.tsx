import Link from "next/link";
 import { Users, GraduationCap } from "lucide-react";
 
 export default function Home() {
   return (
     <div className="flex min-h-screen pt-30 flex-col items-center justify-center bg-transparent p-6 relative overflow-hidden text-slate-900">
       {/* Premium Ambient Background */}
       <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ffda59]/5 blur-[120px] rounded-full pointer-events-none" />
       <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2c49c5]/5 blur-[120px] rounded-full pointer-events-none" />
 
       <div className="w-full max-w-5xl text-center space-y-12 relative z-10">
         <div className="space-y-6">
           <h1 className="text-6xl font-black tracking-tighter sm:text-8xl text-slate-900">
             EduBoard <span className="text-[#2c49c5]">PAI</span>
           </h1>
           <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
             Platform pembelajaran Pendidikan Agama Islam berbasis <span className="text-[#2c49c5] font-black italic">Digital Board Game</span> interaktif untuk pengalaman belajar yang seru dan modern.
           </p>
         </div>
 
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 max-w-4xl mx-auto">
           {/* Card untuk Guru */}
           <Link href="/login" className="group relative flex flex-col items-start p-10 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-[#2c49c5] hover:shadow-2xl transition-all shadow-xl shadow-slate-200/40 text-left overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 translate-x-12 -translate-y-12 rounded-full group-hover:scale-150 transition-transform duration-700" />
             <div className="bg-blue-50 p-6 rounded-2xl mb-8 group-hover:scale-110 group-hover:bg-[#2c49c5] group-hover:text-white transition-all shadow-sm border border-blue-100">
               <GraduationCap className="w-10 h-10 text-[#2c49c5] group-hover:text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-[#2c49c5] transition-colors">Panel Pendidik</h2>
                <p className="text-slate-500 font-medium leading-relaxed">Kendali penuh untuk guru: kelola bank soal, buat ruang permainan, dan pantau perkembangan siswa secara realtime.</p>
             </div>
             <div className="mt-8 flex items-center text-[#2c49c5] font-black text-xs uppercase tracking-widest gap-2">
                Masuk Dashboard Guru &rarr;
             </div>
           </Link>
 
           {/* Card untuk Siswa */}
           <Link href="/lobby" className="group relative flex flex-col items-start p-10 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-[#ffda59] hover:shadow-2xl transition-all shadow-xl shadow-slate-200/40 text-left overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50/50 translate-x-12 -translate-y-12 rounded-full group-hover:scale-150 transition-transform duration-700" />
             <div className="bg-yellow-50 p-6 rounded-2xl mb-8 group-hover:scale-110 group-hover:bg-[#ffda59] group-hover:text-white transition-all shadow-sm border border-yellow-100">
               <Users className="w-10 h-10 text-yellow-600 group-hover:text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-yellow-600 transition-colors">Masuk Arena</h2>
                <p className="text-slate-500 font-medium leading-relaxed">Bergabunglah dalam misi seru bersama teman sekelas. Gunakan kode unik untuk mulai menjelajahi dunia pengetahuan.</p>
             </div>
             <div className="mt-8 flex items-center text-yellow-600 font-black text-xs uppercase tracking-widest gap-2">
                Main Sebagai Siswa &rarr;
             </div>
           </Link>
         </div>
 
         <div className="pt-20">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                <div className="h-px w-20 bg-slate-100" />
                <span>Special Edition - EduBoard PAI</span>
                <div className="h-px w-20 bg-slate-100" />
            </div>
         </div>
       </div>
     </div>
   );
 }
