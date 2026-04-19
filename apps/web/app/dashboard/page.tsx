"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Activity, LogOut, CheckCircle2, Play, Users, Plus, Pencil, Trash2, History } from "lucide-react";
import { useGameStore, QuestionCard, QuestionType } from "../../store/gameStore";

export default function DashboardPage() {
  const { 
    gameStatus, groups, startGame, createRoom, endGame, resetToIdle,
    logs, questions, roomCode, roomConfig, pendingReviews, gradeSubjektif, sessionHistory,
    addQuestion, deleteQuestion, updateQuestion
  } = useGameStore();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'SESI' | 'SOAL' | 'RIWAYAT'>('SESI');

  // Room config draft
  const [draftConfig, setDraftConfig] = useState({ turnDurationSec: 30, maxGroups: 4 });

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
    if (editingId) {
       updateQuestion(editingId, newQ);
    } else {
       addQuestion(newQ as Omit<QuestionCard, 'id'>);
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
    <div className="min-h-screen bg-zinc-950 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
      <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          EduBoard <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md text-sm">ADMIN</span>
        </h1>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
           <button onClick={() => setActiveTab('SESI')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'SESI' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Sesi Aktif</button>
           <button onClick={() => setActiveTab('SOAL')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'SOAL' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Bank Soal</button>
           <button onClick={() => setActiveTab('RIWAYAT')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'RIWAYAT' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Riwayat</button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-400">Guru PAI</span>
          <Link href="/" className="p-2 text-zinc-400 hover:text-red-500 transition-colors rounded-full hover:bg-zinc-800">
            <LogOut className="w-5 h-5" />
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
                 <div className="bg-zinc-900/60 p-8 rounded-[2rem] border border-zinc-800 shadow-2xl text-center">
                    <h2 className="text-3xl font-extrabold text-white mb-4">Buat Room Permainan</h2>
                    <p className="text-zinc-400 mb-8 max-w-md mx-auto">Sesuaikan konfigurasi waktu dan peserta, lalu bagikan kode room ke siswa Anda untuk mulai bermain.</p>
                    
                    <div className="flex items-center justify-center gap-6 mb-8">
                       <div className="text-left space-y-2">
                         <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Durasi Giliran (Dtk)</label>
                         <input type="number" value={draftConfig.turnDurationSec} onChange={e=>setDraftConfig({...draftConfig, turnDurationSec: Number(e.target.value)})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold text-lg" />
                       </div>
                       <div className="text-left space-y-2">
                         <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Maksimal Tim</label>
                         <input type="number" value={draftConfig.maxGroups} onChange={e=>setDraftConfig({...draftConfig, maxGroups: Number(e.target.value)})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold text-lg" />
                       </div>
                    </div>

                    <button onClick={() => createRoom(draftConfig)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all">BUAT ROOM SEKARANG</button>
                 </div>
              )}

              {(gameStatus === 'LOBBY' || gameStatus === 'PLAYING') && (
                <div className="bg-zinc-900/60 backdrop-blur p-8 rounded-[2rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-2 h-full ${gameStatus === 'PLAYING' ? 'bg-blue-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-white">Lobby Aktif</h3>
                      <p className="text-sm text-zinc-400 mt-2 flex items-center bg-zinc-950 w-max px-3 py-1 rounded-full border border-zinc-800">
                        <Activity className={`w-4 h-4 mr-2 ${gameStatus === 'PLAYING' ? 'text-blue-500' : 'text-emerald-500'}`} /> 
                        Status: {gameStatus === 'PLAYING' ? 'BERJALAN' : 'MENUNGGU PESERTA...'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Kode Akses</p>
                      <div 
                        onClick={handleCopy}
                        className="cursor-pointer flex items-center justify-between gap-4 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <span className="font-mono text-2xl font-bold text-emerald-400 tracking-widest">{roomCode}</span>
                        {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-zinc-500" />}
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Tim Terdaftar ({groups.length} / {roomConfig.maxGroups})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {groups.length === 0 ? (
                        <div className="col-span-full py-4 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-600">
                          Belum ada peserta yang bergabung.
                        </div>
                      ) : (
                        groups.map(g => (
                          <div key={g.id} className="bg-zinc-800/50 flex items-center p-3 rounded-xl border border-zinc-700">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mr-3">{g.name.charAt(0)}</div>
                            <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-zinc-200">{g.name}</div>
                            {gameStatus === 'PLAYING' && <span className="text-emerald-400 font-mono pl-2">{g.score}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {gameStatus === 'LOBBY' ? (
                     <button onClick={startGame} disabled={groups.length === 0} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] disabled:opacity-50 transition-all hover:bg-blue-500 flex items-center justify-center text-lg"><Play className="mr-2"/> MULAI PERMAINAN</button>
                  ) : (
                     <div className="grid grid-cols-2 gap-4">
                        <Link href="/board?role=guru" className="py-4 text-center bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all">BUKA PAPAN LAYAR</Link>
                        <button onClick={endGame} className="py-4 text-center bg-red-950/40 text-red-400 hover:bg-red-900 border border-red-900/50 font-bold rounded-xl transition-all">HENTIKAN PERMAINAN</button>
                     </div>
                  )}
                </div>
              )}

              {gameStatus === 'FINISHED' && (
                 <div className="bg-zinc-900/60 p-8 rounded-[2rem] border border-zinc-800 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Sesi Selesai!</h2>
                    <button onClick={resetToIdle} className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700">KEMBALI KE LOBBY UTAMA</button>
                 </div>
              )}

              {/* TANTANGAN GRADING PANEL */}
              {pendingReviews.length > 0 && (
                <div className="border-2 border-orange-500/50 bg-orange-950/20 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(249,115,22,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 animate-pulse"></div>
                  <h3 className="text-lg font-black text-orange-400 mb-4 flex items-center"><Activity className="mr-2"/> TUGAS MENUNGGU NILAI (Subjektif)</h3>
                  
                  <div className="space-y-4">
                    {pendingReviews.map(rev => (
                      <div key={rev.id} className="bg-zinc-950 border border-orange-900 p-4 rounded-xl">
                         <div className="flex justify-between items-center mb-2">
                           <span className="font-bold text-white">{rev.groupName}</span>
                           <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Max: {rev.maxPoints} pts</span>
                         </div>
                         <p className="text-sm font-medium text-zinc-400 mb-2">{rev.questionText}</p>
                         <div className="p-3 bg-zinc-900 rounded-lg text-zinc-300 italic mb-4">&quot;{rev.answerText}&quot;</div>
                         
                         <div className="flex items-center gap-3">
                           <button onClick={() => gradeSubjektif(rev.id, 0)} className="flex-1 py-2 bg-red-950 text-red-500 font-bold rounded-lg border border-red-900 hover:bg-red-900">SALAH (0 Poin)</button>
                           <button onClick={() => gradeSubjektif(rev.id, Math.floor(rev.maxPoints/2))} className="flex-1 py-2 bg-yellow-950 text-yellow-500 font-bold rounded-lg border border-yellow-900 hover:bg-yellow-900">KURANG ({Math.floor(rev.maxPoints/2)})</button>
                           <button onClick={() => gradeSubjektif(rev.id, rev.maxPoints)} className="flex-1 py-2 bg-emerald-950 text-emerald-500 font-bold rounded-lg border border-emerald-900 hover:bg-emerald-900">SEMPURNA ({rev.maxPoints})</button>
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
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-extrabold text-white">Manajemen Bank Soal</h2>
                  <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center shadow-lg"><Plus className="w-5 h-5 mr-1"/> Tambah Soal</button>
                </div>
                
                <div className="bg-zinc-900/60 p-1 rounded-[2rem] border border-zinc-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-widest">
                        <th className="p-4">Tipe</th>
                        <th className="p-4">Pertanyaan</th>
                        <th className="p-4">Poin</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q) => (
                        <tr key={q.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                          <td className="p-4">
                             <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${q.type === 'DASAR' ? 'bg-blue-500/20 text-blue-400' : q.type === 'AKSI' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                                {q.type}
                             </span>
                          </td>
                          <td className="p-4 text-sm font-medium text-zinc-300 max-w-sm truncate">{q.text}</td>
                          <td className="p-4 text-sm font-bold text-emerald-400">{q.points > 0 ? `+${q.points}` : q.points}</td>
                          <td className="p-4 text-right space-x-2">
                             <button onClick={() => handleEditClick(q)} className="p-2 bg-zinc-800 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white"><Pencil className="w-4 h-4"/></button>
                             <button onClick={() => deleteQuestion(q.id)} className="p-2 bg-red-950/50 rounded-lg border border-red-900 text-red-400 hover:text-red-300 hover:bg-red-900"><Trash2 className="w-4 h-4"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SIMULATED ADD QUESTION MODAL */}
                {showAddModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 w-full max-w-lg p-8 rounded-[2rem] border border-zinc-700 shadow-2xl">
                       <h3 className="text-xl font-bold text-white mb-6">{editingId ? 'Edit Soal' : 'Tambah Soal Baru'}</h3>
                       <div className="space-y-4">
                          <select value={newQ.type} onChange={(e) => setNewQ({...newQ, type: e.target.value as QuestionType})} className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white">
                            <option value="DASAR">Soal Pilihan Ganda (Dasar)</option>
                            <option value="TANTANGAN">Soal Subjektif (Tantangan)</option>
                            <option value="AKSI">Soal Instruksi (Aksi)</option>
                          </select>
                          <textarea value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} placeholder="Isi teks..." className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white min-h-[100px]"></textarea>
                          <input type="number" value={newQ.points} onChange={(e) => setNewQ({...newQ, points: Number(e.target.value)})} placeholder="Poin Reward/Sanksi (Contoh: 10 atau -5)" className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white" />
                          
                          {newQ.type === 'DASAR' && (
                             <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                                <p className="text-xs font-bold text-zinc-500 uppercase">Input Opsi Jawaban (Pisahkan koma)</p>
                                <input value={newQ.options?.join(',')} onChange={(e) => setNewQ({...newQ, options: e.target.value.split(',')})} placeholder="A, B, C, D" className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm text-white" />
                                <p className="text-xs font-bold text-zinc-500 uppercase mt-2">Kunci Jawaban Tepat</p>
                                <input value={newQ.answerKey} onChange={(e) => setNewQ({...newQ, answerKey: e.target.value})} placeholder="Harus persis sama dengan salah satu opsi" className="w-full bg-zinc-900 border border-emerald-800 p-2 rounded text-sm text-emerald-400" />
                             </div>
                          )}
                       </div>
                       <div className="flex gap-4 mt-8">
                         <button onClick={() => { setShowAddModal(false); setEditingId(null); setNewQ({ type: 'DASAR', text: '', points: 10, answerKey: '', options: ['','','',''] }); }} className="flex-1 py-3 text-zinc-400 hover:bg-zinc-800 rounded-xl font-bold">Batal</button>
                         <button onClick={handleSaveQuestion} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">{editingId ? 'Update Soal' : 'Simpan Soal'}</button>
                       </div>
                    </div>
                  </div>
                )}
             </div>
          )}

          {/* TAB: RIWAYAT */}
          {activeTab === 'RIWAYAT' && (
            <div className="space-y-6">
               <h2 className="text-2xl font-extrabold text-white">Riwayat Sesi</h2>
               <div className="bg-zinc-900/60 p-6 rounded-[2rem] border border-zinc-800">
                  {sessionHistory.length === 0 ? (
                     <div className="text-center py-10 text-zinc-500 font-medium">Belum ada riwayat permainan.</div>
                  ) : (
                     <div className="space-y-4">
                       {sessionHistory.map(ses => (
                          <div key={ses.id} className="flex justify-between items-center p-5 bg-zinc-950 border border-zinc-800 rounded-2xl">
                             <div>
                                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">{ses.date} &bull; ROOM {ses.roomCode}</div>
                                <div className="text-lg font-bold text-white">Juara 1: <span className="text-emerald-400">{ses.winner}</span> ({ses.winnerScore} pts)</div>
                             </div>
                             <div className="text-sm font-medium text-zinc-400">{ses.totalGroups} Tim Berpartisipasi</div>
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
          <div className="bg-zinc-900/60 p-6 rounded-[2rem] border border-zinc-800 shadow-xl h-[600px] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center">
              <Activity className="w-5 h-5 text-blue-500 mr-2"/> Log Aktivitas Server
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs text-zinc-400 pr-2 pb-4">
              {logs.map((log, i) => (
                <div key={i} className="py-2.5 border-b border-zinc-800/50 last:border-0 relative pl-4 leading-relaxed">
                  <div className="absolute left-0 top-4 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  {log}
                </div>
              ))}
              {logs.length === 0 && <div>Belum ada aktivitas.</div>}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
