"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useGameStore } from "../../store/gameStore";

export default function BackgroundMusic() {
  const pathname = usePathname();
  const { isMuted } = useGameStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // 1. Logic to determine which track to play
  const getTrack = (path: string) => {
    if (path === "/board") return "/audio/gameplay-bgm.mp3";
    if (path === "/lobby") return "/audio/lobby-bgm.mp3";
    return null;
  };

  const currentTrack = getTrack(pathname);

  // 2. Handle User Interaction (required for autoplay)
  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  // 3. Main Audio Control Logic
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }

    const audio = audioRef.current;

    // Handle Mute
    audio.muted = isMuted;

    // Handle Track Switch
    if (currentTrack) {
      if (audio.src !== window.location.origin + currentTrack) {
        audio.src = currentTrack;
        audio.load();
      }

      if (hasInteracted && !isMuted) {
        audio.play().catch((err) => {
          console.warn("[AUDIO] Playback failed:", err);
        });
      }
    } else {
      audio.pause();
    }

    return () => {
      // Pause on cleanup to prevent lingering audio
      if (!currentTrack) {
        audio.pause();
      }
    };
  }, [currentTrack, isMuted, hasInteracted]);

  // 4. Force Stop on Unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return null; // This component doesn't render anything visually
}
