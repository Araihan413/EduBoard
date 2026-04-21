"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2 } from "lucide-react";
import { useGameStore } from "../../../store/gameStore";

export default function LobbyPage() {
  const router = useRouter();
  const { gameStatus, joinRoom, groups, roomCode: storeRoomCode, roomConfig } = useGameStore();
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
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white bg-grid p-4">
      {/* Subtle Glow Effect background */}
      <div className="absolute inset-0 bg-[#2c49c5]/5 pointer-events-none rounded-full w-full h-full" />

      <div className="relative w-full max-w-lg bg-white/90 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl shadow-[#2c49c5]/10 border border-slate-100 text-center">
        
        {!isJoined ? (
          <>
            <div className="mx-auto bg-blue-50 border border-blue-100 p-6 rounded-[2rem] w-28 h-28 flex items-center justify-center mb-8 shadow-xl shadow-blue-500/10">
              <Users className="w-14 h-14 text-[#2c49c5]" />
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">
              Bergabung ke Misi
            </h1>
            <p className="text-slate-500 mb-10 text-base font-medium">
              Masukkan kode akses dari Gurumu untuk mulai bermain.
            </p>

            <form className="space-y-8 text-left" onSubmit={handleJoin}>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Kode Room</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="X7K9P2"
                    maxLength={6}
                    required
                    className="w-full h-16 text-center text-3xl tracking-[0.3em] font-mono font-black uppercase rounded-2xl border-2 border-slate-100 bg-slate-50 text-[#2c49c5] placeholder:text-slate-200 focus:outline-none focus:border-[#2c49c5] focus:ring-4 focus:ring-[#2c49c5]/5 transition-all" 
                  />
                  {/* Yellow detail */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#ffda59] rounded-full group-focus-within:w-16 transition-all" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Nama Tim / Kelompok</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Misal: Ibnu Sina"
                  required
                  className="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#2c49c5] focus:ring-4 focus:ring-[#2c49c5]/5 transition-all" 
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full h-16 mt-4 inline-flex items-center justify-center rounded-[2rem] bg-[#2c49c5] text-white text-xl font-black hover:bg-[#1a34a8] hover:shadow-2xl hover:shadow-[#2c49c5]/40 focus:outline-none transition-all transform active:scale-95"
              >
                MASUK LOBBY
              </button>
            </form>
          </>
        ) : (
          <div className="py-12 flex flex-col items-center">
            <div className="relative mb-10">
              <Loader2 className="w-20 h-20 text-[#2c49c5] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-[#ffda59] rounded-full animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">Menunggu Guru...</h2>
            <p className="text-slate-500 mb-10 text-lg">
              Kamu sudah terdaftar sebagai <strong className="text-[#2c49c5]">{groupName}</strong>. 
              Misi akan segera dimulai!
            </p>
            <div className="bg-slate-50 w-full rounded-[2rem] p-6 border border-slate-100">
               <h3 className="text-xs text-slate-400 font-black uppercase tracking-wider mb-5">Peserta yang sudah bergabung ({groups.length}/{roomConfig.maxGroups}):</h3>
               <div className="flex flex-wrap gap-2 justify-center">
                 {groups.map(g => (
                   <span key={g.id} className="bg-white text-slate-700 px-4 py-2 text-sm font-bold rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-[#ffda59] rounded-full" />
                     {g.name}
                   </span>
                 ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  );
}
