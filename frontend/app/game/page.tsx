"use client";

import { useState } from "react";
import QuestionPage from "./question";
import AnswerPage from "./answer";
import ResultPage from "./result";

type GamePhase = "question" | "answer" | "result";


export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase>("question");
  return (
    <>
      {phase === "question" && <QuestionPage />}
      {phase === "answer" && <AnswerPage />}
      {phase === "result" && <ResultPage />}
    </>
  );
}
