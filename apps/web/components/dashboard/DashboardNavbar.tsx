"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, Database, History, LogOut, Menu, X, ChevronDown 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

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

  const navItems = [
    { id: 'SESI', label: 'Sesi Aktif', icon: LayoutDashboard },
    { id: 'SOAL', label: 'Bank Soal', icon: Database },
    { id: 'RIWAYAT', label: 'Riwayat Sesi', icon: History },
  ] as const;

  const handleExit = () => {
    resetToIdle();
    setActiveTab('SESI');
    router.push('/');
    setShowConfirmExit(false);
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
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowConfirmExit(true)}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <LogOut size={16} />
              Keluar Sesi
            </button>

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
              className="absolute top-24 left-0 right-0 bg-white border-b border-slate-100 shadow-2xl p-6 lg:hidden"
            >
              <div className="flex flex-col gap-2">
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
                
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowConfirmExit(true);
                  }}
                  className="flex items-center gap-4 p-5 text-red-500 bg-red-50 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <LogOut size={20} />
                  </div>
                  Keluar Sesi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Confirmation Modal */}
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
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogOut size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Keluar dari Sesi?</h3>
                <p className="text-slate-500 font-medium mb-8">
                  Data sesi aktif akan direset dan Anda akan kembali ke Setup Hub. Pastikan permainan telah selesai.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowConfirmExit(false)}
                    className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleExit}
                    className="py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 transition-all uppercase tracking-widest text-xs"
                  >
                    Ya, Keluar
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
