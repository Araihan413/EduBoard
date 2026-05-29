"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/75"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{ willChange: "transform, opacity" }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-slate-100 flex flex-col items-center text-center overflow-hidden"
          >
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

            {/* Icon */}
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-inner">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              {title}
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              {description}
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={onConfirm}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
              >
                {confirmLabel}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
              >
                {cancelLabel}
              </button>
            </div>

            <button
              onClick={onCancel}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
