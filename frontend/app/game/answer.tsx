"use client";

import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";

type AnswerPageProps = {
  initialQuestion?: string;
};

export default function AnswerPage({ initialQuestion = "" }: AnswerPageProps) {
  const [question, setQuestion] = useState<string>(initialQuestion);

  useEffect(() => {
    const handleQuestion = (q: string) => {
      setQuestion(q);
    };
    socket.on("question", handleQuestion);
    return () => {
      socket.off("question", handleQuestion);
    };
  }, []);

  return (
    <>
      <main className="flex flex-col items-center w-auto h-auto pt-16 p-8">
        <div className="chat chat-start">
          <div className="chat-bubble text-2xl px-8 py-6">
            {question || "質問を待っています..."}
          </div>
        </div>
        {question && (
          <div className="flex items-center gap-8 pt-20">
            <button className="btn btn-outline text-2xl px-10 py-5 min-w-[120px]">NO</button>
            <button className="btn btn-accent text-2xl px-10 py-5 min-w-[120px]">YES</button>
          </div>
        )}
      </main>
    </>
  );
}
