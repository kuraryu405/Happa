"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { joinCurrentRoom, session, leaveAndClean } from "@/lib/session";
import type { QuestionData, ResultData } from "@/lib/types";
import QuestionPage from "./question";
import AnswerPage from "./answer";
import ResultPage from "./result";
import { useIsHydrated } from "@/lib/use-is-hydrated";

type GamePhase = "question" | "answer" | "result";

export default function GamePage() {
  const [phaseOverride, setPhase] = useState<GamePhase | "error">();
  const [questionTextOverride, setQuestionText] = useState<string>();
  const [questionIdOverride, setQuestionId] = useState<string>();
  const [result, setResult] = useState<ResultData | null>(null);
  const [isAdminOverride, setIsAdmin] = useState<boolean>();
  const isHydrated = useIsHydrated();
  const storedRole = isHydrated ? session.getRole() : null;
  const storedQuestionId = isHydrated
    ? session.getCurrentQuestionId()
    : "";
  const phase =
    phaseOverride ??
    (!isHydrated
      ? null
      : storedRole === "question" || storedRole === "answer"
        ? storedQuestionId
          ? "answer"
          : storedRole
        : "error");
  const questionText =
    questionTextOverride ??
    (isHydrated ? session.getCurrentQuestion() : "");
  const questionId = questionIdOverride ?? storedQuestionId;
  const isAdmin =
    isAdminOverride ?? (isHydrated ? session.getIsAdmin() : false);

  const router = useRouter();

  useEffect(() => {
    const handleYourRole = (newRole: string) => {
      session.setRole(newRole);
      session.clearCurrentQuestion();
      setResult(null);
      setQuestionText("");
      setQuestionId("");
      if (newRole === "question" || newRole === "answer") {
        setPhase(newRole);
      }
    };
    socket.on("yourRole", handleYourRole);

    const handleQuestion = (q: QuestionData) => {
      if (!q?.questionId || !q.text) return;
      session.setCurrentQuestion(q.text);
      session.setCurrentQuestionId(q.questionId);
      setQuestionText(q.text);
      setQuestionId(q.questionId);
      setPhase("answer");
    };
    socket.on("question", handleQuestion);

    const handleResult = (data: ResultData) => {
      session.clearCurrentQuestion();
      setQuestionId("");
      setResult(data);
      setPhase("result");
    };
    socket.on("result", handleResult);

    const handleYourAdmin = (admin: boolean) => {
      session.setIsAdmin(admin);
      setIsAdmin(admin);
    };
    socket.on("yourAdmin", handleYourAdmin);

    const handleEnterRoomError = () => {
      session.clearRoom();
      router.replace("/");
    };
    socket.on("enterRoomError", handleEnterRoomError);

    const handleSocketConnect = () => {
      joinCurrentRoom();
    };
    socket.on("connect", handleSocketConnect);

    if (socket.connected) joinCurrentRoom();

    return () => {
      socket.off("yourRole", handleYourRole);
      socket.off("question", handleQuestion);
      socket.off("result", handleResult);
      socket.off("yourAdmin", handleYourAdmin);
      socket.off("enterRoomError", handleEnterRoomError);
      socket.off("connect", handleSocketConnect);
    };
  }, [router]);

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
    const nickname = session.getNickname();
    if (roomId && nickname) {
      socket.emit("startGame", {
        roomId,
        playerId: session.getPlayerId(),
        playerToken: session.getPlayerToken(),
      });
    }
  };

  return (
    <>
      {phase === "question" && <QuestionPage />}
      {phase === "answer" && (
        <AnswerPage
          key={questionId}
          question={questionText}
          questionId={questionId}
        />
      )}
      {phase === "result" && (
        <ResultPage
          resultData={result}
          question={questionText}
          onPlayAgain={handlePlayAgain}
          onLeave={leaveAndClean}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
