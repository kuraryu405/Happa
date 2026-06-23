"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";

export default function WaitingPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedRoomId = sessionStorage.getItem("roomId");
    const storedNickname = sessionStorage.getItem("nickname");
    setRoomId(storedRoomId);
    setNickname(storedNickname);

    const handleRoomUpdate = (list: string[]) => {
      setParticipants(list);
    };
    const handleYourRole = (role: "question" | "answer") => {
      sessionStorage.setItem("role", role);
    };
    const handleGameStart = () => {
      router.push("/game");
    };
    const handleRoomContext = (ctx: string) => {
      sessionStorage.setItem("context", ctx);
    };
    const handleYourAdmin = (admin: boolean) => {
      setIsAdmin(admin);
      sessionStorage.setItem("isAdmin", String(admin));
    };
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("yourRole", handleYourRole);
    socket.on("gameStart", handleGameStart);
    socket.on("roomContext", handleRoomContext);
    socket.on("yourAdmin", handleYourAdmin);

    socket.emit("joinRoom", { roomId: storedRoomId, nickname: storedNickname });

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("yourRole", handleYourRole);
      socket.off("gameStart", handleGameStart);
      socket.off("roomContext", handleRoomContext);
      socket.off("yourAdmin", handleYourAdmin);
    };

  }, [router]);

  return (
    <>
      <main className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-4">
        <h1 className="text-2xl font-bold mb-4">{nickname}として待機中</h1>
        <p className="text-base-content/70 mb-4 text-center">他のプレイヤーを待っています...<br />合言葉は"{roomId}"です</p>
        <div className="flex flex-col gap-2 w-full max-w-xs items-center justify-center mb-4">
          <div className="badge badge-lg badge-accent">{participants.length} 人が参加中</div>
        </div>
        <ul className="list bg-base-100 rounded-box shadow-lg w-full max-w-xs mb-4 overflow-y-auto max-h-[40vh]">
          <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">参加者</li>
          {participants.map((name, index) => (
            <li key={index} className="list-row px-4 py-2">
              <div className="flex items-center gap-3">
                {/* <div className="avatar placeholder">
                  <div className="bg-accent text-accent-content rounded-full w-8">
                    <span className="text-sm">{name[0]}</span>
                  </div>
                </div> */}
                <span>{name}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="sticky bottom-4 flex items-center justify-center gap-4 w-full max-w-xs bg-base-100 pt-2 pb-1">
          <button className="btn btn-outline w-1/2" onClick={() => {
            socket.emit("leaveRoom", roomId);
            sessionStorage.removeItem("roomId");
            sessionStorage.removeItem("nickname");
            sessionStorage.removeItem("role");
            router.push("/");
          }}>退出</button>
          {isAdmin && (
            <button className="btn btn-accent w-1/2"
            onClick={() => {
              sessionStorage.removeItem("role");
              socket.emit("startGame", roomId);
            }}>開始</button>
          )}
        </div>
      </main>
    </>
  );
}
