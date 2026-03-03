"use client";

import { useState, useEffect } from "react";
import QuestionPage from "./question";
import AnswerPage from "./answer";
import ResultPage from "./result";
import { io } from "socket.io-client";

type GamePhase = "question" | "answer" | "result";

const socket = io("http://localhost:8000");

export default function GamePage() {
  const [phase, setPhase] = useState<GamePhase>("answer");


  useEffect(()=> {
    const handleYourRole = (role: GamePhase) => {
      setPhase(role);
    }
    socket.on("yourRole", handleYourRole);
    return () => {
      socket.off("yourRole", handleYourRole);
    };
  }, []);
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
