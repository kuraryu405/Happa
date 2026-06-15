import { io } from "socket.io-client";

export const apiOrigin =
  (process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:8000").replace(/\/$/, "");

export const socket = io(apiOrigin);
