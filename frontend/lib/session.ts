import { socket } from "./socket";

// sessionStorage のキーを一元管理
const KEYS = {
  roomId: "roomId",
  nickname: "nickname",
  role: "role",
  isAdmin: "isAdmin",
  context: "context",
} as const;

export const session = {
  getRoomId: () => sessionStorage.getItem(KEYS.roomId),
  getNickname: () => sessionStorage.getItem(KEYS.nickname),
  getRole: () => sessionStorage.getItem(KEYS.role),
  getIsAdmin: () => sessionStorage.getItem(KEYS.isAdmin) === "true",
  getContext: () => sessionStorage.getItem(KEYS.context) ?? "",

  setRoomId: (v: string) => sessionStorage.setItem(KEYS.roomId, v),
  setNickname: (v: string) => sessionStorage.setItem(KEYS.nickname, v),
  setRole: (v: string) => sessionStorage.setItem(KEYS.role, v),
  setIsAdmin: (v: boolean) => sessionStorage.setItem(KEYS.isAdmin, String(v)),
  setContext: (v: string) => sessionStorage.setItem(KEYS.context, v),

  clearRole: () => sessionStorage.removeItem(KEYS.role),
  clearRoom: () => {
    sessionStorage.removeItem(KEYS.roomId);
    sessionStorage.removeItem(KEYS.nickname);
    sessionStorage.removeItem(KEYS.role);
  },
};

/** ルームから退出し、セッションをクリアする */
export function leaveAndClean(): void {
  const roomId = session.getRoomId();
  if (roomId) {
    socket.emit("leaveRoom", roomId);
  }
  session.clearRoom();
}
