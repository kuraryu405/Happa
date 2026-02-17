"use client";

import RoomModal from "@/components/RoomModal";

export default function Home() {
  return (
    <>
      {/* <div className="navbar bg-base-100 shadow-sm">
        <a className="text-4xl font-extrabold font-serif tracking-wide italic drop-shadow-lg">
          Happa
        </a>
      </div> */}
      <img src="/Happalogo.png" alt="logo" className="pt-20 p-2" />

      <div className="flex flex-col items-center justify-center">
        <RoomModal
          id="create_room_modal"
          title="ルームを作成"
          submitLabel="作成"
          triggerLabel="ルームを作成"
        />
        <RoomModal
          id="join_room_modal"
          title="ルームに入室"
          submitLabel="入室"
          triggerLabel="ルームに入室"
        />
      </div>
    </>
  );
}