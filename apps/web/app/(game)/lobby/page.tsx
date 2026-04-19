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
    if (isJoined && gameStatus === 'PLAYING') {
      router.push("/board");
    }
  }, [gameStatus, isJoined, router]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate with store's roomCode
    if (roomCode.trim().toUpperCase() === storeRoomCode) {
      joinRoom(groupName);
      setIsJoined(true);
    } else {
      alert("Kode Room salah atau belum dibuat Guru!");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
      {/* Glow Effect Background */}
      <div className="absolute inset-0 bg-blue-900/10 blur-[100px] pointer-events-none rounded-full w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative w-full max-w-lg bg-zinc-900/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] border border-zinc-800 text-center">
        
        {!isJoined ? (
          <>
            <div className="mx-auto bg-blue-500/10 border border-blue-500/20 p-5 rounded-full w-24 h-24 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(59,130,246,0.4)]">
              <Users className="w-12 h-12 text-blue-400" />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">
              Bergabung ke Misi
            </h1>
            <p className="text-zinc-400 mb-8 text-sm">
              Input kode akses dari Gurumu untuk memulai.
            </p>

            <form className="space-y-6 text-left" onSubmit={handleJoin}>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2">Kode Room</label>
                <input 
                  type="text" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="X7K9P2"
                  maxLength={6}
                  required
                  className="w-full h-14 text-center text-2xl tracking-[0.2em] font-mono font-bold uppercase rounded-2xl border border-zinc-700 bg-zinc-950/50 text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2">Nama Tim / Kelompok</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Misal: Ibnu Sina"
                  required
                  className="w-full h-14 px-5 rounded-2xl border border-zinc-700 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full h-14 mt-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all scale-[0.98] hover:scale-100"
              >
                MASUK LOBBY
              </button>
            </form>
          </>
        ) : (
          <div className="py-12 flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-8" />
            <h2 className="text-2xl font-bold text-white mb-2">Menunggu Guru...</h2>
            <p className="text-zinc-400 mb-8 max-w-sm">
              Kamu sudah terdaftar sebagai <strong className="text-blue-400">{groupName}</strong>. 
              Permainan akan dimulai sesaat lagi!
            </p>
            <div className="bg-zinc-950/50 w-full rounded-2xl p-4 border border-zinc-800">
               <h3 className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">Peserta yang sudah bergabung ({groups.length}/{roomConfig.maxGroups}):</h3>
               <div className="flex flex-wrap gap-2 justify-center">
                 {groups.map(g => (
                   <span key={g.id} className="bg-zinc-800 text-zinc-300 px-3 py-1 text-xs font-medium rounded-full border border-zinc-700">
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
}
