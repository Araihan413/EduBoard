"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { 
  Users, 
  Loader2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ChevronLeft,
  Paintbrush,
  UserCircle2,
  Rocket,
  Hash,
  Gamepad2,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../../store/gameStore";

const AVATAR_SEEDS = [
  "Axe", "Cavalier", "Explorer", "Lulu", "Midnight", "Pepper", "Ria", "Salty", "Willow", "Snuggles",
  "Buddy", "Daisy", "Lucky", "Max", "Oliver", "Pixel", "Shadow", "Zoe"
];

const PREMIUM_COLORS = [
  { name: "Blue", hex: "#3b82f6", bg: "bg-blue-500", shadow: "shadow-blue-500/20" },
  { name: "Red", hex: "#ef4444", bg: "bg-red-500", shadow: "shadow-red-500/20" },
  { name: "Emerald", hex: "#10b981", bg: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
  { name: "Amber", hex: "#f59e0b", bg: "bg-amber-500", shadow: "shadow-amber-500/20" },
  { name: "Purple", hex: "#8b5cf6", bg: "bg-purple-500", shadow: "shadow-purple-500/20" },
  { name: "Pink", hex: "#ec4899", bg: "bg-pink-500", shadow: "shadow-pink-500/20" },
  { name: "Orange", hex: "#f97316", bg: "bg-orange-500", shadow: "shadow-orange-500/20" },
  { name: "Cyan", hex: "#06b6d4", bg: "bg-cyan-500", shadow: "shadow-cyan-500/20" },
  { name: "Rose", hex: "#f43f5e", bg: "bg-rose-500", shadow: "shadow-rose-500/20" },
  { name: "Indigo", hex: "#6366f1", bg: "bg-indigo-500", shadow: "shadow-indigo-500/20" },
  { name: "Teal", hex: "#14b8a6", bg: "bg-teal-500", shadow: "shadow-teal-500/20" },
  { name: "Slate", hex: "#64748b", bg: "bg-slate-500", shadow: "shadow-slate-500/20" },
];

export default function LobbyPage() {
  const router = useRouter();
  const { 
    gameStatus, 
    joinRoom, 
    groups, 
    roomConfig, 
    isMuted, 
    toggleMute, 
    countdown,
    myGroupName,
    roomCode: storeRoomCode,
    setStateFromSync,
    updateGroups
  } = useGameStore();
  
  // Form State
  const [roomCode, setRoomCode] = useState("");
  const [groupName, setGroupName] = useState("");
  
  // Step 1: Entry, Step 2: Lobby
  const [step, setStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  
  // Customization (local while joining, then synced)
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(PREMIUM_COLORS[0]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-step if already joined and set unique defaults
  useEffect(() => {
    if (myGroupName && storeRoomCode) {
      // Use setTimeout to avoid synchronous setState warning (cascading renders)
      const timer = setTimeout(() => {
        if (step === 1) setStep(2);
        
        const me = groups.find(g => g.name === myGroupName);
        const myIndexInGroups = groups.findIndex(g => g.name === myGroupName);

        if (me) {
          // If we have synced data, use it
          if (me.avatar) {
            const idx = AVATAR_SEEDS.indexOf(me.avatar);
            if (idx !== -1 && avatarIndex !== idx) setAvatarIndex(idx);
          } else if (myIndexInGroups !== -1) {
            // If no synced avatar yet, set a unique default based on join order
            const defaultIdx = myIndexInGroups % 10;
            if (avatarIndex !== defaultIdx) {
              setAvatarIndex(defaultIdx);
            }
            
            // Also set a unique default color
            const colorIdx = myIndexInGroups % PREMIUM_COLORS.length;
            const defaultColor = PREMIUM_COLORS[colorIdx];
            if (selectedColor.hex !== defaultColor.hex) {
              setSelectedColor(defaultColor);
            }

            // Sync these defaults immediately
            const { updateGroup } = useGameStore.getState();
            updateGroup(me.id, { 
              avatar: AVATAR_SEEDS[defaultIdx], 
              color: defaultColor.hex 
            });
          }

          if (me.color) {
            const col = PREMIUM_COLORS.find(c => c.hex === me.color);
            if (col && selectedColor.hex !== col.hex) {
              setSelectedColor(col);
            }
          }
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [myGroupName, storeRoomCode, groups, step, avatarIndex, selectedColor]);

  // Monitor status to auto-redirect
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      router.push("/board");
    }
  }, [gameStatus, router]);

  // Audio Logic
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isMuted]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    // Join without explicit avatar/color to let the Lobby logic assign unique defaults
    joinRoom(
      roomCode.trim().toUpperCase(), 
      groupName
    );
    setStep(2);
  };

  const updateProfile = (newAvatarIdx: number, newColor: typeof PREMIUM_COLORS[0]) => {
    setAvatarIndex(newAvatarIdx);
    setSelectedColor(newColor);
    
    // Sync to other players via a more specific update
    const me = groups.find(g => g.name === myGroupName);
    if (me) {
      const { updateGroup } = useGameStore.getState();
      updateGroup(me.id, { 
        avatar: AVATAR_SEEDS[newAvatarIdx], 
        color: newColor.hex 
      });
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] pt-24 pb-8 px-4 relative overflow-hidden font-sans">
      {/* Premium Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100/40 blur-[100px] rounded-full" />
      </div>

      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        loop 
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" 
      />

      {/* Control Bar */}
      <div className="fixed top-24 right-6 flex items-center gap-3 z-50">
        <button 
          onClick={toggleMute}
          className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all active:scale-90"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <div className="relative w-full max-w-xl z-10">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="join"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-xl shadow-slate-200/40 relative"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                  <Gamepad2 size={24} />
                </div>
                <h1 className="text-lg font-bold text-slate-800">Masuk ke Ruang Game</h1>
                <p className="text-sm text-slate-500">Masukkan kode untuk bergabung dengan teman.</p>
              </div>

              <form onSubmit={handleJoin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Hash size={12} className="text-blue-500" /> Kode Room
                  </label>
                  <input 
                    type="text" 
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="XXXXXX"
                    maxLength={6}
                    required
                    className="w-full h-12 text-center text-lg tracking-[0.3em] font-mono font-bold uppercase rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Users size={12} className="text-blue-500" /> Nama Tim
                  </label>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Contoh: Tim Rajawali"
                    required
                    className="w-full h-12 px-4 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 group"
                >
                  Masuk Lobby <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Profile Customization Section */}
              <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-xl shadow-slate-200/40">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Avatar Picker */}
                  <div className="relative group">
                    <div className={`w-28 h-28 rounded-2xl ${selectedColor.bg} ${selectedColor.shadow} shadow-md transition-all duration-500 relative z-10 overflow-hidden`}>
                      <NextImage 
                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${AVATAR_SEEDS[avatarIndex]}`} 
                        alt="My Avatar" 
                        width={112}
                        height={112}
                        className="w-full h-full object-cover scale-110 translate-y-2"
                        unoptimized // SVGs don't need optimization and dicebear returns SVGs
                      />
                    </div>
                    
                    <button 
                      onClick={() => updateProfile(avatarIndex > 0 ? avatarIndex - 1 : AVATAR_SEEDS.length - 1, selectedColor)}
                      className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center z-20 hover:bg-slate-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => updateProfile(avatarIndex < AVATAR_SEEDS.length - 1 ? avatarIndex + 1 : 0, selectedColor)}
                      className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center z-20 hover:bg-slate-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="flex-1 space-y-4 text-center md:text-left w-full">
                    <div>
                      <h2 className="text-base font-bold text-slate-800">{myGroupName}</h2>
                      <p className="text-[10px] text-slate-500">Sesuaikan identitas tim kamu</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 justify-center md:justify-start">
                        <Paintbrush size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warna Tim</span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {PREMIUM_COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => updateProfile(avatarIndex, c)}
                            className={`w-6 h-6 rounded-full ${c.bg} transition-all relative ${selectedColor.hex === c.hex ? 'ring-2 ring-slate-100 ring-offset-2 scale-110' : 'opacity-60 hover:opacity-100'}`}
                          >
                            {selectedColor.hex === c.hex && <Check size={12} className="text-white absolute inset-0 m-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lobby Status Section */}
              <div className="bg-slate-50/50 border border-slate-200/40 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ruang Tunggu</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room:</span>
                        <span className="text-sm font-black text-blue-600 tracking-widest font-mono">{storeRoomCode}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-slate-100">
                    {groups.length} / {roomConfig.maxGroups} Tim
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {groups.map((g) => (
                    <motion.div
                      layout
                      key={g.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-slate-200 p-2 rounded-2xl flex items-center gap-3"
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex-shrink-0" 
                        style={{ backgroundColor: g.color || '#e2e8f0' }}
                      >
                        <NextImage 
                          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${g.avatar || g.name}`} 
                          alt={g.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover rounded-lg"
                          unoptimized
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate">{g.name}</span>
                    </motion.div>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - groups.length) }).map((_, i) => (
                    <div key={i} className="border border-dashed border-slate-200 p-2 rounded-2xl flex items-center gap-3 opacity-40">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                      <div className="h-2 w-12 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col items-center">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-2" />
                  <p className="text-xs text-slate-400 font-medium italic">Menunggu instruksi Guru untuk memulai...</p>
                </div>
              </div>

              {/* Tip */}
              <div className="flex items-center justify-center gap-2 text-slate-300">
                <Sparkles size={14} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Tip: Pastikan volume kamu aktif!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-8xl font-black italic tracking-tighter"
            >
              {countdown === 0 ? "MULAI!" : countdown}
            </motion.div>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "200px" }}
              className="h-1 bg-blue-500 mt-8 rounded-full"
            />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Menyiapkan Arena</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
