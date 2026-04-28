"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, Database, History, LogOut, Menu, X, User as UserIcon, ChevronDown
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "../../lib/supabase/client";

import { useGameStore } from "../../store/gameStore";

interface DashboardNavbarProps {
  activeTab: 'SESI' | 'SOAL' | 'RIWAYAT';
  setActiveTab: (tab: 'SESI' | 'SOAL' | 'RIWAYAT') => void;
  resetToIdle: () => void;
}

export default function DashboardNavbar({ 
  activeTab, 
  setActiveTab, 
  resetToIdle 
}: DashboardNavbarProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  
  const { gameStatus, roomCode, endGame, cancelRoom } = useGameStore();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Guru");
      }
    };
    fetchUser();
  }, []);

  const navItems = [
    { id: 'SESI', label: 'Sesi Aktif', icon: LayoutDashboard },
    { id: 'SOAL', label: 'Bank Soal', icon: Database },
    { id: 'RIWAYAT', label: 'Riwayat Sesi', icon: History },
  ] as const;

  const handleExitSession = () => {
    // Otomatis batalkan atau selesaikan sesi di server
    if (gameStatus === 'PLAYING') {
      endGame();
    } else if (gameStatus === 'LOBBY' && roomCode) {
      cancelRoom(roomCode);
    }

    resetToIdle();
    setActiveTab('SESI');
    router.push('/');
    setShowConfirmExit(false);
  };

  const handleLogoutAccount = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-xl border-b border-slate-100 z-[150] shadow-sm">
        <div className="max-w-7xl mx-auto h-full px-6 md:px-8 lg:px-12 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-10">
            <button 
              onClick={() => setActiveTab('SESI')}
              className="flex items-center gap-3 group transition-transform active:scale-95"
            >
              <Image 
                src="/edupai-quest.png" 
                alt="EduBoard PAI Logo" 
                width={160}
                height={40}
                priority
                style={{ height: '60px', width: 'auto' }}
                className="object-contain transition-transform group-hover:scale-105"
              />
            </button>

            {/* Desktop Nav Items */}
            <div className="hidden lg:flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === item.id 
                      ? 'bg-[#2c49c5] text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4 relative">
            {userName && (
              <div className="relative group">
                <button 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`hidden md:flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl transition-all border ${
                    showUserDropdown 
                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                      : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2c49c5] flex items-center justify-center border border-blue-100">
                    <UserIcon size={18} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pengajar</span>
                    <span className="text-sm font-black text-slate-900 truncate max-w-[120px]">{userName}</span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`text-slate-400 transition-transform duration-300 ${showUserDropdown ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showUserDropdown && (
                    <>
                      {/* Invisible backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-[-1]" 
                        onClick={() => setShowUserDropdown(false)} 
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[160]"
                      >
                        <div className="p-2">
                          <button 
                            onClick={() => {
                              setShowUserDropdown(false);
                              setShowConfirmExit(true);
                            }}
                            className="w-full flex items-center gap-4 p-4 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-orange-100/50 flex items-center justify-center text-orange-500">
                              <LogOut size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-widest">Keluar Sesi</span>
                              <span className="text-[10px] text-slate-400 font-medium">Reset permainan aktif</span>
                            </div>
                          </button>

                          <button 
                            onClick={() => {
                              setShowUserDropdown(false);
                              setShowConfirmLogout(true);
                            }}
                            className="w-full flex items-center gap-4 p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-red-100/50 flex items-center justify-center text-red-500">
                              <LogOut size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-widest">Logout Akun</span>
                              <span className="text-[10px] text-slate-400 font-medium">Keluar dari sistem</span>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl border border-slate-100 shadow-sm"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 left-0 right-0 bg-white border-b border-slate-100 shadow-2xl p-6 lg:hidden max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide"
            >
              <div className="flex flex-col gap-2">
                {userName && (
                  <div className="flex items-center gap-4 p-5 mb-2 bg-blue-50 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl bg-white text-[#2c49c5] flex items-center justify-center shadow-sm">
                      <UserIcon size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Pengajar</span>
                      <span className="text-base font-black text-[#2c49c5] truncate">{userName}</span>
                    </div>
                  </div>
                )}
              
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-5 rounded-2xl transition-all ${
                      activeTab === item.id 
                        ? 'bg-blue-50 text-[#2c49c5]' 
                        : 'text-slate-600 active:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === item.id ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                        <item.icon size={20} />
                      </div>
                      <span className="font-black uppercase tracking-widest text-xs">{item.label}</span>
                    </div>
                  </button>
                ))}
                
                <div className="h-px bg-slate-100 my-4" />
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowConfirmExit(true);
                    }}
                    className="flex items-center gap-4 p-5 text-orange-600 bg-orange-50 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <LogOut size={20} />
                    </div>
                    <span>Keluar Sesi</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowConfirmLogout(true);
                    }}
                    className="flex items-center gap-4 p-5 text-red-600 bg-red-50 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <LogOut size={20} />
                    </div>
                    <span>Logout Akun</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Confirmation Modal - Exit Session */}
      <AnimatePresence>
        {showConfirmExit && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmExit(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogOut size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Keluar dari Sesi?</h3>
                <p className="text-slate-500 font-medium mb-8">
                  Data sesi aktif akan direset dan Anda akan kembali ke Beranda. Pastikan permainan telah selesai.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowConfirmExit(false)}
                    className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleExitSession}
                    className="py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 transition-all uppercase tracking-widest text-xs"
                  >
                    Ya, Keluar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal - Logout Account */}
      <AnimatePresence>
        {showConfirmLogout && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmLogout(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogOut size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Keluar dari Akun?</h3>
                <p className="text-slate-500 font-medium mb-8">
                  Anda akan keluar dari sistem dan harus login kembali untuk mengakses Dashboard.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowConfirmLogout(false)}
                    className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleLogoutAccount}
                    className="py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 transition-all uppercase tracking-widest text-xs"
                  >
                    Ya, Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
