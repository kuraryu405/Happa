"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import QuestionPage from "./question";
import AnswerPage from "./answer";
import ResultPage from "./result";

type GamePhase = "question" | "answer" | "result";

function leaveAndClean() {
  const roomId = sessionStorage.getItem("roomId");
  if (roomId) {
    socket.emit("leaveRoom", roomId);
  }
  sessionStorage.removeItem("roomId");
  sessionStorage.removeItem("nickname");
  sessionStorage.removeItem("role");
}

export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase | "error" | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [result, setResult] = useState<{ yes: number; no: number; total: number; percent: number } | null>(null);

  const router = useRouter();

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    if (role === "question" || role === "answer") {
      setPhase(role);
    } else {
      setPhase("error");
    }
  
    const handleQuestion = (q: string) => {
      setQuestionText(q);
      setPhase("answer");
    };
    socket.on("question", handleQuestion);
  
    const handleResult = (data: { yes: number; no: number; total: number; percent: number }) => {
      setResult(data);
      setPhase("result");
    };
    socket.on("result", handleResult);
  
    const handleBeforeUnload = () => leaveAndClean();
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      socket.off("question", handleQuestion);
      socket.off("result", handleResult);  
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  if (phase === "error") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-error font-bold">ゲームに正しく参加できませんでした</p>
        <p className="text-base-content/70">ロール情報が見つかりません。待機画面からやり直してください。</p>
        <button className="btn btn-outline" onClick={() => {
          leaveAndClean();
          router.replace("/");
        }}>
          トップに戻る
        </button>
      </main>
    );
  }

  if (phase === null) {
    return <main className="flex items-center justify-center min-h-screen">ロールを確認中...</main>;
  }

  return (
    <>
      {phase === "question" && <QuestionPage />}
      {phase === "answer" && <AnswerPage initialQuestion={questionText} />}
      {phase === "result" && <ResultPage resultData={result} question={questionText} />}
    </>
  );
}
