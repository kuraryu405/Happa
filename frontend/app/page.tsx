"use client";

import { useEffect } from "react";
import { leaveAndClean } from "@/lib/session";
import RoomModal from "@/components/RoomModal";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  useEffect(() => {
    leaveAndClean();
  }, []);

  return (
    <>
      <img src={`${basePath}/Happalogo.png`} alt="logo" className="pt-20 p-2" />

      <div className="flex flex-col items-center justify-center">
        <RoomModal
          title="ルームを作成"
          submitLabel="作成"
          triggerLabel="ルームを作成"
          mode="create"
        />
        <RoomModal
          title="ルームに入室"
          submitLabel="入室"
          triggerLabel="ルームに入室"
          mode="join"
        />
      </div>
    </>
  );
}
