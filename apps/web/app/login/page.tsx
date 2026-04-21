import Link from "next/link";
 import { ArrowLeft, Sparkles, KeyRound } from "lucide-react";
 
 export default function LoginPage() {
   return (
     <div className="flex min-h-screen flex-col items-center bg-transparent p-6 pt-30 relative overflow-hidden">
       {/* Decorative elements */}
       <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-[#2c49c5]/5 blur-[100px] rounded-full pointer-events-none" />
       <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-[#ffda59]/5 blur-[100px] rounded-full pointer-events-none" />
 
       <div className="w-full max-w-lg bg-white p-12 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative z-10">
         <Link href="/" className="inline-flex items-center text-sm font-black text-slate-400 hover:text-[#2c49c5] mb-10 transition-all group uppercase tracking-widest">
           <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
           Kembali ke Beranda
         </Link>
 
         <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                <KeyRound className="w-6 h-6 text-[#2c49c5]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Akses Guru
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Masuk untuk mengelola misi dan game board.
              </p>
            </div>
         </div>
 
         <form className="space-y-8" action="/dashboard">
           <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">Alamat Email Resmi</label>
             <input 
               type="email" 
               placeholder="guru@sekolah.com"
               required
               className="w-full h-14 px-6 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#2c49c5] focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all shadow-inner" 
             />
           </div>
           <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">Kata Sandi</label>
             <input 
               type="password" 
               placeholder="••••••••"
               required
               className="w-full h-14 px-6 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#2c49c5] focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all shadow-inner" 
             />
           </div>
           <div className="pt-2">
             <button 
               type="submit" 
               className="w-full h-16 inline-flex items-center justify-center rounded-xl bg-[#2c49c5] text-white text-lg font-black hover:bg-[#1a34a8] shadow-xl shadow-[#2c49c5]/30 transition-all hover:scale-[1.02] active:scale-[0.98] tracking-tight"
             >
               MASUK KE DASHBOARD <Sparkles className="ml-3 w-5 h-5 text-[#ffda59]" />
             </button>
           </div>
         </form>
       </div>
     </div>
   );
 }
