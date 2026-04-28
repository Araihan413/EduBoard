"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { 
  Users, 
  Loader2,
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ChevronLeft,
  Paintbrush,
  Rocket,
  Hash,
  Gamepad2,
  Check,
  Disc3,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../../store/gameStore";

import { AVATAR_SEEDS, PREMIUM_COLORS } from "../../../lib/constants";

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
    isGuru,
    roomCode: storeRoomCode,
    updateGroup,
    leaveRoom,
    fetchQuestions,
  } = useGameStore();

  useEffect(() => {
    if (isGuru && storeRoomCode && roomConfig.questionSetId) {
      fetchQuestions(roomConfig.questionSetId);
    }
  }, [isGuru, storeRoomCode, fetchQuestions, roomConfig.questionSetId]);
  
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [groupNameInput, setGroupNameInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [step, setStep] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Modern React 18 hydration detection (Avoids cascading renders)
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  
  const [avatarIndex, setAvatarIndex] = useState(() => {
    // Initialize from store if available to prevent flickering on refresh
    const savedAvatar = useGameStore.getState().myAvatar;
    if (savedAvatar) {
      const idx = AVATAR_SEEDS.indexOf(savedAvatar);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });

  const [selectedColor, setSelectedColor] = useState(() => {
    const savedColor = useGameStore.getState().myColor;
    if (savedColor) {
      const col = PREMIUM_COLORS.find(c => c.hex === savedColor);
      return col || PREMIUM_COLORS[0];
    }
    return PREMIUM_COLORS[0];
  });

  // Auto-recovery & Sync local customization with store
  useEffect(() => {
    if (!isMounted) return;

    // Use store's isGuru field — NOT localStorage — to avoid same-browser tab confusion
    // where a student tab incorrectly inherits the guru's localStorage key.
    if (storeRoomCode && gameStatus !== 'FINISHED' && gameStatus !== 'IDLE') {
      const canProceed = isGuru || (myGroupName && myGroupName !== '');
      
      if (canProceed) {
        // Defer state updates to avoid synchronous cascading renders
        const timer = setTimeout(() => {
          setStep(2);
          
          // Sync customization from store to local state
          const currentMyAvatar = useGameStore.getState().myAvatar;
          const currentMyColor = useGameStore.getState().myColor;

          if (currentMyAvatar) {
            const idx = AVATAR_SEEDS.indexOf(currentMyAvatar);
            if (idx !== -1 && avatarIndex !== idx) setAvatarIndex(idx);
          }
          if (currentMyColor) {
            const col = PREMIUM_COLORS.find(c => c.hex === currentMyColor);
            if (col && selectedColor.hex !== col.hex) setSelectedColor(col);
          }

          // Also try to sync from groups array if available (source of truth from server)
          if (myGroupName && groups.length > 0) {
            const me = groups.find(g => g.name === myGroupName);
            if (me) {
              if (me.avatar) {
                const idx = AVATAR_SEEDS.indexOf(me.avatar);
                if (idx !== -1 && avatarIndex !== idx) setAvatarIndex(idx);
              }
              if (me.color) {
                const col = PREMIUM_COLORS.find(c => c.hex === me.color);
                if (col && selectedColor.hex !== col.hex) setSelectedColor(col);
              }
            }
          }
        }, 0);
        return () => clearTimeout(timer);
      }
    } else {
      // Defer state update to avoid cascading renders
      const timer = setTimeout(() => {
        if (step !== 1) setStep(1);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isMounted, storeRoomCode, gameStatus, myGroupName, isGuru, groups, avatarIndex, selectedColor, step]);

  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      router.push("/board");
    }
    // Room full: server resets state to IDLE, bring user back to entry form
    if (gameStatus === 'IDLE' && step === 2) {
      const t = setTimeout(() => setStep(1), 0);
      return () => clearTimeout(t);
    }
  }, [gameStatus, router, step]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    
    // Pilih avatar dan warna acak saat pertama kali masuk
    const randomAvatarIdx = Math.floor(Math.random() * AVATAR_SEEDS.length);
    const randomColor = PREMIUM_COLORS[Math.floor(Math.random() * PREMIUM_COLORS.length)];
    
    setAvatarIndex(randomAvatarIdx);
    setSelectedColor(randomColor);

    try {
      await joinRoom(
        roomCodeInput.trim().toUpperCase(), 
        groupNameInput,
        AVATAR_SEEDS[randomAvatarIdx],
        randomColor.hex
      );
      setStep(2);
    } catch {
      // Error is handled in store via toast
    } finally {
      setIsJoining(false);
    }
  };

  const updateProfile = (newAvatarIdx: number, newColor: typeof PREMIUM_COLORS[0]) => {
    setAvatarIndex(newAvatarIdx);
    setSelectedColor(newColor);
    
    const me = groups.find(g => g.name === myGroupName);
    if (me) {
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
              className="bg-white border border-slate-200/60 p-8 rounded-3xl shadow-xl shadow-slate-200/40 relative"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-100">
                  <Gamepad2 size={32} />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Akses Misi Siswa</h1>
                <p className="text-sm text-slate-500 font-medium">Gunakan kode dari Guru untuk memulai petualangan.</p>
              </div>

              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Hash size={14} className="text-blue-500" /> Kode Ruang
                  </label>
                  <input 
                    type="text" 
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    placeholder="XXXXXX"
                    maxLength={6}
                    required
                    className="w-full h-14 text-center text-2xl tracking-[0.4em] font-mono font-black uppercase rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-500" /> Nama Kelompok / Siswa
                  </label>
                  <input 
                    type="text" 
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    placeholder="Contoh: Tim Abu Bakar"
                    required
                    className="w-full h-14 px-6 text-lg font-bold rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isJoining}
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-base hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex items-center justify-center gap-3 group disabled:opacity-70"
                >
                  {isJoining ? (
                    <Disc3 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>Masuk Arena <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                  )}
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
              <div className="bg-white border border-slate-200/60 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="relative">
                    <div className={`w-32 h-32 rounded-[2rem] ${selectedColor.bg} ${selectedColor.shadow} shadow-lg transition-all duration-500 relative z-10 overflow-hidden`}>
                      <NextImage 
                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${AVATAR_SEEDS[avatarIndex]}`} 
                        alt="Avatar" 
                        width={128}
                        height={128}
                        className="w-full h-full object-cover scale-110 translate-y-3"
                        unoptimized
                      />
                    </div>
                    
                    <button 
                      onClick={() => updateProfile(avatarIndex > 0 ? avatarIndex - 1 : AVATAR_SEEDS.length - 1, selectedColor)}
                      className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center z-20 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft size={20} className="text-slate-400" />
                    </button>
                    <button 
                      onClick={() => updateProfile(avatarIndex < AVATAR_SEEDS.length - 1 ? avatarIndex + 1 : 0, selectedColor)}
                      className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center z-20 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight size={20} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-5 text-center md:text-left w-full">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{myGroupName}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Identitas Petualang</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Paintbrush size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema Warna Tim</span>
                      </div>
                      <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                        {PREMIUM_COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => updateProfile(avatarIndex, c)}
                            className={`w-7 h-7 rounded-full ${c.bg} transition-all relative ${selectedColor.hex === c.hex ? 'ring-4 ring-white shadow-md scale-125 z-10' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
                          >
                            {selectedColor.hex === c.hex && <Check size={14} className="text-white absolute inset-0 m-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lobby Status Section */}
              <div className="bg-slate-50/80 border border-slate-200/40 p-8 rounded-[2.5rem] backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sinyal Terhubung</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-bold text-slate-400">ROOM ID:</span>
                      <span className="text-lg font-black text-blue-600 tracking-widest font-mono">{storeRoomCode}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                    <Users size={14} className="text-blue-500" />
                    <span className="text-xs font-black text-slate-700">{groups.length} / {roomConfig.maxGroups}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {groups.map((g) => (
                    <motion.div
                      layout
                      key={g.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3 shadow-sm"
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden" 
                        style={{ backgroundColor: `${g.color || '#e2e8f0'}20` }}
                      >
                        <NextImage 
                          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${g.avatar || g.name}`} 
                          alt={g.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover scale-110 translate-y-1"
                          unoptimized
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" 
                          />
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">SIAP</span>
                        </div>
                        <span className="text-xs font-black text-slate-700 truncate leading-tight">{g.name}</span>
                      </div>
                    </motion.div>
                  ))}
                  {Array.from({ length: Math.max(0, roomConfig.maxGroups - groups.length) }).map((_, i) => (
                    <motion.div 
                      key={`empty-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative overflow-hidden group bg-slate-50/50 border-2 border-dashed border-slate-200 p-3 rounded-2xl flex items-center gap-3"
                    >
                      {/* Animated Shimmer/Pulse Background */}
                      <motion.div 
                        animate={{ 
                          opacity: [0.3, 0.5, 0.3],
                          scale: [1, 1.02, 1]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none" 
                      />

                      {/* Scanning Line Effect */}
                      <motion.div 
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 pointer-events-none"
                      />

                      {/* Skeleton UI Components */}
                      <div className="w-10 h-10 bg-slate-200/60 rounded-xl flex items-center justify-center relative z-10">
                        <motion.div 
                          animate={{ opacity: [0.2, 0.5, 0.2] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin-slow" 
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <div className="h-2 w-16 bg-slate-200/80 rounded-full" />
                        <div className="h-1.5 w-10 bg-slate-100 rounded-full" />
                      </div>

                      {/* Tiny Pinging Dot */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-slate-300 rounded-full animate-pulse" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col items-center">
                  <div className="relative mb-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <Rocket className="w-4 h-4 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-sm text-slate-500 font-bold italic text-center mb-8">Menunggu Guru meluncurkan misi...</p>
                  
                  <AnimatePresence mode="wait">
                    {!showExitConfirm ? (
                      <button 
                        onClick={() => setShowExitConfirm(true)}
                        className="px-8 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm border border-red-100"
                      >
                        <LogOut size={12} /> Keluar dari Ruang
                      </button>
                    ) : (
                      <motion.div 
                        key="confirm-exit"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center gap-3 p-1.5 bg-red-50 rounded-2xl border border-red-100"
                      >
                        <button 
                          onClick={() => {
                            if (storeRoomCode && myGroupName) {
                              leaveRoom(storeRoomCode, myGroupName);
                            }
                            setShowExitConfirm(false);
                            setStep(1);
                          }}
                          className="px-5 py-3 bg-red-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
                        >
                          Ya, Keluar
                        </button>
                        <button 
                          onClick={() => setShowExitConfirm(false)}
                          className="px-5 py-3 bg-white text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                          Batal
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-white"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-9xl font-black italic tracking-tighter"
            >
              {countdown === 0 ? "GO!" : countdown}
            </motion.div>
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-400">Sinkronisasi Arena</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
