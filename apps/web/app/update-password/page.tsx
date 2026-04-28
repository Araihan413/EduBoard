"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, Disc3, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sesi kadaluarsa atau tidak valid. Silakan minta reset password kembali.");
        router.push("/forgot-password");
      } else {
        setIsVerifying(false);
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    if (password.length < 6) {
      toast.error("Password minimal harus 6 karakter");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      toast.success("Password berhasil diperbarui!");
      
      // Logout after update for security, or just redirect
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push("/login?message=password_updated");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Disc3 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

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
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
            <ShieldCheck size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Perbarui Kata Sandi
            </h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">
              Masukkan kata sandi baru yang kuat untuk akun Anda.
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Lock size={14} className="text-blue-500" /> Kata Sandi Baru
            </label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-blue-500" /> Konfirmasi Sandi
            </label>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-5 text-base font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300" 
            />
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest ml-1">
              <AlertCircle size={14} /> Password tidak cocok
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading || !password || password !== confirmPassword}
              className="w-full h-12 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-base font-bold hover:bg-black shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] tracking-wide gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Disc3 className="w-5 h-5 animate-spin" />
              ) : (
                <>Simpan Password Baru <Sparkles size={18} className="text-amber-400" /></>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">EduBoard Security Protocol</p>
        </div>
      </motion.div>
    </div>
  );
}
