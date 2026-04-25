"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, KeyRound, Mail, Lock, ShieldCheck, Eye, EyeOff, Check, Disc3 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("eduboard_remembered_email");
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await api.post("/api/auth/login", formData);
      
      localStorage.setItem("eduboard_token", data.token);
      localStorage.setItem("eduboard_user", JSON.stringify(data.user));
      
      // Handle Remember Me logic
      if (rememberMe) {
        localStorage.setItem("eduboard_remembered_email", formData.email);
      } else {
        localStorage.removeItem("eduboard_remembered_email");
      }
      
      toast.success("Login berhasil! Selamat datang kembali.");
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Email atau password salah");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] p-4 pt-24 relative overflow-hidden font-sans">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-100/30 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-100/30 blur-[80px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200/60 p-6 rounded-3xl shadow-xl shadow-slate-200/40 relative z-10"
      >
        <Link href="/" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 mb-6 transition-all group uppercase tracking-widest">
          <ArrowLeft size={16} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Kembali
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
            <KeyRound size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Akses Pendidik
            </h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">
              Masuk untuk mengelola ruang belajar digital
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Mail size={14} className="text-blue-500" /> Email Resmi
            </label>
            <input 
              type="email" 
              placeholder="guru@sekolah.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full h-12 px-5 text-base font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Lock size={14} className="text-blue-500" /> Kata Sandi
            </label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

          <div className="flex items-center justify-between px-1">
            <button 
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2 cursor-pointer group outline-none"
            >
              <div className={`w-4 h-4 rounded border ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-slate-200'} flex items-center justify-center transition-all group-hover:border-blue-500`}>
                {rememberMe && <Check size={10} className="text-white" />}
              </div>
              <span className={`text-sm font-semibold transition-colors ${rememberMe ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>Ingat saya</span>
            </button>
            <button type="button" className="text-sm font-bold text-blue-600 hover:underline">Lupa sandi?</button>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-base font-bold hover:bg-black shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] tracking-wide gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Disc3 className="w-5 h-5 animate-spin" />
              ) : (
                <>Masuk ke Dashboard <Sparkles size={18} className="text-amber-400" /></>
              )}
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              Belum punya akun pendidik?{" "}
              <Link href="/register" className="text-blue-600 font-bold hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem ini dilindungi dengan enkripsi untuk menjaga keamanan data akademik Anda.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
