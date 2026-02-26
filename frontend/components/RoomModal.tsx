"use client";

import { io } from "socket.io-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const socket = io("http://localhost:8000");

type RoomModalProps = {
  id: string;
  title: string;
  submitLabel: string;
  placeholder?: string;
  triggerLabel: string;
  triggerClassName?: string;
};

export default function RoomModal({
  id,
  title,
  submitLabel,
  placeholder = "合言葉",
  triggerLabel,
  triggerClassName = "btn btn-accent mt-5 w-1/2 max-w-xs",
}: RoomModalProps) {
  const [roomId, setRoomId] = useState("");
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleEnterRoom = (receivedRoomId: string) => {
      router.push(`/waiting?roomId=${receivedRoomId}&nickname=${encodeURIComponent(nickname)}`);
    };
  
    socket.on("enterRoom", handleEnterRoom);
  
    return () => {
      socket.off("enterRoom", handleEnterRoom);
    };
  }, [router, nickname]);

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
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
              >
                キャンセル
              </button>
              <button type="submit" className="btn btn-accent"
              onClick={() =>{
                socket.emit("enterRoom", {
                  roomId:  roomId,
                  nickname: nickname
                });
              }}>
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
