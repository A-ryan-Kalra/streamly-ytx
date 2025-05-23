import React, { createContext, useContext, useMemo, useState } from "react";
import { io } from "socket.io-client";
const SocketContext = createContext(null);
export const useSocket = () => {
  const socket = useContext(SocketContext);
  return { socket };
};

function SocketProvider({ children }) {
  const socket = useMemo(() =>
    io(["8f0nnzr5-5173.inc1.devtunnels.ms", import.meta.env.VITE_API_URL], {
      transports: ["polling"],
    })
  );

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export default SocketProvider;
