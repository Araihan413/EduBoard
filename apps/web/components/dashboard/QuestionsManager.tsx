"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, BookOpen, Target, Flame, ChevronLeft, FolderOpen, ArrowRight, Download, FileUp, Copy, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useGameStore, QuestionCard, QuestionType, QuestionSet } from "../../store/gameStore";
import QuestionModal from "./QuestionModal";
import ConfirmModal from "../shared/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";

export default function QuestionsManager() {
  const { 
    questionSets, activeQuestionSet, questions,
    fetchQuestionSets, createQuestionSet, updateQuestionSet, deleteQuestionSet, duplicatePreset,
    setActiveQuestionSet, fetchQuestions, deleteQuestion, importQuestions
  } = useGameStore();

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionCard | null>(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);
  const [newSetTitle, setNewSetTitle] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  
  // View & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuestionType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'AZ' | 'ZA'>('NEWEST');

  // Sorting & Filtering for Sets
  const filteredSets = useMemo(() => {
    let result = [...questionSets].filter(set => 
      set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'OLDEST') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'AZ') return a.title.localeCompare(b.title);
      if (sortBy === 'ZA') return b.title.localeCompare(a.title);
      return 0;
    });

    return result;
  }, [questionSets, searchQuery, sortBy]);

  // Confirmation States
  const [confirmDeleteSet, setConfirmDeleteSet] = useState<string | null>(null);
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState<string | null>(null);

  // Fetch sets on mount
  useEffect(() => {
    fetchQuestionSets();
  }, [fetchQuestionSets]);

  const handleDownloadTemplate = () => {
    const headers = "type,text,points,answerKey,options_1,options_2,options_3,options_4";
    const example = "DASAR,Sebutkan ibukota Indonesia,10,Jakarta,Jakarta,Bandung,Surabaya,Medan";
    const blob = new Blob([`${headers}\n${example}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_soal_eduboard.csv';
    a.click();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeQuestionSet) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      // Skip header
      const questionData = lines.slice(1).map(line => {
        const [type, text, points, answerKey, ...options] = line.split(',').map(s => s.trim());
        return {
          type: type as any,
          text,
          points: parseInt(points) || 10,
          answerKey,
          options: options.slice(0, 4)
        };
      });

      try {
        await importQuestions(activeQuestionSet.id, questionData);
        toast.success(`Berhasil mengimport ${questionData.length} soal!`);
      } catch {
        toast.error("Gagal mengimport soal. Pastikan format CSV benar.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  // Fetch questions when a set is selected
  useEffect(() => {
    if (activeQuestionSet) {
      fetchQuestions(activeQuestionSet.id);
    }
  }, [activeQuestionSet, fetchQuestions]);

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetTitle.trim()) return;
    try {
      if (editingSet) {
        await updateQuestionSet(editingSet.id, newSetTitle, newSetDescription);
        toast.success("Paket soal berhasil diperbarui!");
      } else {
        await createQuestionSet(newSetTitle, newSetDescription);
        toast.success("Paket soal berhasil dibuat!");
      }
      setNewSetTitle("");
      setNewSetDescription("");
      setEditingSet(null);
      setShowSetModal(false);
    } catch {
      toast.error(editingSet ? "Gagal memperbarui paket soal" : "Gagal membuat paket soal");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newSet = await duplicatePreset(id);
      toast.success(`Berhasil menyalin "${newSet.title}" ke koleksi Anda!`);
    } catch {
      toast.error("Gagal menyalin preset");
    }
  };


  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "ALL" || q.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [questions, searchQuery, activeFilter]);

  const getTypeStyle = (type: QuestionType) => {
    switch (type) {
      case 'DASAR': return { icon: <BookOpen size={14}/>, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'AKSI': return { icon: <Target size={14}/>, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
      case 'TANTANGAN': return { icon: <Flame size={14}/>, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' };
    }
  };

  // RENDER LIBRARY (Daftar Paket Soal)
  if (!activeQuestionSet) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Perpustakaan Soal</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Kelola paket soal permainan Anda</p>
          </div>
          <button 
            onClick={() => setShowSetModal(true)}
            className="px-6 py-4 bg-[#2c49c5] hover:bg-[#1a34a8] text-white font-black rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 transition-all gap-3"
          >
            <Plus size={20}/> <span>Paket Baru</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-white p-2 pl-4 rounded-2xl border border-slate-100 shadow-sm flex items-center flex-1 transition-all focus-within:ring-2 ring-blue-100">
            <Search className="text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari paket soal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none p-2 text-slate-700 text-sm"
            />
          </div>
          <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center sm:w-48 transition-all">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-transparent border-none py-2 px-4 font-black text-[10px] uppercase tracking-widest text-slate-500 outline-none cursor-pointer hover:text-blue-600 transition-colors"
            >
              <option value="NEWEST">Terbaru</option>
              <option value="OLDEST">Terlama</option>
              <option value="AZ">A - Z</option>
              <option value="ZA">Z - A</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSets.map((set) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  type: "spring", 
                  damping: 18, 
                  stiffness: 120,
                  mass: 0.8
                }}
                key={set.id}
                onClick={() => setActiveQuestionSet(set)}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer group relative overflow-hidden"
              >
              {set.isPreset && (
                <div className="absolute top-0 right-0 px-4 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
                  Sistem Preset
                </div>
              )}
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <FolderOpen size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{set.title}</h3>
              <p className="text-slate-400 text-sm font-medium mb-4 line-clamp-2">{set.description || "Tidak ada deskripsi."}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {set._count?.questions || 0} Pertanyaan • {new Date(set.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(set.id); }}
                    className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                    title="Duplikat Paket"
                  >
                    <Copy size={16} />
                  </button>
                  {!set.isPreset && (
                    <>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingSet(set);
                          setNewSetTitle(set.title);
                          setNewSetDescription(set.description || "");
                          setShowSetModal(true);
                        }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="Edit Paket"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteSet(set.id); }}
                        className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        title="Hapus Paket"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <ArrowRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Create Set Modal */}
        <AnimatePresence>
          {showSetModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.form 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onSubmit={handleCreateSet}
                className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
              >
                <h3 className="text-2xl font-black text-slate-900 mb-6">{editingSet ? 'Edit Paket' : 'Buat Paket Baru'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Judul Paket</label>
                    <input 
                      autoFocus
                      type="text"
                      value={newSetTitle}
                      onChange={(e) => setNewSetTitle(e.target.value)}
                      placeholder="Misal: Kuis Matematika Bab 1"
                      className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deskripsi (Opsional)</label>
                    <textarea 
                      value={newSetDescription}
                      onChange={(e) => setNewSetDescription(e.target.value)}
                      placeholder="Jelaskan isi paket soal ini..."
                      rows={3}
                      className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => { setShowSetModal(false); setEditingSet(null); }}
                    className="flex-1 px-6 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200"
                  >
                    {editingSet ? 'Perbarui' : 'Simpan'}
                  </button>
                </div>
              </motion.form>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation for Sets */}
        <ConfirmModal 
          isOpen={!!confirmDeleteSet}
          onClose={() => setConfirmDeleteSet(null)}
          onConfirm={() => confirmDeleteSet && deleteQuestionSet(confirmDeleteSet)}
          title="Hapus Paket Soal?"
          message="Tindakan ini tidak dapat dibatalkan. Semua pertanyaan di dalam paket ini akan ikut terhapus."
        />
      </div>
    );
  }

  // RENDER DETAIL (Daftar Soal di dalam Paket)
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveQuestionSet(null)}
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{activeQuestionSet.title}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                 {questions.length} Soal
               </span>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">• Koleksi Saya</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {!activeQuestionSet.isPreset && (
            <>
              <button 
                onClick={handleDownloadTemplate}
                className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all flex items-center gap-2 text-sm font-bold"
                title="Unduh Template CSV"
              >
                <Download size={20} /> <span className="hidden sm:inline">Template</span>
              </button>
              <label className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl transition-all flex items-center gap-2 text-sm font-bold cursor-pointer">
                <FileUp size={20} /> <span className="hidden sm:inline">Import CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>
              <button 
                onClick={() => { setEditingQuestion(null); setShowQuestionModal(true); }}
                className="px-6 py-4 bg-[#2c49c5] hover:bg-[#1a34a8] text-white font-black rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 transition-all gap-3"
              >
                <Plus size={20}/> <span>Tambah Soal</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Cari di paket ini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100 px-6 py-3 pl-12 rounded-xl text-slate-700 outline-none shadow-sm focus:ring-2 ring-blue-100 transition-all text-base"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto p-1 no-scrollbar bg-slate-50 rounded-2xl border border-slate-100 flex-1">
            {(["ALL", "DASAR", "AKSI", "TANTANGAN"] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer whitespace-nowrap transition-all flex-1 ${activeFilter === f ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {f === 'ALL' ? 'Semua' : f}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 w-max self-end">
            <button 
              onClick={() => setViewMode('GRID')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Questions Grid       {/* Questions List/Grid */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}
        >
          {filteredQuestions.map(q => {
            const style = getTypeStyle(q.type);
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  type: "spring", 
                  damping: 18, 
                  stiffness: 120,
                  mass: 0.8
                }}
                key={q.id} 
                className={`bg-white border border-slate-100 shadow-sm hover:shadow-md group ${viewMode === 'GRID' ? 'p-6 rounded-3xl' : 'p-4 rounded-2xl flex items-center gap-4'}`}
              >
                {viewMode === 'GRID' ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${style?.bg} ${style?.color} ${style?.border} border`}>
                        {q.type}
                      </div>
                      <span className="text-[10px] font-black text-slate-900">{q.points} PTS</span>
                    </div>
                    <p className="text-slate-700 font-bold mb-6 line-clamp-3 leading-relaxed">{q.text}</p>
                    
                    {!activeQuestionSet.isPreset && (
                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-50">
                        <button 
                          onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteQuestion(q.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={`w-10 h-10 rounded-xl ${style?.bg} ${style?.color} flex items-center justify-center flex-shrink-0`}>
                      {style?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 font-bold truncate">{q.text}</p>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.points} PTS</span>
                    </div>
                    {!activeQuestionSet.isPreset && (
                      <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteQuestion(q.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
          {filteredQuestions.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
              Belum ada soal di paket ini.
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {showQuestionModal && (
        <QuestionModal 
          key={editingQuestion?.id || 'new'}
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          editingQuestion={editingQuestion}
          setId={activeQuestionSet.id}
        />
      )}

      {/* Delete Confirmation for Sets */}
      <ConfirmModal 
        isOpen={!!confirmDeleteSet}
        onClose={() => setConfirmDeleteSet(null)}
        onConfirm={() => confirmDeleteSet && deleteQuestionSet(confirmDeleteSet)}
        title="Hapus Paket Soal?"
        message="Tindakan ini tidak dapat dibatalkan. Semua pertanyaan di dalam paket ini akan ikut terhapus."
      />

      {/* Delete Confirmation for Questions */}
      <ConfirmModal 
        isOpen={!!confirmDeleteQuestion}
        onClose={() => setConfirmDeleteQuestion(null)}
        onConfirm={() => confirmDeleteQuestion && deleteQuestion(confirmDeleteQuestion)}
        title="Hapus Pertanyaan?"
        message="Apakah Anda yakin ingin menghapus pertanyaan ini?"
      />
    </div>
  );
}
