"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  Info, 
  HelpCircle, 
  Gamepad2,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMenuOpen]);

  // Hide Navbar strictly on game flow and auth pages
  const hiddenPaths = ["/board", "/dashboard"];
  if (hiddenPaths.includes(pathname)) return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-[100] flex items-center justify-between px-6 md:px-8 lg:px-12 shadow-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group relative z-[110]">
          <Image 
            src="/edupai-quest.png" 
            alt="EduBoard PAI Logo" 
            width={160}
            height={40}
            priority
            style={{ height: '60px', width: 'auto' }}
            className="object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/guide"
            className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${pathname === '/guide' ? 'text-[#2c49c5]' : 'text-slate-500 hover:text-[#2c49c5]'}`}
          >
            <HelpCircle className="w-4 h-4" />
            Panduan
          </Link>
          <Link 
            href="/about"
            className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${pathname === '/about' ? 'text-[#2c49c5]' : 'text-slate-500 hover:text-[#2c49c5]'}`}
          >
            <Info className="w-4 h-4" />
            Tentang Game
          </Link>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#2c49c5] transition-all px-4 py-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link 
            href="/lobby" 
            className="bg-[#2c49c5] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1a34a8] transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2"
          >
            <Gamepad2 className="w-4 h-4" />
            Mulai Main
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden relative z-[110] w-10 h-10 flex items-center justify-center text-slate-900"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-white pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Navigasi Utama</p>
              
              <Link 
                href="/guide"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center justify-between p-4 rounded-2xl ${pathname === '/guide' ? 'bg-blue-50 text-[#2c49c5]' : 'text-slate-600 active:bg-slate-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/guide' ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                    <HelpCircle size={20} />
                  </div>
                  <span className="font-bold">Panduan Bermain</span>
                </div>
                <ChevronRight size={18} className="opacity-30" />
              </Link>

              <Link 
                href="/about"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center justify-between p-4 rounded-2xl ${pathname === '/about' ? 'bg-blue-50 text-[#2c49c5]' : 'text-slate-600 active:bg-slate-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/about' ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                    <Info size={20} />
                  </div>
                  <span className="font-bold">Tentang EduBoard</span>
                </div>
                <ChevronRight size={18} className="opacity-30" />
              </Link>

              <div className="h-px bg-slate-100 my-4 mx-2" />

              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Akses Cepat</p>

              <Link 
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-4 p-4 text-slate-600 active:bg-slate-50 rounded-2xl"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <LayoutDashboard size={20} />
                </div>
                <span className="font-bold">Dashboard Guru</span>
              </Link>

              <Link 
                href="/lobby"
                onClick={() => setIsMenuOpen(false)}
                className="mt-4 flex items-center justify-center gap-3 p-5 bg-[#2c49c5] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
              >
                <Gamepad2 size={20} />
                Mulai Bermain
              </Link>
            </div>

            {/* Mobile Footer */}
            <div className="absolute bottom-8 left-0 right-0 px-6 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">EduBoard PAI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
