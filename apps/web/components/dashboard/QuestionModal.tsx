"use client";

import { useState } from "react";
import { Plus, X, Type, Star, Layers, CheckCircle2, ListFilter, Disc3 } from "lucide-react";
import { useGameStore, QuestionCard } from "../../store/gameStore";
import { toast } from "sonner";
import { motion} from "framer-motion";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingQuestion: QuestionCard | null;
  setId?: string;
}

export default function QuestionModal({ isOpen, onClose, editingQuestion, setId }: QuestionModalProps) {
  const { addQuestion, updateQuestion } = useGameStore();

  const [newQ, setNewQ] = useState<Omit<QuestionCard, 'id' | 'setId'>>({
    type: editingQuestion?.type || 'DASAR',
    text: editingQuestion?.text || '',
    points: editingQuestion?.points || 10,
    answerKey: editingQuestion?.answerKey || '',
    options: editingQuestion?.options || ['', '', '', '']
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newQ.text) {
      toast.error("Pertanyaan tidak boleh kosong!");
      return;
    }

    if (newQ.type === 'DASAR' && (!newQ.answerKey || newQ.options?.some(o => !o))) {
      toast.error("Harap isi semua opsi dan kunci jawaban!");
      return;
    }

    setIsSaving(true);
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id!, newQ);
        toast.success("Pertanyaan diperbarui!");
      } else {
        if (!setId) throw new Error("setId is required for new questions");
        await addQuestion(setId, newQ as any);
        toast.success("Pertanyaan baru ditambahkan!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan soal");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden"
      >
        {/* 1. Header - Fixed */}
        <div className="p-8 lg:p-10 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {editingQuestion ? 'Edit Soal' : 'Soal Baru'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Penyunting Bank Soal</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* 2. Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8 custom-scrollbar">
          {/* Type Selector */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
              <Layers size={14} className="text-[#2c49c5]" /> Kategori Kartu
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["DASAR", "AKSI", "TANTANGAN"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewQ({...newQ, type})}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border-2 ${
                    newQ.type === type 
                      ? 'bg-blue-50 border-[#2c49c5] text-[#2c49c5]' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
              <Type size={14} className="text-[#2c49c5]" /> Isi Pertanyaan
            </label>
            <textarea 
              value={newQ.text} 
              onChange={(e) => setNewQ({...newQ, text: e.target.value})} 
              placeholder="Apa yang ingin kamu tanyakan kepada tim petualang?" 
              className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-slate-900 font-bold min-h-[120px] focus:border-[#2c49c5] focus:bg-white transition-all outline-none resize-none"
            />
          </div>

          {/* Points */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
              <Star size={14} className="text-[#2c49c5]" /> Poin Hadiah
            </label>
            <input 
              type="number" 
              value={newQ.points} 
              onChange={(e) => setNewQ({...newQ, points: Number(e.target.value)})} 
              placeholder="Jumlah poin (10, 20, 30...)" 
              className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-slate-900 font-bold focus:border-[#2c49c5] focus:bg-white transition-all outline-none" 
            />
          </div>
          
          {/* Multiple Choice Options */}
          {newQ.type === 'DASAR' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 p-6 lg:p-8 bg-slate-50 rounded-[2rem] border border-slate-100"
            >
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-black text-[#2c49c5] uppercase tracking-widest">
                  <ListFilter size={14} /> Pilihan Ganda
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {newQ.options?.map((opt, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input 
                        value={opt} 
                        onChange={(e) => {
                          const next = [...(newQ.options || [])];
                          next[idx] = e.target.value;
                          setNewQ({...newQ, options: next});
                        }} 
                        placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                        className="w-full bg-white border-2 border-slate-100 p-4 pl-10 rounded-xl text-sm text-slate-700 font-bold focus:border-[#2c49c5] transition-all outline-none" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest">
                  <CheckCircle2 size={14} /> Kunci Jawaban
                </label>
                <select 
                  value={newQ.answerKey} 
                  onChange={(e) => setNewQ({...newQ, answerKey: e.target.value})} 
                  className="w-full bg-white border-2 border-emerald-100 p-4 rounded-xl text-sm text-emerald-600 font-black focus:border-emerald-500 transition-all outline-none"
                >
                  <option value="">Pilih Kunci Jawaban...</option>
                  {newQ.options?.map((opt, idx) => opt && (
                    <option key={idx} value={opt}>{String.fromCharCode(65 + idx)}. {opt}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </div>

        {/* 3. Footer - Fixed */}
        <div className="p-8 lg:p-10 border-t border-slate-50 flex gap-4 flex-shrink-0 bg-white/80 backdrop-blur-md">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-2xl font-black transition-all active:scale-95 text-xs tracking-widest"
          >
            BATAL
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex-1 py-4 bg-[#2c49c5] hover:bg-[#1a34a8] text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all active:scale-95 text-xs tracking-widest disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? <Disc3 className="w-4 h-4 animate-spin" /> : 'SIMPAN SOAL'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
