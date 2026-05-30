"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Award, Zap, AlertTriangle, AlertCircle, ArrowUp } from "lucide-react";
import { useGameStore } from "../../../store/gameStore";

export default function StarSpinOverlay() {
  const {
    isSpinningStar,
    starSpinResult,
    isSpinAnimating,
    spinStar,
    groups,
    activeGroupIndex,
    myGroupName,
    isGuru
  } = useGameStore();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const activeGroup = groups[activeGroupIndex];
  const isMyTurn = !isGuru && activeGroup?.name?.trim().toLowerCase() === myGroupName?.trim().toLowerCase();

  const options = [
    { label: "+5 POIN", color: "#10b981", type: "pts-plus" },       // index 0
    { label: "-5 POIN", color: "#f43f5e", type: "pts-minus" },      // index 1
    { label: "KARTU DASAR", color: "#3b82f6", type: "card-dasar" }, // index 2
    { label: "TANTANGAN", color: "#ef4444", type: "card-tantang" },  // index 3
    { label: "PEMAHAMAN", color: "#f97316", type: "card-paham" },   // index 4
    { label: "SKIP GILIRAN", color: "#64748b", type: "skip" }       // index 5
  ];

  const optionIndices: Record<string, number> = {
    "+5": 0,
    "-5": 1,
    "DASAR": 2,
    "TANTANGAN": 3,
    "PEMAHAMAN": 4,
    "SKIP": 5
  };

  // Math helper for drawing 60-degree circular sectors in SVG
  function getSlicePath(startAngle: number, endAngle: number, radius: number = 90) {
    const rad = Math.PI / 180;
    const x1 = 100 + radius * Math.cos(startAngle * rad);
    const y1 = 100 + radius * Math.sin(startAngle * rad);
    const x2 = 100 + radius * Math.cos(endAngle * rad);
    const y2 = 100 + radius * Math.sin(endAngle * rad);
    return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  }

  // Calculate final angle based on result index
  const resultIndex = starSpinResult ? optionIndices[starSpinResult] : 0;
  // Rotate so the center of the winning slice aligns exactly with the top pointer (12 o'clock, 270 degrees)
  const targetAngle = 240 - resultIndex * 60;
  // Spin 5 full rotations (1800 deg) before landing on the target slice
  const spinRotation = 1800 + targetAngle;

  const handleSpinClick = () => {
    if (isMyTurn && !isSpinAnimating) {
      spinStar();
    }
  };

  return (
    <AnimatePresence>
      {isSpinningStar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-950/90"
          />

          {/* Floating Premium Container */}
          <motion.div
            initial={isMobile ? undefined : { opacity: 0, y: 24 }}
            animate={isMobile ? undefined : { opacity: 1, y: 0 }}
            exit={isMobile ? undefined : { opacity: 0, y: 24 }}
            transition={isMobile ? { duration: 0.25 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-gradient-to-b from-stone-900/95 to-stone-950/98 border border-white/10 rounded-[2.5rem] p-6 lg:p-8 my-auto shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)] max-w-sm w-full text-center flex flex-col items-center z-10 select-none overflow-hidden"
          >
            {/* Ambient inner glows */}
            {!isMobile && (
              <>
                <div className="absolute top-0 left-1/4 right-1/4 h-24 bg-yellow-50/10 blur-3xl pointer-events-none rounded-full" />
                <div className="absolute -bottom-10 left-1/4 right-1/4 h-24 bg-[#2c49c5]/10 blur-3xl pointer-events-none rounded-full" />
              </>
            )}

            {/* Title Block */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-center animate-pulse">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
              <span className="text-xs font-black tracking-[0.25em] text-yellow-500 uppercase">PETAK KEBERUNTUNGAN</span>
            </div>
            
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white mb-2">RODA PUTAR STAR</h2>
            
            <p className="text-xs font-medium text-stone-400 mb-5 max-w-xs leading-relaxed">
              {isMyTurn ? (
                <>Tim <strong className="text-yellow-400 font-bold">{activeGroup?.name}</strong>, klik tombol di tengah untuk menentukan nasib tim-mu!</>
              ) : (
                <>Tim <strong className="text-yellow-400 font-bold">{activeGroup?.name}</strong> sedang memutar roda keberuntungan...</>
              )}
            </p>

            {/* =======================================================================
                SPIN WHEEL ASSEMBLY
                ======================================================================= */}
            <div className="relative w-60 h-60 lg:w-64 lg:h-64 mb-6 flex items-center justify-center pointer-events-auto">
              {/* Premium Outer Glow Ring */}
              {!isMobile && <div className="absolute inset-[-12px] rounded-full bg-yellow-500/5 border border-yellow-500/10 blur-lg pointer-events-none" />}
              <div className="absolute inset-[-4px] rounded-full border-2 border-white/5 shadow-2xl pointer-events-none" />

              {/* The Spinning Core */}
              <motion.div
                className="w-full h-full pointer-events-none"
                animate={isSpinAnimating ? { rotate: spinRotation } : { rotate: targetAngle }}
                transition={isSpinAnimating ? {
                  duration: 2.5,
                  ease: [0.15, 0.85, 0.35, 1.0] // beautiful easeOut curve
                } : { duration: 0 }}
                style={{ originX: 0.5, originY: 0.5, willChange: "transform", transform: "translate3d(0,0,0)" }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full pointer-events-none">
                  {/* Outer circle border */}
                  <circle cx="100" cy="100" r="94" fill="#1c1917" stroke="#3730a3" strokeWidth="1.5" />
                  
                  {/* Render 6 segments */}
                  {options.map((opt, i) => {
                    const startAngle = i * 60;
                    const endAngle = (i + 1) * 60;
                    const textAngle = startAngle + 30;
                    
                    const rad = Math.PI / 180;
                    const textRadius = 54;
                    const textX = 100 + textRadius * Math.cos(textAngle * rad);
                    const textY = 100 + textRadius * Math.sin(textAngle * rad);
 
                    return (
                      <g key={i}>
                        {/* Slice Segment */}
                        <path
                          d={getSlicePath(startAngle, endAngle, 91)}
                          fill={opt.color}
                          stroke="#1c1917"
                          strokeWidth="2.5"
                          className="transition-colors duration-300 opacity-90 pointer-events-none"
                          style={{ filter: "brightness(0.95)" }}
                        />
                        {/* Segment Text Label */}
                        <text
                          x={textX}
                          y={textY}
                          fill="#ffffff"
                          fontFamily="sans-serif"
                          fontWeight="900"
                          fontSize="7"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`} // rotate so it aligns vertically-ish
                        >
                          {opt.label}
                        </text>
                      </g>
                    );
                  })}
 
                  {/* Inner ring overlay */}
                  <circle cx="100" cy="100" r="28" fill="#1c1917" stroke="#ffffff/10" strokeWidth="1.5" />
                </svg>
              </motion.div>
 
              {/* Static Top Selector Pin (The Needle) */}
              <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] animate-bounce-slow pointer-events-none">
                <ArrowUp className="w-8 h-8 text-yellow-400 rotate-180 fill-yellow-400 stroke-[2.5]" />
              </div>
 
              {/* Central Premium Button / Pivot */}
              <button
                onClick={handleSpinClick}
                disabled={!isMyTurn || isSpinAnimating}
                className={`absolute rounded-full z-30 flex flex-col items-center justify-center border-4 shadow-xl transition-all duration-300 outline-none pointer-events-auto ${
                  isSpinAnimating
                    ? "bg-stone-800 border-stone-700 text-stone-600 scale-95 cursor-not-allowed"
                    : isMyTurn
                    ? "bg-gradient-to-br from-yellow-400 to-yellow-600 border-white hover:scale-105 active:scale-95 cursor-pointer text-yellow-950 hover:shadow-yellow-500/20"
                    : "bg-stone-800 border-stone-700 text-stone-400 cursor-not-allowed"
                }`}
                style={{ width: '68px', height: '68px' }}
              >
                <span className="text-[9px] font-black tracking-widest uppercase leading-none mb-0.5 pointer-events-none">
                  {isSpinAnimating ? "SPINNING" : "SPIN"}
                </span>
                <Zap className={`w-3 h-3 pointer-events-none ${isSpinAnimating ? "animate-pulse" : ""}`} />
              </button>
            </div>
 
            {/* =======================================================================
                RESULT PANEL / SUB-HUD
                ======================================================================= */}
            <div className="h-16 w-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {starSpinResult && !isSpinAnimating && (
                  <motion.div
                    initial={isMobile ? undefined : { opacity: 0, y: 15 }}
                    animate={isMobile ? undefined : { opacity: 1, y: 0 }}
                    exit={isMobile ? undefined : { opacity: 0, y: -15 }}
                    className={`bg-white/5 border border-white/10 rounded-2xl px-6 py-2.5 flex items-center gap-3 shadow-inner ${isMobile ? "" : "backdrop-blur-md"}`}
                  >
                    {starSpinResult === "+5" && <Award className="w-5 h-5 text-emerald-400 animate-bounce" />}
                    {starSpinResult === "-5" && <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />}
                    {["DASAR", "TANTANGAN", "PEMAHAMAN"].includes(starSpinResult) && <Zap className="w-5 h-5 text-blue-400 animate-pulse" />}
                    {starSpinResult === "SKIP" && <AlertCircle className="w-5 h-5 text-stone-400" />}
                    
                    <span className="text-xs font-black text-white tracking-wide uppercase">
                      HASIL: <strong className="text-yellow-400 font-bold">{starSpinResult}</strong>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
