"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";
import { joinCurrentRoom, session, leaveAndClean } from "@/lib/session";
import type { QuestionData } from "@/lib/types";
import { useIsHydrated } from "@/lib/use-is-hydrated";

export default function WaitingPage() {
  const [participants, setParticipants] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const isHydrated = useIsHydrated();
  const roomId = isHydrated ? session.getRoomId() : null;
  const nickname = isHydrated ? session.getNickname() : null;
  const router = useRouter();

  useEffect(() => {
    const storedRoomId = session.getRoomId();
    const storedNickname = session.getNickname();
    const playerToken = session.getPlayerToken();
    if (!storedRoomId || !storedNickname || !playerToken) {
      session.clearRoom();
      router.replace("/");
      return;
    }

    const handleRoomUpdate = (list: string[]) => {
      setParticipants(list);
    };
    const handleYourRole = (role: "question" | "answer") => {
      session.setRole(role);
      session.clearCurrentQuestion();
    };
    const handleGameStart = () => {
      router.push("/game");
    };
    const handleRoomContext = (ctx: string) => {
      session.setContext(ctx);
    };
    const handleQuestion = (question: QuestionData) => {
      if (!question?.questionId || !question.text) return;
      session.setCurrentQuestion(question.text);
      session.setCurrentQuestionId(question.questionId);
    };
    const handleYourAdmin = (admin: boolean) => {
      setIsAdmin(admin);
      session.setIsAdmin(admin);
    };
    const handleEnterRoomError = () => {
      session.clearRoom();
      router.replace("/");
    };
    const handleSocketConnect = () => {
      joinCurrentRoom();
    };
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("yourRole", handleYourRole);
    socket.on("gameStart", handleGameStart);
    socket.on("roomContext", handleRoomContext);
    socket.on("question", handleQuestion);
    socket.on("yourAdmin", handleYourAdmin);
    socket.on("enterRoomError", handleEnterRoomError);

    socket.on("connect", handleSocketConnect);
    if (socket.connected) joinCurrentRoom();

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("yourRole", handleYourRole);
      socket.off("gameStart", handleGameStart);
      socket.off("roomContext", handleRoomContext);
      socket.off("question", handleQuestion);
      socket.off("yourAdmin", handleYourAdmin);
      socket.off("enterRoomError", handleEnterRoomError);
      socket.off("connect", handleSocketConnect);
    };
  }, [router]);

  if (!roomId || !nickname) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        参加情報を確認中...
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-4">
        <h1 className="text-2xl font-bold mb-4">{nickname}として待機中</h1>
        <p className="text-base-content/70 mb-4 text-center">
          他のプレイヤーを待っています...
          <br />
          合言葉は&ldquo;{roomId}&rdquo;です
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs items-center justify-center mb-4">
          <div className="badge badge-lg badge-accent">
            {participants.length} 人が参加中
          </div>
        </div>
        <ul className="list bg-base-100 rounded-box shadow-lg w-full max-w-xs mb-4 overflow-y-auto max-h-[40vh]">
          <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">参加者</li>
          {participants.map((name, index) => (
            <li key={index} className="list-row px-4 py-2">
              <div className="flex items-center gap-3">
                <span>{name}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="sticky bottom-4 flex items-center justify-center gap-4 w-full max-w-xs bg-base-100 pt-2 pb-1">
          <button
            className="btn btn-outline w-1/2"
            onClick={() => {
              leaveAndClean();
              router.push("/");
            }}
          >
            退出
          </button>
          {isAdmin && (
            <button
              className="btn btn-accent w-1/2"
              onClick={() => {
                session.clearRole();
                socket.emit("startGame", {
                  roomId,
                  playerId: session.getPlayerId(),
                  playerToken: session.getPlayerToken(),
                });
              }}
            >
              開始
            </button>
          )}
        </div>
      </main>
    </>
  );
}
