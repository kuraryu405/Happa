"use client";

import { useState, useEffect } from "react";
import QuestionPage from "./question";
import AnswerPage from "./answer";
import ResultPage from "./result";
import { socket } from "@/lib/socket";

type GamePhase = "question" | "answer" | "result";

export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase>("answer");

  useEffect(() => {
    const handleYourRole = (role: GamePhase) => {
      setPhase(role);
    };
    socket.on("yourRole", handleYourRole);
    return () => {
      socket.off("yourRole", handleYourRole);
    };
  }, []);

  return (
    <>
      {phase === "question" && <QuestionPage />}
      {phase === "answer" && <AnswerPage />}
      {phase === "result" && <ResultPage />}
    </>
  );
}
