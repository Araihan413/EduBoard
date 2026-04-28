"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Hapus",
  cancelText = "Batal",
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative background icon */}
          <div className="absolute -top-10 -right-10 opacity-[0.03] text-slate-900">
            <AlertTriangle size={200} />
          </div>

          <div className="relative z-10">
            <div className={`w-16 h-16 ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'} rounded-2xl flex items-center justify-center mb-6`}>
              <AlertTriangle size={32} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">{message}</p>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-2xl transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-6 py-4 ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'} text-white font-black rounded-2xl shadow-lg transition-all active:scale-95`}
              >
                {confirmText}
              </button>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
