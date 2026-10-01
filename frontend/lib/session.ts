import { socket } from "./socket";

// sessionStorage のキーを一元管理
const KEYS = {
  playerId: "playerId",
  roomId: "roomId",
  nickname: "nickname",
  role: "role",
  isAdmin: "isAdmin",
  context: "context",
  currentQuestion: "currentQuestion",
  currentQuestionId: "currentQuestionId",
  playerToken: "playerToken",
} as const;

export const session = {
  getPlayerId: () => {
    const existing = sessionStorage.getItem(KEYS.playerId);
    if (existing) return existing;

    const playerId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(KEYS.playerId, playerId);
    return playerId;
  },
  getRoomId: () => sessionStorage.getItem(KEYS.roomId),
  getNickname: () => sessionStorage.getItem(KEYS.nickname),
  getRole: () => sessionStorage.getItem(KEYS.role),
  getIsAdmin: () => sessionStorage.getItem(KEYS.isAdmin) === "true",
  getContext: () => sessionStorage.getItem(KEYS.context) ?? "",
  getCurrentQuestion: () =>
    sessionStorage.getItem(KEYS.currentQuestion) ?? "",
  getCurrentQuestionId: () =>
    sessionStorage.getItem(KEYS.currentQuestionId) ?? "",
  getPlayerToken: () => sessionStorage.getItem(KEYS.playerToken),

  setRoomId: (v: string) => sessionStorage.setItem(KEYS.roomId, v),
  setNickname: (v: string) => sessionStorage.setItem(KEYS.nickname, v),
  setRole: (v: string) => sessionStorage.setItem(KEYS.role, v),
  setIsAdmin: (v: boolean) => sessionStorage.setItem(KEYS.isAdmin, String(v)),
  setContext: (v: string) => sessionStorage.setItem(KEYS.context, v),
  setCurrentQuestion: (v: string) =>
    sessionStorage.setItem(KEYS.currentQuestion, v),
  setCurrentQuestionId: (v: string) =>
    sessionStorage.setItem(KEYS.currentQuestionId, v),
  setPlayerToken: (v: string) => sessionStorage.setItem(KEYS.playerToken, v),

  clearRole: () => sessionStorage.removeItem(KEYS.role),
  clearCurrentQuestion: () => {
    sessionStorage.removeItem(KEYS.currentQuestion);
    sessionStorage.removeItem(KEYS.currentQuestionId);
  },
  clearRoom: () => {
    sessionStorage.removeItem(KEYS.playerId);
    sessionStorage.removeItem(KEYS.roomId);
    sessionStorage.removeItem(KEYS.nickname);
    sessionStorage.removeItem(KEYS.role);
    sessionStorage.removeItem(KEYS.isAdmin);
    sessionStorage.removeItem(KEYS.context);
    sessionStorage.removeItem(KEYS.currentQuestion);
    sessionStorage.removeItem(KEYS.currentQuestionId);
    sessionStorage.removeItem(KEYS.playerToken);
  },
};

/** 現在のソケット接続で、セッション中のルームに再参加する */
export function joinCurrentRoom(): boolean {
  const roomId = session.getRoomId();
  const nickname = session.getNickname();
  const playerToken = session.getPlayerToken();
  if (!roomId || !nickname || !playerToken || !socket.connected) return false;

  socket.emit("joinRoom", {
    roomId,
    nickname,
    playerId: session.getPlayerId(),
    playerToken,
  });
  return true;
}

/** ルームから退出し、セッションをクリアする */
export function leaveAndClean(): void {
  const roomId = session.getRoomId();
  if (roomId) {
    socket.emit("leaveRoom", roomId);
  }
  session.clearRoom();
}
