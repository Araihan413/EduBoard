"use client";

import { useEffect } from 'react';
import { useGameStore, socket } from '../store/gameStore';
import { toast } from 'sonner';

export default function SocketInitializer() {
  const { roomCode, myGroupName } = useGameStore();

  // Registration of global socket listeners
  useEffect(() => {
    const s = socket;
    if (!s) return;

    const handleCancelled = (data: { roomCode: string }) => {
      const state = useGameStore.getState();
      
      // Only handle if this is the room we are currently in
      if (state.roomCode === data.roomCode) {
        console.log(`Room ${data.roomCode} cancelled. Role check...`);
        
        // Distinguish Guru vs Student
        // Guru doesn't have a group name, Students do.
        if (state.myGroupName) {
          toast.error("Ruang permainan telah dibatalkan oleh Guru", {
            description: "Silakan masukkan kode room yang baru.",
            duration: 5000,
          });
          
          state.resetToIdle();
        }
      }
    };

    s.on("room:cancelled", handleCancelled);

    return () => {
      s.off("room:cancelled", handleCancelled);
    };
  }, []); // Only register once

  // Re-join logic on connection/reconnection
  useEffect(() => {
    const s = socket;
    if (!s) return;

    const handleConnect = () => {
      console.log("Socket connected, checking for active room session...");
      if (roomCode) {
        const role = localStorage.getItem(`eduboard_role_${roomCode}`);
        
        if (role === 'guru') {
          s.emit("room:join", { 
            roomCode, 
            role: 'guru',
            roomConfig: useGameStore.getState().roomConfig
          });
        } else if (myGroupName) {
          s.emit("room:join", { 
            roomCode, 
            groupName: myGroupName 
          });
        }
      }
    };

    s.on("connect", handleConnect);
    if (s.connected) handleConnect();

    return () => {
      s.off("connect", handleConnect);
    };
  }, [roomCode, myGroupName]);

  return null;
}
