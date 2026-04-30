"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  Trophy, 
  Users, 
  ChevronRight, 
  ArrowLeft, 
  Hash, 
  Medal,
  Clock,
  History as HistoryIcon,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useGameStore } from "../../store/gameStore";

interface SessionType {
  id: string;
  date: string;
  roomCode: string;
  winner: string;
  winnerScore: number;
  totalGroups: number;
  leaderboard: any[];
}

export default function SessionHistory() {
  const { selectedSession, setSelectedSession } = useGameStore();
  const [history, setHistory] = useState<SessionType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.get("/api/rooms/history");
      
      const transformed: SessionType[] = data.map((room: any) => {
        const sortedGroups = [...room.groups].sort((a, b) => b.score - a.score);
        const winner = sortedGroups[0];
        
        return {
          id: room.id,
          date: new Date(room.createdAt).toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          roomCode: room.code,
          winner: winner?.name || 'N/A',
          winnerScore: winner?.score || 0,
          totalGroups: room.groups.length,
          leaderboard: sortedGroups
        };
      });

      setHistory(transformed);
    } catch (err) {
      toast.error("Gagal mengambil riwayat sesi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  const filteredHistory = history.filter(s => 
    s.roomCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.winner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedSession) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
        <button 
          onClick={() => setSelectedSession(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-[#2c49c5] font-black uppercase tracking-widest text-[10px] transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:border-blue-100 shadow-sm">
            <ArrowLeft size={16} />
          </div>
          Kembali ke Riwayat
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
               <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50" />
               
               <div className="relative z-10">
                 <div className="w-16 h-16 bg-blue-50 text-[#2c49c5] rounded-2xl flex items-center justify-center mb-6">
                    <Trophy size={32} />
                 </div>
                 <h3 className="text-3xl font-black text-slate-900 leading-tight">Detail Sesi <span className="text-[#2c49c5]">{selectedSession.roomCode}</span></h3>
                 <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-4 text-slate-500">
                       <Calendar size={18} className="text-slate-300" />
                       <span className="font-bold text-sm">{selectedSession.date}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                       <Users size={18} className="text-slate-300" />
                       <span className="font-bold text-sm">{selectedSession.totalGroups} Tim Berpartisipasi</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                       <Clock size={18} className="text-slate-300" />
                       <span className="font-bold text-sm">Selesai Normal</span>
                    </div>
                 </div>
               </div>
            </div>

            <div className="bg-[#2c49c5] p-8 rounded-[2rem] shadow-xl shadow-blue-500/20 text-white">
               <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">Pemenang Utama</p>
               <h4 className="text-3xl font-black">{selectedSession.winner}</h4>
               <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black">{selectedSession.winnerScore}</span>
                  <span className="text-blue-200 font-bold uppercase text-xs">Poin Akhir</span>
               </div>
            </div>
          </div>

          {/* Leaderboard Detail */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
               <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                  <h4 className="text-xl font-black text-slate-900 flex items-center gap-3">
                     <Medal className="text-[#ffda59]" /> Leaderboard Sesi
                  </h4>
               </div>
               
               <div className="p-4 md:p-8">
                  <div className="space-y-3">
                    {selectedSession.leaderboard?.map((group: any, idx: number) => {
                      const isSurrendered = group.status === 'SURRENDERED';
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={group.id} 
                          className={`flex items-center justify-between p-5 rounded-2xl border-2 ${
                            idx === 0 
                              ? 'bg-blue-50/30 border-blue-100 shadow-sm' 
                              : isSurrendered ? 'bg-slate-50/50 border-slate-100 opacity-70' : 'bg-white border-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                              idx === 0 ? 'bg-[#ffda59] text-slate-900' :
                              idx === 1 ? 'bg-slate-200 text-slate-600' :
                              idx === 2 ? 'bg-orange-100 text-orange-600' :
                              'bg-slate-50 text-slate-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-black text-slate-800 uppercase tracking-tight ${isSurrendered ? 'line-through opacity-50' : ''}`}>
                                  {group.name}
                                </p>
                                {isSurrendered && (
                                  <span className="bg-red-100 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">OUT</span>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Petak Akhir: {group.position}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-black ${isSurrendered ? 'text-slate-400' : 'text-slate-900'}`}>{group.score}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poin</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Riwayat Misi</h2>
          <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mt-2">Arsip Permainan Sebelumnya</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari Room atau Pemenang..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-slate-100 p-4 pl-12 rounded-2xl text-sm font-bold text-slate-700 focus:border-[#2c49c5] transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredHistory.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white py-24 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center"
              >
                 <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-200">
                    <HistoryIcon size={40} />
                 </div>
                 <h4 className="text-xl font-black text-slate-900">Belum Ada Riwayat</h4>
                 <p className="text-slate-400 font-medium mt-2 max-w-xs px-6">Selesaikan satu permainan untuk melihat statistik performa di sini.</p>
              </motion.div>
            ) : (
              filteredHistory.map((ses, idx) => (
                <motion.div 
                  key={ses.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedSession(ses)}
                  className="group cursor-pointer"
                >
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-100 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-[#2c49c5] rounded-2xl flex items-center justify-center transition-colors shrink-0">
                         <Hash size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg uppercase tracking-widest">{ses.roomCode}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Calendar size={12} /> {ses.date}
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-[#2c49c5] transition-colors">
                          Juara: {ses.winner}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-8 border-t md:border-t-0 pt-6 md:pt-0 border-slate-50">
                      <div className="text-left md:text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Skor</p>
                         <p className="text-2xl font-black text-slate-900">{ses.winnerScore} <span className="text-[10px] text-slate-300">PTS</span></p>
                      </div>
                      <div className="text-left md:text-right border-l pl-8 border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Partisipan</p>
                         <p className="text-2xl font-black text-slate-900">{ses.totalGroups} <span className="text-[10px] text-slate-300">TIM</span></p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#2c49c5] group-hover:text-white transition-all transform group-hover:translate-x-1">
                         <ChevronRight size={20} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function SessionCardSkeleton() {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex-shrink-0" />
          <div className="space-y-2">
            <div className="h-5 bg-slate-100 rounded w-48" />
            <div className="h-3 bg-slate-100 rounded w-32" />
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right space-y-1 hidden md:block">
            <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
            <div className="h-6 bg-slate-100 rounded w-24 ml-auto" />
          </div>
          <div className="text-right space-y-1 hidden md:block">
            <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
            <div className="h-6 bg-slate-100 rounded w-12 ml-auto" />
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
