"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  BookOpen,
  Trophy,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface PlayerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerGuideModal({ isOpen, onClose }: PlayerGuideModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "1. Lempar Dadu & Jalankan Pion",
      icon: <Gamepad2 className="w-10 h-10 text-[#2c49c5]" />,
      iconBg: "bg-blue-50 border-blue-100 text-[#2c49c5]",
      desc: "Pada giliran timmu, klik tombol kocok dadu. Pion timmu akan melangkah otomatis menyusuri petak papan sesuai angka dadu (1-6) yang didapatkan.",
      details: [
        "Animasi dadu 3D interaktif.",
        "Pion bergerak otomatis ke petak tujuan."
      ]
    },
    {
      title: "2. Selesaikan Misi Kartu Soal",
      icon: <BookOpen className="w-10 h-10 text-amber-500" />,
      iconBg: "bg-amber-50 border-amber-100 text-amber-500",
      desc: "Tiap petak memiliki jenis kartu soal berbeda yang harus dijawab kelompok sebelum batas waktu menjawab habis.",
      cards: [
        { name: "DASAR", desc: "Pilihan Ganda (A,B,C,D). Dinilai otomatis." },
        { name: "TANTANGAN", desc: "Praktik lisan di kelas. Dinilai langsung oleh guru." },
        { name: "PEMAHAMAN", desc: "Isian singkat tertulis. Dinilai langsung oleh guru." }
      ]
    },
    {
      title: "3. Raih Skor Tertinggi & Menang!",
      icon: <Trophy className="w-10 h-10 text-emerald-500" />,
      iconBg: "bg-emerald-50 border-emerald-100 text-emerald-500",
      desc: "Permainan dibatasi waktu sesi global dari guru. Kumpulkan poin sebanyak mungkin dari jawaban kartu soal untuk memenangkan permainan.",
      details: [
        "Peringkat klasemen di-update real-time.",
        "Tim dengan skor tertinggi di akhir sesi adalah pemenangnya!"
      ]
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        {/* Backdrop overlay click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative bg-white w-full max-w-md h-[580px] max-h-[85vh] rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 md:p-8 flex flex-col gap-4 z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-50 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2c49c5] flex items-center justify-center border border-blue-100 shadow-sm">
                <Sparkles size={16} />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Panduan Misi</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
            >
              <X size={18} />
            </button>
          </div>

          {/* Slider Content */}
          <div className="flex-1 overflow-y-auto min-h-[200px] pr-1 flex flex-col justify-between gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                {/* Icon wrapper */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm ${slides[currentSlide].iconBg}`}>
                  {slides[currentSlide].icon}
                </div>

                <h4 className="text-base font-black text-slate-800 tracking-tight">
                  {slides[currentSlide].title}
                </h4>

                <p className="text-slate-500 text-sm leading-relaxed">
                  {slides[currentSlide].desc}
                </p>

                {/* Optional Cards list (Slide 2) */}
                {slides[currentSlide].cards && (
                  <div className="space-y-2 pt-1">
                    {slides[currentSlide].cards?.map((card, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#2c49c5] tracking-wider">{card.name}</span>
                          <span className="text-sm text-slate-500">{card.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional details checklist (Slide 1 & 3) */}
                {slides[currentSlide].details && (
                  <ul className="space-y-2 pt-1">
                    {slides[currentSlide].details?.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="mt-1 w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2c49c5]" />
                        </div>
                        <span className="text-sm text-slate-600">{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slider Controls & Dot Indicators */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-50 flex-shrink-0">
            {/* Dots */}
            <div className="flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === idx ? "w-6 bg-[#2c49c5]" : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                disabled={currentSlide === slides.length - 1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Bottom Close Button */}
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] flex-shrink-0"
          >
            Tutup Panduan
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
