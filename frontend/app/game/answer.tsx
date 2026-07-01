"use client";

import { useState } from "react";
import { socket } from "@/lib/socket";
import { session } from "@/lib/session";

type AnswerPageProps = {
  question: string;
};

export default function AnswerPage({ question }: AnswerPageProps) {
  const [answered, setAnswered] = useState(false);

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
            <button
              className="btn btn-outline text-2xl px-10 py-5 min-w-[120px]"
              disabled={answered}
              onClick={() => {
                socket.emit("submitAnswer", {
                  roomId: session.getRoomId(),
                  answer: "no",
                });
                setAnswered(true);
              }}
            >
              NO
            </button>
            <button
              className="btn btn-accent text-2xl px-10 py-5 min-w-[120px]"
              disabled={answered}
              onClick={() => {
                socket.emit("submitAnswer", {
                  roomId: session.getRoomId(),
                  answer: "yes",
                });
                setAnswered(true);
              }}
            >
              YES
            </button>
          </div>
        )}
      </main>
    </>
  );
}
