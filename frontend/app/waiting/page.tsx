"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:8000");

export default function WaitingPage() {
  const roomId = sessionStorage.getItem("roomId");
  const nickname = sessionStorage.getItem("nickname");
  const [participants, setParticipants] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const handleRoomUpdate = (list: string[]) => {
      setParticipants(list);
    };
    const handleGameStart = () => {
      router.push("/game");
    };
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameStart", handleGameStart);

    socket.emit("joinRoom", { roomId, nickname });

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("gameStart", handleGameStart);
    };

  }, [roomId, nickname, router]);

  return (
    <>
      <main className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-4">
        <h1 className="text-2xl font-bold mb-4">待機中</h1>
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
            router.push("/");
          }}>退出</button>
          <button className="btn btn-accent w-1/2"
          onClick={() => {
            socket.emit("startGame", roomId);
          }}>開始</button>
        </div>
      </main>
    </>
  );
}
