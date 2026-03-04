"use client";

import { useState } from "react";
import { socket } from "@/lib/socket";

export default function QuestionPage() {
  const [question, setQuestion] = useState("");

  const handleSubmit = () => {
    if (!question.trim()) return;
    const roomId = sessionStorage.getItem("roomId");
    socket.emit("askQuestion", { roomId, question });
  };

  return (
    <>
      <div className="mx-auto w-full h-auto pt-16 p-4 flex flex-col gap-2">
        <textarea
          className="textarea textarea-accent textarea-lg w-full border border-base-300"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="質問を入力してください"
        />
        <div className="w-full h-auto flex justify-end gap-2">
        <button
          className="btn btn-accent"
          onClick={async () => {
            setQuestion('AIで質問を生成中（10秒ほどかかります。）')
            //ここのlocalhostは後でenvに書く
            const response = await fetch("http://localhost:8000/question", {
              method: "POST",
            });
            const data = await response.json();
            //textareaに表示
            setQuestion(data.question);
          }}
        >
          AIで生成
        </button>
          <button className="btn btn-accent" onClick={handleSubmit}>
            質問する！
          </button>
        </div>
      </div>
    </>
  );
}
