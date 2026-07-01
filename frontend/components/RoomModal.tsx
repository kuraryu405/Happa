"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { session } from "@/lib/session";

type RoomModalProps = {
  id: string;
  title: string;
  submitLabel: string;
  placeholder?: string;
  triggerLabel: string;
  triggerClassName?: string;
  mode: "create" | "join";
};

export default function RoomModal({
  id,
  title,
  submitLabel,
  placeholder = "合言葉",
  triggerLabel,
  triggerClassName = "btn btn-accent mt-5 w-1/2 max-w-xs",
  mode,
}: RoomModalProps) {
  const [roomId, setRoomId] = useState("");
  const [nickname, setNickname] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // 同一の socket を複数の RoomModal (作成用・入室用) が共有しており、
  // "enterRoom" イベントは全てのリスナーに届く。
  // 自分が送信したリクエストの応答だけを処理するためのフラグ
  const pendingRef = useRef(false);

  useEffect(() => {
    const handleEnterRoom = () => {
      if (!pendingRef.current) return; // 他の RoomModal が送信した応答は無視
      pendingRef.current = false;
      session.setRoomId(roomId);
      session.setNickname(nickname);
      if (mode === "create") {
        session.setContext(context);
      }
      router.push("/waiting");
    };
    const handleEnterRoomError = (message: string) => {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      setError(message);
    };

    socket.on("enterRoom", handleEnterRoom);
    socket.on("enterRoomError", handleEnterRoomError);

    return () => {
      socket.off("enterRoom", handleEnterRoom);
      socket.off("enterRoomError", handleEnterRoomError);
    };
  }, [router, roomId, nickname, context, mode]);

  const openModal = () =>
    (document.getElementById(id) as HTMLDialogElement)?.showModal();
  const closeModal = () =>
    (document.getElementById(id) as HTMLDialogElement)?.close();

  return (
    <>
      <button className={triggerClassName} onClick={openModal}>
        {triggerLabel}
      </button>
      <dialog id={id} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="py-2">ニックネームと合言葉を入力してください</p>
          {error && <p className="text-error text-sm">{error}</p>}
          <form method="dialog" className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="ニックネーム"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input input-bordered w-full"
            />
            <input
              type="text"
              placeholder={placeholder}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="input input-bordered w-full"
            />
            {mode === "create" && (
              <textarea
                placeholder="場の情報（例：大学のサークル飲み会）"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="textarea textarea-bordered w-full"
                rows={2}
              />
            )}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  setError("");
                  pendingRef.current = true;
                  socket.emit("enterRoom", {
                    roomId,
                    nickname,
                    context,
                    mode,
                  });
                }}
              >
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
