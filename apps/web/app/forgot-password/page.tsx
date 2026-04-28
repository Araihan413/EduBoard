"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Mail, Sparkles, Disc3, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (error) throw error;
      
      setIsSubmitted(true);
      toast.success("Instruksi reset berhasil dikirim!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim permintaan reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4 pt-24 pb-10 relative overflow-hidden font-sans">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-100/30 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-100/30 blur-[80px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200/60 p-8 rounded-3xl shadow-xl shadow-slate-200/40 relative z-10"
      >
        <Link href="/login" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 mb-6 transition-all group uppercase tracking-widest">
          <ArrowLeft size={16} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Login
        </Link>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                  <KeyRound size={24} className="text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                    Lupa Kata Sandi?
                  </h1>
                  <p className="text-sm text-slate-500 font-medium tracking-wide">
                    Jangan khawatir, kami akan mengirimkan instruksi pemulihan.
                  </p>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Mail size={14} className="text-blue-500" /> Email Terdaftar
                  </label>
                  <input 
                    type="email" 
                    placeholder="guru@sekolah.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-5 text-base font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-base font-bold hover:bg-black shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] tracking-wide gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Disc3 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Kirim Instruksi <Send size={18} className="ml-1" /></>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Terkirim!</h2>
              <p className="text-slate-500 font-medium mb-8">
                Kami telah mengirimkan tautan pemulihan ke <span className="text-slate-900 font-bold">{email}</span>. Silakan cek kotak masuk Anda.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  Tidak menerima email? Kirim ulang
                </button>
                <div className="pt-2">
                  <Link 
                    href="/login"
                    className="w-full h-12 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    Kembali ke Login
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
            <Sparkles size={20} className="text-blue-500 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Gunakan email yang sama dengan yang Anda gunakan saat mendaftar akun pendidik EduBoard.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
