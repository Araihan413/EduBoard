import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white bg-grid p-6 relative overflow-hidden">
      {/* Decorative ambient light */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#2c49c5]/5 blur-[120px] rounded-full -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#ffda59]/10 blur-[120px] rounded-full -ml-48 -mb-48" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-50">
          <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-[#2c49c5] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
              <span className="text-white font-black text-2xl">E</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
              EduBoard Admin
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Masuk untuk mengelola permainan Anda
            </p>
          </div>

          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Kredensial</label>
              <input 
                type="email" 
                className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-white text-base font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#2c49c5] focus:ring-8 focus:ring-[#2c49c5]/5 transition-all" 
                placeholder="admin@eduboard.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kata Sandi</label>
                 <a href="#" className="text-[10px] font-black text-[#2c49c5] uppercase tracking-widest hover:underline">Lupa?</a>
              </div>
              <input 
                type="password" 
                className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-white text-base font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#2c49c5] focus:ring-8 focus:ring-[#2c49c5]/5 transition-all" 
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              className="w-full h-14 mt-4 bg-[#2c49c5] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#1a34a8] hover:-translate-y-1 active:translate-y-0 transition-all text-sm tracking-widest uppercase border-b-4 border-blue-900"
            >
              MASUK KE DASHBOARD &rarr;
            </button>
          </form>

          <p className="mt-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Hanya untuk Guru / Admin
          </p>
        </div>
      </div>
    </div>
  );
}
