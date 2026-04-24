"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, UserPlus, Mail, Lock, ShieldCheck, User, School, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] p-4 pt-24 pb-12 relative overflow-hidden font-sans">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-100/30 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-100/30 blur-[80px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200/60 p-6 rounded-3xl shadow-xl shadow-slate-200/40 relative z-10"
      >
        {/* Back Link */}
        <Link href="/login" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 mb-6 transition-all group uppercase tracking-widest">
          <ArrowLeft size={16} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Login
        </Link>

        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
            <UserPlus size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Daftar Akun Baru
            </h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">
              Mulai kelola kelas digital Anda hari ini
            </p>
          </div>
        </div>

        {/* Register Form */}
        <form className="space-y-5" action="/dashboard">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <User size={14} className="text-blue-500" /> Nama Lengkap
            </label>
            <input 
              type="text" 
              placeholder="Ustadz Ahmad Raihan"
              required
              className="w-full h-12 px-5 text-base font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Mail size={14} className="text-blue-500" /> Email Resmi
            </label>
            <input 
              type="email" 
              placeholder="guru@sekolah.com"
              required
              className="w-full h-12 px-5 text-base font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <School size={14} className="text-blue-500" /> Nama Sekolah / Instansi
            </label>
            <input 
              type="text" 
              placeholder="SDIT Permata Hati"
              required
              className="w-full h-12 px-5 text-base font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Lock size={14} className="text-blue-500" /> Buat Kata Sandi
            </label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                required
                className="w-full h-12 px-5 text-base font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 pr-12" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full h-12 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-base font-bold hover:bg-black shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] tracking-wide gap-2"
            >
              Daftar Sekarang <Sparkles size={18} className="text-amber-400" />
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              Sudah memiliki akun?{" "}
              <Link href="/login" className="text-blue-600 font-bold hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        </form>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Data Anda terenkripsi dan hanya digunakan untuk keperluan administratif EduBoard.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
