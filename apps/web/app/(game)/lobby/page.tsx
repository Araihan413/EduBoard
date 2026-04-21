"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { useGameStore } from "../../../store/gameStore";

export default function LobbyPage() {
  const router = useRouter();
  const { gameStatus, joinRoom, groups, roomConfig } = useGameStore();
  const [roomCode, setRoomCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  // Monitor status to auto-redirect
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      router.push("/board");
    }
  }, [gameStatus, router]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    // Use the typed room code directly since Socket.IO isn't broadcasting everything globally like BroadcastChannel did
    joinRoom(roomCode.trim().toUpperCase(), groupName);
    setIsJoined(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-transparent p-6 pt-30 relative overflow-hidden">
      {/* Premium Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffda59]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#2c49c5]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-xl bg-white border border-slate-100 p-12 rounded-2xl shadow-2xl shadow-slate-200/50 text-center">
        {/* Top branding */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
           <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-lg">
               <Sparkles className="w-5 h-5 text-[#ffda59]" />
           </div>
        </div>
        
        {!isJoined ? (
          <>
            <div className="mx-auto bg-blue-50 border-4 border-white p-8 rounded-2xl w-24 h-24 flex items-center justify-center mb-10 shadow-xl shadow-blue-500/10">
              <Users className="w-12 h-12 text-[#2c49c5]" />
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
              Pusat Kendali Misi
            </h1>
            <p className="text-slate-500 mb-10 font-medium text-lg">
              Masukkan kode transmisi untuk bergabung dalam game.
            </p>

            <form className="space-y-8 text-left" onSubmit={handleJoin}>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2 flex items-center gap-2">
                   <ShieldCheck className="w-3 h-3 text-[#2c49c5]" /> KODE AKSES ROOM
                </label>
                <input 
                  type="text" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="XXXXXX"
                  maxLength={6}
                  required
                  className="w-full h-16 text-center text-3xl tracking-[0.3em] font-mono font-black uppercase rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 placeholder:text-slate-200 focus:outline-none focus:border-[#2c49c5] focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all shadow-inner" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2">IDENTITAS TIM / KELOMPOK</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Masukkan nama tim kamu..."
                  required
                  className="w-full h-16 px-6 font-black rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#2c49c5] focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all shadow-inner" 
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full h-16 mt-6 inline-flex items-center justify-center rounded-xl bg-[#2c49c5] text-white text-xl font-black hover:bg-[#1a34a8] shadow-xl shadow-[#2c49c5]/30 focus:outline-none transition-all hover:scale-[1.02] active:scale-[0.98] tracking-tight"
              >
                SIAP BERGABUNG SEKARANG
              </button>
            </form>
          </>
        ) : (
          <div className="py-16 flex flex-col items-center">
            <div className="relative mb-10">
               <Loader2 className="w-24 h-24 text-[#2c49c5] animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                   <Users className="w-8 h-8 text-[#ffda59]" />
               </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Koneksi Berhasil!</h2>
            <p className="text-slate-500 mb-10 max-w-sm text-lg font-medium">
              Kamu sudah terdaftar sebagai <span className="text-[#2c49c5] bg-blue-50 px-4 py-1 rounded-lg font-black">{groupName}</span>. 
              Harap tenang, game akan segera dimulai.
            </p>
            <div className="bg-slate-50 w-full rounded-2xl p-8 border border-slate-100 shadow-inner">
               <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 justify-center">
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                   TIM LAIN YANG SUDAH ONLINE ({groups.length}/{roomConfig.maxGroups})
               </h3>
               <div className="flex flex-wrap gap-3 justify-center">
                 {groups.length === 0 ? (
                   <span className="text-slate-300 text-xs italic font-bold">Menunggu tim lainnya...</span>
                 ) : (
                   groups.map(g => (
                     <span key={g.id} className="bg-white text-slate-600 px-5 py-2.5 text-sm font-black rounded-xl border border-slate-200 shadow-sm">
                       {g.name}
                     </span>
                   ))
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
