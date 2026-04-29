"use client";

import { useState, useSyncExternalStore } from "react";
import { useGameStore } from "../../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";

// Modular Components
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import RoomSetupHub from "@/components/dashboard/RoomSetupHub";
import MissionControl from "@/components/dashboard/MissionControl";
import GradingPanel from "@/components/dashboard/GradingPanel";
import FinishedState from "@/components/dashboard/FinishedState";
import QuestionsManager from "@/components/dashboard/QuestionsManager";
import SessionHistory from "@/components/dashboard/SessionHistory";
import LiveMonitoringConsole from "@/components/dashboard/LiveMonitoringConsole";
import MobileLiveTicker from "@/components/dashboard/MobileLiveTicker";
import MobileLogOverlay from "@/components/dashboard/MobileLogOverlay";

export default function DashboardPage() {
  const { 
    gameStatus, logs, resetToIdle, pendingReviews, roomCode,
    activeTab, setActiveTab
  } = useGameStore();

  const [showMobileLog, setShowMobileLog] = useState(false);
  // Modern React 18 hydration detection (Avoids components disappearing on refresh)
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!isMounted) return <div className="min-h-screen bg-[#fafafa]" />;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      
      {/* Top Navbar Component */}
      <DashboardNavbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        resetToIdle={resetToIdle}
      />

      {/* Main Content Area */}
      <main className="flex-1 pt-32 pb-16 px-6 md:px-8 lg:px-12 max-w-7xl mx-auto w-full">
        
        {/* Mobile Live Ticker */}
        <MobileLiveTicker logs={logs} onClick={() => setShowMobileLog(true)} />

            <AnimatePresence mode="wait">
              {activeTab === 'SESI' && (
                <motion.div 
                  key="sesi"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-12"
                >
                  <div className="lg:col-span-2 space-y-12">
                    {gameStatus === 'IDLE' && !roomCode && <RoomSetupHub />}
                    {((gameStatus === 'LOBBY' || gameStatus === 'PLAYING') || roomCode) && gameStatus !== 'FINISHED' && gameStatus !== 'IDLE' && <MissionControl />}
                    {gameStatus === 'IDLE' && roomCode && <MissionControl />}
                    {gameStatus === 'FINISHED' && <FinishedState />}
                    
                    {/* Separate Grading Panel */}
                    {pendingReviews.length > 0 && <GradingPanel />}
                  </div>

                  {/* Desktop Live Monitoring Console - Only in SESI tab */}
                  <aside className="hidden lg:block">
                    <LiveMonitoringConsole logs={logs} />
                  </aside>
                </motion.div>
              )}

              {activeTab === 'SOAL' && (
                <motion.div 
                  key="soal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-5xl mx-auto w-full"
                >
                  <QuestionsManager />
                </motion.div>
              )}

              {activeTab === 'RIWAYAT' && (
                <motion.div 
                  key="riwayat"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-5xl mx-auto w-full"
                >
                  <SessionHistory />
                </motion.div>
              )}
            </AnimatePresence>
        
        {/* Mobile Log Overlay Component */}
        <MobileLogOverlay 
          isOpen={showMobileLog} 
          onClose={() => setShowMobileLog(false)} 
          logs={logs} 
        />

      </main>
    </div>
  );
}
