"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NextImage from "next/image";
import { 
  Users, CheckCircle2, Copy, Play, Loader2, Activity, LogOut 
} from "lucide-react";
import Link from "next/link";
import { useGameStore } from "../../store/gameStore";
import { toast } from "sonner";

export default function MissionControl() {
  const { 
    gameStatus, groups, roomCode, roomConfig, countdown, 
    startGame, endGame, resetToIdle, cancelRoom 
  } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success("Kode room disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
      {/* Lobby Dynamic Header */}
      <div className={`p-10 lg:p-12 text-white relative overflow-hidden transition-colors duration-500 ${gameStatus === 'PLAYING' ? 'bg-gradient-to-br from-[#2c49c5] to-[#1a34a8]' : 'bg-gradient-to-br from-emerald-600 to-teal-700'}`}>
        {/* Decorative Mesh */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-32 -mt-32 blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-[60px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${gameStatus === 'PLAYING' ? 'bg-blue-300 animate-pulse' : 'bg-emerald-300 animate-pulse'}`} /> 
              {gameStatus === 'PLAYING' ? 'Misi Sedang Berjalan' : 'Sistem Siap Digunakan'}
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Pusat Kendali Room</h2>
            <p className="text-white/70 text-sm md:text-base font-medium max-w-md">
              Pantau peserta yang bergabung dan mulai petualangan saat semua tim sudah siap di posisi masing-masing.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl md:text-right flex flex-col items-start md:items-end group hover:bg-white/20 transition-all cursor-pointer" onClick={handleCopy}>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">Kode Akses Room</span>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black tracking-[0.2em] font-mono">{roomCode}</span>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {copied ? <CheckCircle2 size={18} className="text-emerald-300" /> : <Copy size={18} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 lg:p-10 space-y-10">
        {/* Registered Teams */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-[#2c49c5]" /> Tim Terdaftar ({groups.length} / {roomConfig.maxGroups})
            </h4>
            {groups.length > 0 && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-wider animate-pulse">Sinyal Aktif</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                </div>
                <p className="text-slate-400 font-bold italic text-sm">Menunggu tim pertama bergabung...</p>
              </div>
            ) : (
              groups.map((g, idx) => {
                const isOffline = g.isOffline;
                const isSurrendered = g.status === 'SURRENDERED';
                const isMyTurn = g.status === 'ACTIVE';

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    key={g.id} 
                    className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden ${isSurrendered ? 'opacity-50 grayscale' : isOffline ? 'opacity-80' : ''}`}
                    style={{ borderLeft: `4px solid ${isSurrendered ? '#94a3b8' : (g.color || '#2c49c5')}` }}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 relative overflow-hidden"
                        style={{ 
                          backgroundColor: `${isSurrendered ? '#f1f5f9' : (g.color || '#2c49c5') + '20'}`,
                          color: isSurrendered ? '#94a3b8' : (g.color || '#2c49c5'),
                          border: `1px solid ${isSurrendered ? '#e2e8f0' : (g.color || '#2c49c5') + '40'}`
                        }}
                      >
                        <NextImage 
                          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${g.avatar || g.name}`} 
                          alt={g.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover scale-110 translate-y-1"
                          unoptimized
                        />

                        {/* Status Overlays */}
                        {isOffline && !isSurrendered && (
                          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                            <span className="text-[7px] font-black text-white uppercase tracking-tighter">OFF</span>
                          </div>
                        )}
                        {isSurrendered && (
                          <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center">
                            <span className="text-[7px] font-black text-white uppercase tracking-tighter italic">OUT</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h5 className={`font-black text-slate-900 truncate transition-colors ${isSurrendered ? 'line-through' : ''}`}>
                          {g.name}
                        </h5>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Skor: <span className="text-slate-900" style={{ color: isSurrendered ? '#94a3b8' : (g.color || '#2c49c5') }}>{g.score} PT</span>
                        </div>
                      </div>
                      <div 
                        className={`w-2 h-2 rounded-full ${isMyTurn ? "animate-pulse" : ""}`} 
                        style={{ 
                          backgroundColor: isSurrendered ? '#94a3b8' : (isOffline ? '#f59e0b' : (g.color || '#10b981')),
                          boxShadow: isMyTurn ? `0 0 8px ${g.color || '#10b981'}` : 'none'
                        }} 
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-8 border-t border-slate-100">
          {gameStatus === 'LOBBY' ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${groups.length >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Kesiapan Misi</p>
                  <p className="text-[10px] font-bold text-slate-400">{groups.length >= 1 ? 'Minimal 1 tim telah bergabung' : 'Harap tunggu minimal 1 tim'}</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative group">
                  <AnimatePresence mode="wait">
                    {!showCancelConfirm ? (
                      <motion.button 
                        key="btn-cancel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full md:w-auto px-6 py-5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-black rounded-2xl transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                      >
                        <Activity size={16} /> Ganti Room
                      </motion.button>
                    ) : (
                      <motion.div 
                        key="confirm-cancel"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-2 p-1 bg-red-50 rounded-2xl border border-red-100"
                      >
                        <button 
                          onClick={() => {
                            cancelRoom(roomCode);
                            setShowCancelConfirm(false);
                          }}
                          className="px-4 py-4 bg-red-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
                        >
                          Ya, Ganti
                        </button>
                        <button 
                          onClick={() => setShowCancelConfirm(false)}
                          className="px-4 py-4 bg-white text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                          Tutup
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button 
                  onClick={startGame} 
                  disabled={groups.length === 0 || countdown !== null} 
                  className="w-full md:w-auto px-12 py-5 bg-[#2c49c5] hover:bg-[#1a34a8] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4 text-base uppercase tracking-widest group"
                >
                  {countdown !== null ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5"/> {countdown} DETIK
                    </>
                  ) : (
                    <>
                      <Play size={20} className="fill-current group-hover:scale-110 transition-transform" /> MULAI MISI
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href={`/board?roomCode=${roomCode}&role=guru`} className="py-5 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl hover:border-[#2c49c5] hover:text-[#2c49c5] transition-all flex items-center justify-center gap-3 shadow-sm uppercase tracking-widest text-sm">
                <Activity size={18} /> Buka Papan Pantau
              </Link>
              <button onClick={endGame} className="py-5 bg-red-50 text-red-600 border border-red-100 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm uppercase tracking-widest text-sm">
                <LogOut size={18} /> Akhiri Permainan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
