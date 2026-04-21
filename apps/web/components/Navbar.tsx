"use client";

import { usePathname } from "next/navigation";
import { 
  Sparkles, 
  Info, 
  HelpCircle, 
  Gamepad2,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname();

  // Hide Navbar strictly on game flow and auth pages
  const hiddenPaths = ["/board", "/dashboard"];
  if (hiddenPaths.includes(pathname)) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-[100] flex items-center justify-between px-8 lg:px-12 shadow-sm">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 bg-[#2c49c5] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
          <Sparkles className="w-6 h-6 text-[#ffda59]" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 group-hover:text-[#2c49c5] transition-colors">
            EduBoard <span className="text-slate-400 font-medium">PAI</span>
          </h1>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#2c49c5]">Premium Edition</p>
        </div>
      </Link>

      {/* Links */}
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

      {/* Buttons */}
      <div className="flex items-center gap-4">
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
    </nav>
  );
}
