"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, BookOpen, Target, Flame, ChevronLeft, FolderOpen, ArrowRight, Download, FileUp, Copy, LayoutGrid, List, ChevronRight, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { useGameStore, QuestionCard, QuestionType, QuestionSet } from "../../store/gameStore";
import { QuestionSchema } from "@repo/types";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDebounce } from "../../hooks/useDebounce";
import QuestionModal from "./QuestionModal";
import ConfirmModal from "../shared/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";

export default function QuestionsManager() {
  const { 
    questionSets, activeQuestionSet, questions,
    fetchQuestionSets, createQuestionSet, updateQuestionSet, deleteQuestionSet, duplicatePreset,
    setActiveQuestionSet, fetchQuestions, deleteQuestion, importQuestions,
    pagination, isLoadingQuestions, isLoadingSets
  } = useGameStore();

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionCard | null>(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);
  const [newSetTitle, setNewSetTitle] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  
  // View & Filter states
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [activeFilter, setActiveFilter] = useState<QuestionType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'AZ' | 'ZA'>('NEWEST');

  // Sorting & Filtering for Sets
  const { presetSets, userSets } = useMemo(() => {
    const presets = questionSets.filter(set => set.isPreset);
    const users = questionSets
      .filter(set => !set.isPreset)
      .filter(set => 
        set.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        set.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );

    const sortFn = (a: QuestionSet, b: QuestionSet) => {
      if (sortBy === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'OLDEST') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'AZ') return a.title.localeCompare(b.title);
      if (sortBy === 'ZA') return b.title.localeCompare(a.title);
      return 0;
    };

    return {
      presetSets: presets.sort(sortFn),
      userSets: users.sort(sortFn)
    };
  }, [questionSets, debouncedSearchQuery, sortBy]);

  // Confirmation States
  const [confirmDeleteSet, setConfirmDeleteSet] = useState<string | null>(null);
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    const savedView = localStorage.getItem('eduboard_questions_view_mode');
    const savedSort = localStorage.getItem('eduboard_questions_sort_by');
    
    // Wrap in setTimeout to avoid cascading renders warning
    setTimeout(() => {
      setIsMounted(true);
      if (savedView === 'GRID' || savedView === 'LIST') setViewMode(savedView);
      if (savedSort) setSortBy(savedSort as any);
    }, 0);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('eduboard_questions_view_mode', viewMode);
    }
  }, [viewMode, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('eduboard_questions_sort_by', sortBy);
    }
  }, [sortBy, isMounted]);



  const handleDownloadTemplate = () => {
    const data = [
      ["type", "text", "points", "answerKey", "options_1", "options_2", "options_3", "options_4"],
      ["DASAR", "Sebutkan rukun Islam yang pertama", 10, "Syahadat", "Syahadat", "Shalat", "Zakat", "Puasa"],
      ["AKSI", "Praktikkan tata cara wudhu dengan benar di depan kelas!", 20, "Teacher Grade", "", "", "", ""],
      ["TANTANGAN", "Sebutkan minimal 3 hikmah dari ibadah puasa Ramadan!", 25, "Teacher Grade", "", "", "", ""]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 15 }, // type
      { wch: 50 }, // text
      { wch: 10 }, // points
      { wch: 20 }, // answerKey
      { wch: 15 }, // options_1
      { wch: 15 }, // options_2
      { wch: 15 }, // options_3
      { wch: 15 }, // options_4
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "template_soal_eduboard.xlsx");
  };

  const processImportData = async (rows: any[]) => {
    const validQuestions: any[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      try {
        // Transform options from flat columns (options_1, etc) to array
        const options = [
          row.options_1,
          row.options_2,
          row.options_3,
          row.options_4
        ].filter(v => v !== undefined && v !== null && v !== "").map(s => String(s).trim());

        const rawData = {
          type: String(row.type || "").toUpperCase(),
          text: String(row.text || ""),
          points: parseInt(row.points) || 10,
          answerKey: String(row.answerKey || ""),
          options: options.length > 0 ? options : undefined
        };

        // Validate with Zod
        const validated = QuestionSchema.parse(rawData);
        validQuestions.push(validated);
      } catch (err: any) {
        const msg = err.errors?.[0]?.message || "Format tidak valid";
        errors.push(`Baris ${index + 2}: ${msg}`);
      }
    });

    if (errors.length > 0) {
      toast.error(
        <div className="space-y-2">
          <p className="font-bold">Gagal mengimport beberapa soal:</p>
          <ul className="text-[10px] list-disc pl-4 max-h-32 overflow-y-auto">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
          {validQuestions.length > 0 && (
            <button 
              onClick={() => proceedImport(validQuestions)}
              className="mt-2 text-[10px] bg-blue-600 text-white px-3 py-1 rounded-lg font-black uppercase tracking-widest"
            >
              Lanjutkan Import {validQuestions.length} Soal Valid
            </button>
          )}
        </div>,
        { duration: 6000 }
      );
    } else if (validQuestions.length > 0) {
      await proceedImport(validQuestions);
    } else {
      toast.error("File kosong atau tidak memiliki data yang valid.");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeQuestionSet) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processImportData(results.data);
        },
        error: (err) => {
          toast.error("Gagal membaca file CSV: " + err.message);
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet);
          processImportData(rows);
        } catch (err) {
          toast.error("Gagal membaca file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Format file tidak didukung. Gunakan .xlsx atau .csv");
    }
    
    e.target.value = ""; // Reset input
  };

  const proceedImport = async (data: any[]) => {
    if (!activeQuestionSet) return;
    try {
      await importQuestions(activeQuestionSet.id, data);
    } catch {
      toast.error("Gagal menyimpan soal ke server.");
    }
  };

  // Fetch sets on mount
  useEffect(() => {
    fetchQuestionSets(1);
  }, [fetchQuestionSets]);

  // Fetch questions when a set is selected
  useEffect(() => {
    if (activeQuestionSet) {
      fetchQuestions(activeQuestionSet.id, 1);
    }
  }, [activeQuestionSet, fetchQuestions]);

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetTitle.trim()) return;
    try {
      if (editingSet) {
        await updateQuestionSet(editingSet.id, newSetTitle, newSetDescription);
      } else {
        await createQuestionSet(newSetTitle, newSetDescription);
      }
      setNewSetTitle("");
      setNewSetDescription("");
      setEditingSet(null);
      setShowSetModal(false);
    } catch {
      // Errors are now handled in the store
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicatePreset(id);
    } catch {
      // Errors are now handled in the store
    }
  };


  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.text.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesFilter = activeFilter === "ALL" || q.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [questions, debouncedSearchQuery, activeFilter]);

  const getTypeStyle = (type: QuestionType) => {
    switch (type) {
      case 'DASAR': return { icon: <BookOpen size={14}/>, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'AKSI': return { icon: <Target size={14}/>, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
      case 'TANTANGAN': return { icon: <Flame size={14}/>, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' };
    }
  };

  // RENDER LIBRARY (Daftar Paket Soal)
  if (!isMounted) {
    return (
      <div className="space-y-8 p-6 lg:p-12 animate-pulse">
        <div className="flex justify-between items-center mb-12">
          <div className="space-y-3">
            <div className="h-10 bg-slate-100 rounded-xl w-64" />
            <div className="h-4 bg-slate-100 rounded-lg w-48" />
          </div>
          <div className="h-14 bg-slate-100 rounded-2xl w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-50 rounded-[2.5rem] border border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

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

        <div className="flex-1 overflow-y-auto p-6 lg:p-12 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-12">
            {/* 1. Official Presets */}
            {!searchQuery && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Paket Resmi EduBoard</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isLoadingSets ? (
                    [1, 2, 3].map((i) => <QuestionSetSkeleton key={i} />)
                  ) : (
                    presetSets.map((set) => (
                      <motion.div
                        whileHover={{ y: -5 }}
                        key={set.id}
                        onClick={() => setActiveQuestionSet(set)}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer group relative overflow-hidden"
                      >
                        {/* Ribbon for presets */}
                        <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500 text-[8px] font-black text-white uppercase tracking-[0.2em] rounded-bl-xl">
                          PRESET
                        </div>
                        
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                          <BookOpen size={24} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-amber-600 transition-colors">{set.title}</h3>
                        <p className="text-slate-400 text-sm font-medium mb-4 line-clamp-2">{set.description}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {set._count?.questions || 0} Pertanyaan
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(set.id); }}
                              className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors group/btn"
                              title="Salin ke Koleksi"
                            >
                              <Copy size={16} />
                            </button>
                            <ArrowRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 2. User Collection - Searchable */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <User size={14} className="text-blue-500" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {searchQuery ? `Hasil Pencarian Koleksi ("${searchQuery}")` : "Koleksi Paket Soal Anda"}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {isLoadingSets ? (
                    [1, 2, 3].map((i) => <QuestionSetSkeleton key={i} />)
                  ) : userSets.length > 0 ? (
                    userSets.map((set) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        key={set.id}
                        onClick={() => setActiveQuestionSet(set)}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer group relative overflow-hidden"
                      >
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <FolderOpen size={24} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{set.title}</h3>
                        <p className="text-slate-400 text-sm font-medium mb-4 line-clamp-2">{set.description || "Tidak ada deskripsi."}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {set._count?.questions || 0} Pertanyaan • {new Date(set.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(set.id); }}
                              className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                              title="Duplikat"
                            >
                              <Copy size={16} />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingSet(set);
                                setNewSetTitle(set.title);
                                setNewSetDescription(set.description || "");
                                setShowSetModal(true);
                              }}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteSet(set.id); }}
                              className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                            <ArrowRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200"
                    >
                      <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">
                        {searchQuery ? "Tidak ada koleksi yang cocok." : "Belum ada koleksi pribadi."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <PaginationControls 
          meta={pagination.sets} 
          onPageChange={(page) => fetchQuestionSets(page)} 
        />

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
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">• {activeQuestionSet.isPreset ? 'Paket Resmi EduBoard' : 'Koleksi Saya'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {activeQuestionSet.isPreset ? (
            <button 
              onClick={() => handleDuplicate(activeQuestionSet.id)}
              className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20 transition-all gap-3"
            >
              <Copy size={20}/> <span>Salin ke Koleksi</span>
            </button>
          ) : (
            <>
              <button 
                onClick={handleDownloadTemplate}
                className="px-4 py-3 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
                title="Unduh Template Excel"
              >
                <Download size={20} /> <span className="hidden sm:inline">Template</span>
              </button>
              <label className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold cursor-pointer">
                <FileUp size={20} /> <span className="hidden sm:inline">Import Excel/CSV</span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
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

      {/* Questions List/Grid */}
      <AnimatePresence mode="wait">
        {isLoadingQuestions ? (
          <div className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <QuestionCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : (
          <motion.div 
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}
          >
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map(q => {
                const style = getTypeStyle(q.type);
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={q.id} 
                    className={`bg-white border border-slate-100 shadow-sm hover:shadow-md group ${viewMode === 'GRID' ? 'p-6 rounded-3xl' : 'p-4 rounded-2xl flex items-center gap-4'}`}
                  >
                    {viewMode === 'GRID' ? (
                      <div className="w-full">
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
                              onClick={() => setConfirmDeleteQuestion(q.id ?? null)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
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
                              onClick={() => setConfirmDeleteQuestion(q.id ?? null)}
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
              })
            ) : (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p>Belum ada soal dalam paket ini.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <PaginationControls 
        meta={pagination.questions} 
        onPageChange={(page) => fetchQuestions(activeQuestionSet!.id, page)} 
      />

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

// ─── EXTERNAL COMPONENTS ──────────────────────────────────────────────────────

interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
}

function PaginationControls({ 
  meta, 
  onPageChange 
}: { 
  meta: PaginationMeta; 
  onPageChange: (page: number) => void; 
}) {
  if (meta.totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    // Smooth scroll ke atas daftar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-12 pb-10">
      <button
        disabled={meta.page === 1}
        onClick={() => handlePageChange(meta.page - 1)}
        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: meta.totalPages }).map((_, i) => {
          const pageNum = i + 1;
          if (
            pageNum === 1 || 
            pageNum === meta.totalPages || 
            (pageNum >= meta.page - 1 && pageNum <= meta.page + 1)
          ) {
            return (
              <button
                key={i}
                onClick={() => handlePageChange(pageNum)}
                className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                  meta.page === pageNum 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                {pageNum}
              </button>
            );
          }
          if (pageNum === meta.page - 2 || pageNum === meta.page + 2) {
            return <span key={i} className="px-1 text-slate-300">...</span>;
          }
          return null;
        })}
      </div>
      <button
        disabled={meta.page === meta.totalPages}
        onClick={() => handlePageChange(meta.page + 1)}
        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

function QuestionSetSkeleton() {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 animate-pulse">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4" />
      <div className="h-6 bg-slate-100 rounded-lg w-2/3 mb-2" />
      <div className="h-4 bg-slate-100 rounded-lg w-full mb-1" />
      <div className="h-4 bg-slate-100 rounded-lg w-1/2 mb-6" />
      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="h-3 bg-slate-100 rounded w-24" />
        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}

function QuestionCardSkeleton({ viewMode }: { viewMode: 'GRID' | 'LIST' }) {
  if (viewMode === 'LIST') {
    return (
      <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-5 w-16 bg-slate-100 rounded-lg" />
        <div className="h-4 w-12 bg-slate-100 rounded" />
      </div>
      <div className="space-y-2 mb-6">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
      </div>
      <div className="pt-4 border-t border-slate-50 flex justify-end">
        <div className="h-8 w-16 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
