"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000");

    socketInstance.on("connect", () => {
      console.log("Connected to API Server:", socketInstance.id);
    });

    Promise.resolve().then(() => setSocket(socketInstance));

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
};
