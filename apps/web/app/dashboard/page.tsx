"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Activity, LogOut, CheckCircle2, Play, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useGameStore, QuestionCard, QuestionType } from "../../store/gameStore";
import { toast } from "sonner";

export default function DashboardPage() {
  const { 
    gameStatus, groups, startGame, createRoom, endGame, resetToIdle,
    logs, questions, roomCode, roomConfig, pendingReviews, gradeSubjektif, sessionHistory,
    addQuestion, deleteQuestion, updateQuestion
  } = useGameStore();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'SESI' | 'SOAL' | 'RIWAYAT'>('SESI');

  // Room config draft
  const [draftConfig, setDraftConfig] = useState({ 
    gameDurationMin: 10, 
    turnDurationDasar: 30,
    turnDurationTantangan: 60,
    turnDurationAksi: 15,
    maxGroups: 4
  });

  // Add/Edit Question Draft
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState<Partial<QuestionCard>>({ type: 'DASAR', text: '', points: 10, answerKey: '', options: ['','','',''] });

  const handleCopy = () => {
    if(!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveQuestion = () => {
    // Basic validation
    if (!newQ.text?.trim()) {
      toast.error("Isi teks pertanyaan terlebih dahulu!");
      return;
    }

    // Create a copy to avoid direct state mutation
    const finalQ = { ...newQ };

    if (finalQ.type === 'DASAR') {
      const trimmedOptions = (finalQ.options || []).map(opt => opt.trim()).filter(opt => opt !== "");
      const trimmedKey = finalQ.answerKey?.trim();

      if (trimmedOptions.length === 0) {
        toast.error("Harap masukkan opsi jawaban!");
        return;
      }

      if (!trimmedKey) {
        toast.error("Harap masukkan kunci jawaban!");
        return;
      }

      const match = trimmedOptions.some(opt => opt === trimmedKey);
      if (!match) {
        toast.error(`Kunci jawaban tidak ditemukan dalam opsi!`);
        return;
      }

      // Update the copy, not the state directly
      finalQ.options = trimmedOptions;
      finalQ.answerKey = trimmedKey;
    }

    if (editingId) {
       updateQuestion(editingId, finalQ as QuestionCard);
       toast.success("Pertanyaan berhasil diperbarui!");
    } else {
       addQuestion(finalQ as Omit<QuestionCard, 'id'>);
       toast.success("Pertanyaan baru ditambahkan!");
    }
    
    setShowAddModal(false);
    setEditingId(null);
    setNewQ({ type: 'DASAR', text: '', points: 10, answerKey: '', options: ['','','',''] });
  }

  const handleEditClick = (q: QuestionCard) => {
    setEditingId(q.id);
    setNewQ(q);
    setShowAddModal(true);
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky z-50">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            EduBoard <span className="text-[#2c49c5] bg-blue-50 px-3 py-0.5 rounded-lg text-sm border border-blue-100">ADMIN</span>
          </h1>
          <div className="hidden md:flex bg-slate-50 border border-slate-100 rounded-xl p-1.5 ml-4">
             <button onClick={() => setActiveTab('SESI')} className={`px-6 py-2 text-sm font-black rounded-lg transition-all ${activeTab === 'SESI' ? 'bg-white text-[#2c49c5] shadow-lg shadow-[#2c49c5]/10' : 'text-slate-400 hover:text-slate-600'}`}>Sesi Aktif</button>
             <button onClick={() => setActiveTab('SOAL')} className={`px-6 py-2 text-sm font-black rounded-lg transition-all ${activeTab === 'SOAL' ? 'bg-white text-[#2c49c5] shadow-lg shadow-[#2c49c5]/10' : 'text-slate-400 hover:text-slate-600'}`}>Bank Soal</button>
             <button onClick={() => setActiveTab('RIWAYAT')} className={`px-6 py-2 text-sm font-black rounded-lg transition-all ${activeTab === 'RIWAYAT' ? 'bg-white text-[#2c49c5] shadow-lg shadow-[#2c49c5]/10' : 'text-slate-400 hover:text-slate-600'}`}>Riwayat</button>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col text-right">
             <span className="text-sm font-black text-slate-900">Guru PAI</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded-lg mt-0.5 border border-slate-100">Verified</span>
          </div>
          <Link href="/" className="p-3 text-slate-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 group">
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Center Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* TAB: SESI AKTIF */}
          {activeTab === 'SESI' && (
            <>
              {gameStatus === 'IDLE' && (
                 <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/50 text-center relative overflow-hidden">
                    {/* Yellow detail */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-[#ffda59]" />
                    
                    <h2 className="text-4xl font-black text-slate-900 mb-5 tracking-tight">Buat Room Baru</h2>
                    <p className="text-slate-500 mb-10 text-lg font-medium max-w-lg mx-auto">Sesuaikan konfigurasi waktu dan peserta, lalu bagikan kode room ke siswa Anda untuk mulai bermain.</p>
                    
                     <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
                       <div className="text-left space-y-3 flex flex-col min-w-[150px]">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Durasi Game (Menit)</label>
                         <input type="number" value={draftConfig.gameDurationMin} onChange={e=>setDraftConfig({...draftConfig, gameDurationMin: Number(e.target.value)})} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-slate-900 font-black text-xl focus:border-[#2c49c5] transition-all" />
                       </div>
                        <div className="text-left space-y-3 flex flex-col min-w-[150px]">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Maksimal Tim</label>
                          <input type="number" value={draftConfig.maxGroups} onChange={e=>setDraftConfig({...draftConfig, maxGroups: Number(e.target.value)})} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-slate-900 font-black text-xl focus:border-[#2c49c5] transition-all" />
                        </div>

                        {/* Card Timers Grid */}
                        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 mt-2 border-t border-slate-50">
                           <div className="text-left space-y-3">
                             <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest pl-2">Waktu Dasar (Detik)</label>
                             <input type="number" value={draftConfig.turnDurationDasar} onChange={e=>setDraftConfig({...draftConfig, turnDurationDasar: Number(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-slate-900 font-bold focus:border-[#2c49c5] transition-all" />
                           </div>
                           <div className="text-left space-y-3">
                             <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest pl-2">Waktu Tantangan (Detik)</label>
                             <input type="number" value={draftConfig.turnDurationTantangan} onChange={e=>setDraftConfig({...draftConfig, turnDurationTantangan: Number(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-slate-900 font-bold focus:border-[#2c49c5] transition-all" />
                           </div>
                           <div className="text-left space-y-3">
                             <label className="text-[10px] font-black text-red-600 uppercase tracking-widest pl-2">Waktu Aksi (Detik)</label>
                             <input type="number" value={draftConfig.turnDurationAksi} onChange={e=>setDraftConfig({...draftConfig, turnDurationAksi: Number(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-slate-900 font-bold focus:border-[#2c49c5] transition-all" />
                           </div>
                        </div>
                    </div>

                    <button onClick={() => {
                      createRoom({ 
                        gameDurationSec: draftConfig.gameDurationMin * 60, 
                        turnDurationDasar: draftConfig.turnDurationDasar,
                        turnDurationTantangan: draftConfig.turnDurationTantangan,
                        turnDurationAksi: draftConfig.turnDurationAksi,
                        maxGroups: draftConfig.maxGroups
                      });
                      toast.success("Room berhasil dibuat!");
                    }} className="px-12 py-5 bg-[#2c49c5] hover:bg-[#1a34a8] text-white font-black rounded-xl shadow-2xl shadow-[#2c49c5]/30 transition-all hover:scale-105 transform active:scale-95 text-lg">BUAT ROOM SEKARANG</button>
                 </div>
              )}

              {(gameStatus === 'LOBBY' || gameStatus === 'PLAYING') && (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-2 h-full ${gameStatus === 'PLAYING' ? 'bg-blue-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                  
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                     <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight">Lobby Aktif</h3>
                       <p className="text-sm text-slate-500 mt-2 flex items-center font-bold">
                         <Activity className={`w-4 h-4 mr-2 ${gameStatus === 'PLAYING' ? 'text-[#2c49c5]' : 'text-emerald-500'}`} /> 
                         Status: <span className={`ml-1 ${gameStatus === 'PLAYING' ? 'text-[#2c49c5]' : 'text-emerald-500'}`}>{gameStatus === 'PLAYING' ? 'PERMAINAN BERJALAN' : 'MENUNGGU PESERTA...'}</span>
                       </p>
                     </div>
                     <div className="text-left md:text-right w-full md:w-auto">
                       <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Kode Akses Room</p>
                       <div 
                         onClick={handleCopy}
                         className="cursor-pointer flex items-center justify-between gap-6 bg-slate-50 px-6 py-3 rounded-2xl border-2 border-slate-100 hover:border-[#2c49c5] transition-all group"
                       >
                         <span className="font-mono text-3xl font-black text-[#2c49c5] tracking-[0.2em]">{roomCode}</span>
                         {copied ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Copy className="w-6 h-6 text-slate-300 group-hover:text-[#2c49c5]" />}
                       </div>
                     </div>
                   </div>

                   <div className="mb-10 bg-slate-50/50 p-6 rounded-xl border border-slate-50">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Tim Terdaftar ({groups.length} / {roomConfig.maxGroups})
                     </h4>
                     <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                       {groups.length === 0 ? (
                         <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold bg-white">
                           Belum ada peserta yang bergabung.
                         </div>
                       ) : (
                         groups.map(g => (
                           <div key={g.id} className="bg-white flex items-center p-4 rounded-xl border border-slate-100 shadow-lg shadow-slate-200/40 group hover:border-[#2c49c5] transition-all">
                             <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2c49c5] flex items-center justify-center font-black mr-4 shadow-sm border border-blue-100 group-hover:bg-[#2c49c5] group-hover:text-white transition-all text-lg">{g.name.charAt(0)}</div>
                             <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-black text-slate-900 truncate">{g.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Skor: {g.score}</div>
                             </div>
                             <div className="w-1.5 h-1.5 bg-[#ffda59] rounded-full ml-4 shadow-[0_0_8px_#ffda59]" />
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                  
                   {gameStatus === 'LOBBY' ? (
                      <button onClick={startGame} disabled={groups.length === 0} className="w-full py-5 bg-[#2c49c5] text-white font-black rounded-xl shadow-xl shadow-[#2c49c5]/30 disabled:opacity-20 transition-all hover:bg-[#1a34a8] flex items-center justify-center text-xl tracking-tight"><Play className="mr-3 fill-current w-6 h-6"/> MULAI MISI SEKARANG</button>
                   ) : (
                      <div className="grid grid-cols-2 gap-5">
                         <Link href={`/board?roomCode=${roomCode}&role=guru`}  className="py-5 text-center bg-white border-2 border-slate-100 hover:border-[#2c49c5] text-[#2c49c5] font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-100">
                            BUKA PAPAN LAYAR 
                         </Link>
                         <button onClick={endGame} className="py-5 text-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-2 border-red-100 font-black rounded-xl transition-all shadow-xl shadow-red-100">
                            HENTIKAN PERMAINAN
                         </button>
                      </div>
                   )}
                </div>
              )}

              {gameStatus === 'FINISHED' && (
                  <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/50 text-center">
                     <div className="w-24 h-24 bg-yellow-50 rounded-xl flex items-center justify-center mx-auto mb-8 border border-yellow-100 shadow-xl shadow-yellow-500/10">
                        <CheckCircle2 className="w-12 h-12 text-[#ffda59]" />
                     </div>
                     <h2 className="text-4xl font-black text-slate-900 mb-5 tracking-tight">Misi Selesai!</h2>
                     <p className="text-slate-500 mb-10 text-lg font-medium">Permainan telah diakhiri. Lihat rekapitulasi poin di Riwayat.</p>
                     <button onClick={resetToIdle} className="px-10 py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">KEMBALI KE LOBBY UTAMA</button>
                  </div>
              )}

              {/* TANTANGAN GRADING PANEL */}
              {pendingReviews.length > 0 && (
                  <div className="border-4 border-orange-100 bg-orange-50/30 rounded-2xl p-10 shadow-2xl shadow-orange-500/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-3 bg-[#ffda59]/50 animate-pulse"></div>
                    <h3 className="text-2xl font-black text-orange-600 mb-8 flex items-center tracking-tight"><Activity className="mr-3 w-7 h-7"/> TUGAS MENUNGGU NILAI</h3>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                      {pendingReviews.map(rev => (
                        <div key={rev.id} className="bg-white border-2 border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-200/20 relative">
                           <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#ffda59] rounded-xl flex items-center justify-center shadow-lg transform rotate-12">
                              <Plus className="w-6 h-6 text-white" />
                           </div>
                           <div className="flex justify-between items-center mb-6">
                             <span className="font-black text-xl text-slate-900">{rev.groupName}</span>
                             <span className="text-xs font-black bg-orange-100 text-orange-600 px-4 py-2 rounded-xl border border-orange-200">MAKS {rev.maxPoints} PT</span>
                           </div>
                           <p className="text-base font-bold text-slate-500 mb-4">{rev.questionText}</p>
                           <div className="p-6 bg-slate-50 rounded-2xl text-slate-800 font-bold italic mb-8 border-l-4 border-[#2c49c5] shadow-inner text-lg">&quot;{rev.answerText}&quot;</div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <button onClick={() => gradeSubjektif(rev.id, 0)} className="py-4 bg-white text-red-500 font-black rounded-xl border-2 border-red-50 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20">SALAH (0)</button>
                             <button onClick={() => gradeSubjektif(rev.id, Math.floor(rev.maxPoints/2))} className="py-4 bg-white text-yellow-600 font-black rounded-xl border-2 border-yellow-50 hover:bg-yellow-500 hover:text-white transition-all shadow-lg hover:shadow-yellow-500/20">KURANG ({Math.floor(rev.maxPoints/2)})</button>
                             <button onClick={() => gradeSubjektif(rev.id, rev.maxPoints)} className="py-4 bg-[#2c49c5] text-white font-black rounded-xl border-2 border-transparent hover:bg-[#1a34a8] transition-all shadow-xl shadow-blue-500/20">SEMPURNA ({rev.maxPoints})</button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
              )}
            </>
          )}

          {/* TAB: SOAL */}
          {activeTab === 'SOAL' && (
             <div className="space-y-10">
                 <div className="flex justify-between items-center">
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight">Bank Soal</h2>
                   <button onClick={() => setShowAddModal(true)} className="px-6 py-4 bg-[#2c49c5] hover:bg-[#1a34a8] text-white font-black rounded-xl flex items-center shadow-xl shadow-[#2c49c5]/20 hover:scale-105 transition-all"><Plus className="w-5 h-5 mr-2"/> Tambah Soal Baru</button>
                 </div>
                 
                 <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                         <th className="px-8 py-6">Kategori</th>
                         <th className="px-8 py-6">Pertanyaan</th>
                         <th className="px-8 py-6">Poin</th>
                         <th className="px-8 py-6 text-right">Kelola</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {questions.map((q) => (
                         <tr key={q.id} className="group hover:bg-slate-50/50 transition-all">
                           <td className="px-8 py-6">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${q.type === 'DASAR' ? 'bg-blue-50 text-[#2c49c5] border-blue-100' : q.type === 'AKSI' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                 {q.type}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-sm font-bold text-slate-700 max-w-sm truncate">{q.text}</td>
                           <td className="px-8 py-6 text-sm font-black text-[#2c49c5]">{q.points > 0 ? `+${q.points}` : q.points}</td>
                           <td className="px-8 py-6">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={() => handleEditClick(q)} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-[#2c49c5] hover:border-[#2c49c5] rounded-xl transition-all shadow-sm flex-shrink-0"><Pencil className="w-4 h-4"/></button>
                                 <button onClick={() => deleteQuestion(q.id)} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all shadow-sm flex-shrink-0"><Trash2 className="w-4 h-4"/></button>
                              </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>

                 {showAddModal && (
                   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                     <div className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col p-10 rounded-2xl border border-slate-100 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#2c49c5]" />
                        <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-2 flex-shrink-0">
                           <Plus className="w-6 h-6 text-[#2c49c5]" />
                           {editingId ? 'Perbarui Pertanyaan' : 'Tambah Pertanyaan Baru'}
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Jenis Pertanyaan</label>
                              <select value={newQ.type} onChange={(e) => setNewQ({...newQ, type: e.target.value as QuestionType})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-slate-900 font-bold focus:border-[#2c49c5] transition-all outline-none">
                                <option value="DASAR">Soal Pilihan Ganda (Dasar)</option>
                                <option value="TANTANGAN">Soal Subjektif (Tantangan)</option>
                                <option value="AKSI">Soal Instruksi (Aksi)</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Isi Pertanyaan</label>
                              <textarea value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} placeholder="Masukkan pertanyaan edukatif di sini..." className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-slate-900 font-bold min-h-[120px] focus:border-[#2c49c5] transition-all outline-none"></textarea>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Poin Reward</label>
                              <input type="number" value={newQ.points} onChange={(e) => setNewQ({...newQ, points: Number(e.target.value)})} placeholder="Contoh: 10 atau 20" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-slate-900 font-bold focus:border-[#2c49c5] transition-all outline-none" />
                           </div>
                           
                           {newQ.type === 'DASAR' && (
                              <div className="p-6 bg-blue-50/50 border-2 border-blue-50 rounded-xl space-y-4">
                                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest pl-2">Pilihan Jawaban (Pisahkan dengan Koma)</p>
                                 <input value={newQ.options?.join(',')} onChange={(e) => setNewQ({...newQ, options: e.target.value.split(',')})} placeholder="A, B, C, D" className="w-full bg-white border-2 border-blue-100 p-3 rounded-lg text-sm text-slate-700 font-bold focus:border-[#2c49c5] transition-all outline-none shadow-sm" />
                                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest pl-2 mt-4">Kunci Jawaban yang Benar</p>
                                 <input value={newQ.answerKey} onChange={(e) => setNewQ({...newQ, answerKey: e.target.value})} placeholder="Masukkan salah satu opsi di atas" className="w-full bg-white border-2 border-emerald-100 p-3 rounded-lg text-sm text-emerald-600 font-bold focus:border-emerald-500 transition-all outline-none shadow-sm" />
                              </div>
                           )}
                        </div>
                        <div className="flex gap-4 mt-10 flex-shrink-0">
                          <button onClick={() => { setShowAddModal(false); setEditingId(null); setNewQ({ type: 'DASAR', text: '', points: 10, answerKey: '', options: ['','','',''] }); }} className="flex-1 py-4 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl font-black transition-all">BATAL</button>
                          <button onClick={handleSaveQuestion} className="flex-1 py-4 bg-[#2c49c5] hover:bg-[#1a34a8] text-white rounded-xl font-black shadow-xl shadow-[#2c49c5]/20 transition-all">SIMPAN</button>
                        </div>
                     </div>
                   </div>
                 )}
             </div>
          )}

          {/* TAB: RIWAYAT */}
          {activeTab === 'RIWAYAT' && (
             <div className="space-y-10">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Riwayat Misi</h2>
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/50">
                   {sessionHistory.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 font-bold text-lg">Belum ada riwayat misi yang tercatat.</div>
                   ) : (
                      <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                        {sessionHistory.map(ses => (
                           <div key={ses.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-blue-100 transition-all group shadow-sm">
                              <div>
                                 <div className="text-xs text-slate-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#ffda59] rounded-full" />
                                    {ses.date} &bull; ROOM {ses.roomCode}
                                 </div>
                                 <div className="text-2xl font-black text-slate-900 tracking-tight">Juara 1: <span className="text-[#2c49c5] bg-blue-50 px-4 py-1 rounded-lg ml-2">{ses.winner}</span></div>
                              </div>
                              <div className="mt-4 md:mt-0 text-right">
                                 <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">{ses.totalGroups} Tim</div>
                                 <div className="text-3xl font-black text-slate-900">{ses.winnerScore} <span className="text-xs text-slate-400 font-bold uppercase">Points</span></div>
                              </div>
                           </div>
                        ))}
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>

        {/* Sidebar Log - (Hanya relevan di tab Sesi) */}
        <div className={`space-y-8 ${activeTab !== 'SESI' ? 'hidden lg:block opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/50 h-[600px] flex flex-col relative overflow-hidden">
            {/* Yellow accent line */}
            <div className="absolute top-0 right-0 h-full w-1 bg-[#ffda59]" />
            
            <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center">
              <Activity className="w-6 h-6 text-[#2c49c5] mr-3"/> Log Aktivitas Server
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 font-mono text-xs pr-4 scrollbar-thin scrollbar-thumb-slate-200">
              {logs.map((log, i) => (
                <div key={i} className="py-4 border-b border-slate-50 last:border-0 relative pl-6 leading-relaxed group transition-all hover:bg-slate-50/50 rounded-lg">
                  <div className="absolute left-0 top-5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-slate-600 font-bold leading-relaxed">{log}</span>
                </div>
              ))}
              {logs.length === 0 && <div className="text-slate-400 font-bold italic">Belum ada aktivitas terekam.</div>}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
