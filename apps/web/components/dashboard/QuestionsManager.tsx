"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, BookOpen, Target, Flame, ChevronRight, LayoutGrid, List, FileUp, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useGameStore, QuestionCard, QuestionType } from "../../store/gameStore";
import { QUESTION_PRESETS } from "../../data/questionPresets";
import QuestionModal from "./QuestionModal";
import { motion, AnimatePresence } from "framer-motion";

export default function QuestionsManager() {
  const { questions, deleteQuestion, addQuestion, fetchQuestions } = useGameStore();
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionCard | null>(null);
  
  // View & Filter states
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuestionType | "ALL">("ALL");

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Close tooltip when clicking elsewhere
  useEffect(() => {
    const handleGlobalClick = () => setActiveTooltip(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleEdit = (q: QuestionCard) => {
    setEditingQuestion(q);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingQuestion(null);
    setShowModal(true);
  };

  const loadPreset = () => {
    const preset = QUESTION_PRESETS[0];
    preset.questions.forEach(q => {
      addQuestion(q as any);
    });
    toast.success(`${preset.name} berhasil ditambahkan!`);
  };

  const downloadTemplate = () => {
    const headers = "type,text,points,options,answerKey\n";
    const sample = "DASAR,Apa nama planet terdekat dari Matahari?,10,Merkurius;Venus;Bumi;Mars,Merkurius\nTANTANGAN,Sebutkan 3 rukun Islam!,20,,\nAKSI,Lakukan push up 5 kali!,15,,";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "template_soal_eduboard.csv";
    a.click();
    toast.success("Template berhasil diunduh!");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        let count = 0;
        const errors: string[] = [];

        if (lines.length <= 1) {
          toast.error("File CSV kosong atau hanya berisi header!");
          return;
        }

        const validTypes: QuestionType[] = ['DASAR', 'AKSI', 'TANTANGAN'];

        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(',');
          if (parts.length < 2) {
            errors.push(`Baris ${i + 1}: Format kolom tidak lengkap.`);
            continue;
          }

          const [type, textContent, points, optionsRaw, answerKey] = parts;
          const upperType = type.toUpperCase() as QuestionType;

          if (!validTypes.includes(upperType)) {
            errors.push(`Baris ${i + 1}: Tipe soal '${type}' tidak valid.`);
            continue;
          }

          if (!textContent) {
            errors.push(`Baris ${i + 1}: Isi pertanyaan kosong.`);
            continue;
          }

          const pointsNum = Number(points);
          if (points && isNaN(pointsNum)) {
            errors.push(`Baris ${i + 1}: Poin harus berupa angka.`);
            continue;
          }

          addQuestion({
            type: upperType,
            text: textContent,
            points: pointsNum || 10,
            options: optionsRaw ? optionsRaw.split(';') : ['', '', '', ''],
            answerKey: answerKey || ''
          });
          count++;
        }
        
        if (errors.length > 0) {
          errors.slice(0, 3).forEach(err => toast.warning(err));
          if (errors.length > 3) toast.error(`Ada ${errors.length} baris bermasalah.`);
        }

        if (count > 0) {
          toast.success(`${count} soal berhasil diimport!`);
        }
        e.target.value = ''; 
      } catch (err) {
        toast.error("Gagal membaca file CSV!");
      }
    };
    reader.readAsText(file);
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

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Bank Soal</h2>
          <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mt-2">Koleksi Pertanyaan Edukasi</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* View Toggle (Mobile/Tablet Only) */}
          <div className="lg:hidden bg-slate-100 p-1 rounded-2xl flex items-center gap-1 mr-auto sm:mr-0">
             <button 
               onClick={() => setViewMode('GRID')}
               className={`p-2.5 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white shadow-sm text-[#2c49c5]' : 'text-slate-400'}`}
             >
               <LayoutGrid size={20} />
             </button>
             <button 
               onClick={() => setViewMode('LIST')}
               className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-[#2c49c5]' : 'text-slate-400'}`}
             >
               <List size={20} />
             </button>
          </div>

          {/* Grouped Actions Container */}
          <div className="flex-1 lg:flex-none flex items-center bg-slate-50/50 p-2 rounded-2xl border border-slate-100 gap-2">
            <div className="px-3 hidden sm:block border-r border-slate-200">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Aksi Cepat</p>
            </div>

            <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
              {/* Preset Button */}
              <div className="group relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); loadPreset(); }}
                  onMouseEnter={() => setActiveTooltip('preset')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="flex flex-col sm:block items-center gap-1 p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100"
                >
                  <Sparkles size={18} />
                  <span className="sm:hidden text-[8px] font-black uppercase">Preset</span>
                </button>
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap shadow-xl z-[250] ${activeTooltip === 'preset' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100'}`}>
                  Gunakan Preset <span className="text-slate-400 block font-medium">Tambah paket soal standar instan</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>

              {/* Template Button */}
              <div className="group relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                  onMouseEnter={() => setActiveTooltip('template')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="flex flex-col sm:block items-center gap-1 p-3 bg-white text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-200"
                >
                  <Download size={18} />
                  <span className="sm:hidden text-[8px] font-black uppercase">Format</span>
                </button>
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap shadow-xl z-[250] ${activeTooltip === 'template' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100'}`}>
                  Unduh Template <span className="text-slate-400 block font-medium">Gunakan format CSV yang benar</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>

              {/* Import Button */}
              <div className="group relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); document.getElementById('csvInput')?.click(); }}
                  onMouseEnter={() => setActiveTooltip('import')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="flex flex-col sm:block items-center gap-1 p-3 bg-blue-50 text-[#2c49c5] hover:bg-blue-100 rounded-xl transition-all border border-blue-100"
                >
                  <FileUp size={18} />
                  <span className="sm:hidden text-[8px] font-black uppercase">Import</span>
                </button>
                <input 
                  type="file" 
                  id="csvInput" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleImportCSV}
                />
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap shadow-xl z-250 ${activeTooltip === 'import' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100'}`}>
                  Import CSV <span className="text-slate-400 block font-medium">Tambah banyak soal sekaligus</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleAdd} 
            className="flex-1 lg:w-auto px-6 sm:px-8 py-4 bg-[#2c49c5] hover:bg-[#1a34a8] text-white font-black rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all gap-3"
          >
            <Plus className="w-5 h-5"/> <span className="whitespace-nowrap">Soal Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Section */}
      <div className="bg-white p-4 lg:p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col lg:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Cari soal..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-2 pl-12 rounded-2xl text-slate-900 font-bold focus:border-[#2c49c5] transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 flex-1 lg:flex-none scroll-smooth">
            {(["ALL", "DASAR", "AKSI", "TANTANGAN"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all whitespace-nowrap border-2 ${
                  activeFilter === filter 
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                }`}
              >
                {filter === "ALL" ? "Semua" : filter}
              </button>
            ))}
          </div>

          <div className="hidden lg:block w-px h-10 bg-slate-100 mx-2" />

          <div className="hidden lg:flex bg-slate-100 p-1 rounded-2xl items-center gap-1">
             <button 
               onClick={() => setViewMode('GRID')}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'GRID' ? 'bg-white text-[#2c49c5] shadow-sm' : 'text-slate-400'}`}
             >
               <LayoutGrid size={14} /> Grid
             </button>
             <button 
               onClick={() => setViewMode('LIST')}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'LIST' ? 'bg-white text-[#2c49c5] shadow-sm' : 'text-slate-400'}`}
             >
               <List size={14} /> List
             </button>
          </div>
        </div>
      </div>
      
      {/* 3. Questions Display */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}
          >
            {filteredQuestions.map((q, idx) => {
              const style = getTypeStyle(q.type);
              
              if (viewMode === 'GRID') {
                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all group flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${style.bg} ${style.border} ${style.color}`}>
                        {style.icon}
                        <span className="text-[9px] font-black uppercase tracking-widest">{q.type}</span>
                      </div>
                      <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <span className="text-sm font-black text-slate-900">{q.points > 0 ? `+${q.points}` : q.points} <span className="text-[9px] text-slate-400">PTS</span></span>
                      </div>
                    </div>

                    <div className="flex-1 mb-8">
                      <p className="text-slate-700 font-bold leading-relaxed line-clamp-3">
                        {q.text}
                      </p>
                      {q.type === 'DASAR' && q.answerKey && (
                        <div className="mt-4 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Kunci: <span className="text-emerald-600">{q.answerKey}</span></p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(q)} 
                          className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-[#2c49c5] hover:border-[#2c49c5] rounded-xl transition-all shadow-sm"
                        >
                          <Pencil size={18}/>
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm("Hapus soal ini?")) {
                              try {
                                await deleteQuestion(q.id);
                                toast.success("Soal berhasil dihapus");
                              } catch (err) {
                                toast.error("Gagal menghapus soal");
                              }
                            }
                          }} 
                          className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                      <div className="text-slate-200 group-hover:text-blue-500/20 transition-colors">
                        <ChevronRight size={24} />
                      </div>
                    </div>
                  </div>
                );
              }

              // LIST VIEW
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-6 shadow-sm hover:shadow-lg transition-all group flex items-center gap-6"
                >
                  <div className={`hidden md:flex items-center justify-center w-12 h-12 rounded-xl border-2 ${style.bg} ${style.border} ${style.color}`}>
                    {style.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`md:hidden text-[8px] font-black uppercase tracking-widest ${style.color}`}>{q.type}</span>
                      <p className="text-sm font-bold text-slate-800 truncate">{q.text}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{q.points} Poin</span>
                      {q.type === 'DASAR' && q.answerKey && (
                        <>
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="text-emerald-600 truncate">Kunci: {q.answerKey}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(q)} 
                      className="p-2.5 text-slate-400 hover:text-[#2c49c5] transition-colors"
                    >
                      <Pencil size={16}/>
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm("Hapus soal ini?")) {
                          try {
                            await deleteQuestion(q.id);
                            toast.success("Soal berhasil dihapus");
                          } catch (err) {
                            toast.error("Gagal menghapus soal");
                          }
                        }
                      }} 
                      className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                   <Search size={40} />
                </div>
                <h4 className="text-xl font-black text-slate-900">Soal tidak ditemukan</h4>
                <p className="text-slate-400 font-medium mt-2">Coba gunakan kata kunci atau filter lain.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {showModal && (
        <QuestionModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          editingQuestion={editingQuestion}
        />
      )}
    </div>
  );
}
