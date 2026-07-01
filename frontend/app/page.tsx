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
      {/* <div className="navbar bg-base-100 shadow-sm">
        <a className="text-4xl font-extrabold font-serif tracking-wide italic drop-shadow-lg">
          Happa
        </a>
      </div> */}
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

// "use client";

// import { io } from "socket.io-client";
// import { useEffect} from "react";
// import { useState } from "react";

// const socket = io("http://localhost:8000");

// const Home = () => {
//   const [msgFromServer, setMsgFromServer] = useState("");
//   useEffect(() => {
//     socket.on("update",(message: string) => {
//       console.log(message);
//       setMsgFromServer(message);
//     });

//     return () => {
//       socket.off("update");
//     };
//   }, []);
//   return (
//     <div>
//       <button
//         onClick={() => {
//           socket.emit("message", "message from client");
//         }}
//         className="btn btn-accent"
//       >
//         メッセージを送信
//       </button>
//       <p>Message from server: {msgFromServer}</p>
//     </div>
//   );
// };

// export default Home;
