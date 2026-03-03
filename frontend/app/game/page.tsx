"use client";

import { useState, useEffect } from "react";
import QuestionPage from "./question";
import AnswerPage from "./answer";
import ResultPage from "./result";
// import { io } from "socket.io-client";

type GamePhase = "question" | "answer" | "result";


export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase>("answer");
  // useEffect(() => {
  //   const handleGamePhase = (phase: GamePhase) => {
  //     setPhase(phase);
  //   };
  //   socket.on("gamePhase", handleGamePhase);
  //   return () => {
  //     socket.off("gamePhase", handleGamePhase);
  //   };
  // }, []);
  return (
    <>
      {phase === "question" && <QuestionPage />}
      {phase === "answer" && <AnswerPage />}
      {phase === "result" && <ResultPage />}
    </>
  );
}
