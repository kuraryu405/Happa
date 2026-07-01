"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { session, leaveAndClean } from "@/lib/session";
import type { ResultData } from "@/lib/types";
import QuestionPage from "./question";
import AnswerPage from "./answer";
import ResultPage from "./result";

type GamePhase = "question" | "answer" | "result";

export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase | "error" | null>(() => {
    if (typeof window === "undefined") return null;
    const role = session.getRole();
    if (role === "question" || role === "answer") return role;
    return "error";
  });
  const [questionText, setQuestionText] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  // isAdmin はページ内で変化しないため setter 不要
  const [isAdmin] = useState<boolean>(() =>
    typeof window !== "undefined" ? session.getIsAdmin() : false,
  );

  const router = useRouter();

  useEffect(() => {
    const handleYourRole = (newRole: string) => {
      session.setRole(newRole);
      setResult(null);
      setQuestionText("");
      if (newRole === "question" || newRole === "answer") {
        setPhase(newRole);
      }
    };
    socket.on("yourRole", handleYourRole);

    const handleQuestion = (q: string) => {
      setQuestionText(q);
      setPhase("answer");
    };
    socket.on("question", handleQuestion);

    const handleResult = (data: ResultData) => {
      setResult(data);
      setPhase("result");
    };
    socket.on("result", handleResult);

    const handleBeforeUnload = () => leaveAndClean();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      socket.off("yourRole", handleYourRole);
      socket.off("question", handleQuestion);
      socket.off("result", handleResult);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  if (phase === "error") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-error font-bold">
          ゲームに正しく参加できませんでした
        </p>
        <p className="text-base-content/70">
          ロール情報が見つかりません。待機画面からやり直してください。
        </p>
        <button
          className="btn btn-outline"
          onClick={() => {
            leaveAndClean();
            router.replace("/");
          }}
        >
          トップに戻る
        </button>
      </main>
    );
  }

  if (phase === null) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        ロールを確認中...
      </main>
    );
  }

  const handlePlayAgain = () => {
    const roomId = session.getRoomId();
    if (roomId) {
      socket.emit("startGame", roomId);
    }
  };

  return (
    <>
      {phase === "question" && <QuestionPage />}
      {phase === "answer" && (
        <AnswerPage key={questionText} question={questionText} />
      )}
      {phase === "result" && (
        <ResultPage
          resultData={result}
          question={questionText}
          onPlayAgain={handlePlayAgain}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
