import { SubscribeMessage, WebSocketGateway, MessageBody, WebSocketServer, ConnectedSocket, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "http://localhost:3000",
  }
})
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, { socketId: string; nickname: string }[]>();
  private roomContexts = new Map<string, string>();
  private roomAdmins = new Map<string, string>();

  @SubscribeMessage("message")
  handleMessage(@MessageBody() body: string) {
    this.server.emit("update", `Hello socket.io ${body}'をクライアントから受け取った'`);
  }

  @SubscribeMessage("enterRoom")
  handleEnterRoom(@MessageBody() body: { roomId: string; nickname: string; context?: string; mode: "create" | "join" }, @ConnectedSocket() client: Socket) {
    const roomExists = this.roomAdmins.has(body.roomId);

    if (body.mode === "create" && roomExists) {
      client.emit("enterRoomError", "このルームは使用中です");
      return;
    }
    if (body.mode === "join" && !roomExists) {
      client.emit("enterRoomError", "ルームが見つかりません");
      return;
    }

    if (body.mode === "create") {
      this.roomAdmins.set(body.roomId, client.id);
      if (body.context) {
        this.roomContexts.set(body.roomId, body.context);
      }
    }

    client.emit("enterRoom", body.roomId);
  }

  @SubscribeMessage("joinRoom")
  handleJoinRoom(@MessageBody() body: { roomId: string; nickname: string }, @ConnectedSocket() client: Socket) {
    client.join(body.roomId);
    const participants = this.rooms.get(body.roomId) ?? [];
    const alreadyJoined = participants.some(p => p.socketId === client.id);
    if (!alreadyJoined) {
      participants.push({ socketId: client.id, nickname: body.nickname });
      this.rooms.set(body.roomId, participants);
    }
    this.server.to(body.roomId).emit("roomUpdate", participants.map(p => p.nickname));

    const ctx = this.roomContexts.get(body.roomId);
    if (ctx) {
      client.emit("roomContext", ctx);
    }

    const isAdmin = this.roomAdmins.get(body.roomId) === client.id;
    client.emit("yourAdmin", isAdmin);
  }

  @SubscribeMessage("leaveRoom")
  handleLeaveRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.leave(roomId);
    const participants = this.rooms.get(roomId) ?? [];
    const updated = participants.filter(p => p.socketId !== client.id);
    if (updated.length === 0) {
      this.rooms.delete(roomId);
      this.roomContexts.delete(roomId);
      this.roomAdmins.delete(roomId);
    } else {
      this.rooms.set(roomId, updated);
      this.server.to(roomId).emit("roomUpdate", updated.map(p => p.nickname));
    }
  }

  handleDisconnect(client: Socket) {
    for (const [roomId, participants] of this.rooms.entries()) {
      const index = participants.findIndex(p => p.socketId === client.id);
      if (index !== -1) {
        participants.splice(index, 1);
        if (participants.length === 0) {
          this.rooms.delete(roomId);
          this.roomContexts.delete(roomId);
          this.roomAdmins.delete(roomId);
        } else {
          this.rooms.set(roomId, participants);
          this.server.to(roomId).emit("roomUpdate", participants.map(p => p.nickname));
        }
        break;
      }
    }
  }
  @SubscribeMessage("startGame")
  handleStartGame(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    if (this.roomAdmins.get(roomId) !== client.id) return;
    const participants = this.rooms.get(roomId);
    if (!participants || participants.length === 0) return;
    const questioner = participants[Math.floor(Math.random() * participants.length)];
  
    this.server.to(questioner.socketId).emit("yourRole", "question");
    this.server.to(roomId).except(questioner.socketId).emit("yourRole", "answer");
    this.server.to(roomId).emit("gameStart");
  }

  @SubscribeMessage("askQuestion")
  handleAskQuestion(@MessageBody() body: { roomId: string; question: string }) {
    this.server.to(body.roomId).emit("question", body.question);
  }

  private votes = new Map<string, { yes: number; no: number; total: number; expected: number }>();

  @SubscribeMessage("submitAnswer")
  handleSubmitAnswer(@MessageBody() body: { roomId: string; answer: "yes" | "no" }, @ConnectedSocket() client: Socket) {
    const participants = this.rooms.get(body.roomId);
    if (!participants) return;
    const expectedAnswers = participants.length;
    if (!this.votes.has(body.roomId)) {
      this.votes.set(body.roomId, { yes: 0, no: 0, total: 0, expected: expectedAnswers });
    }
    const vote = this.votes.get(body.roomId)!;
    if (body.answer === "yes") vote.yes++;
    else vote.no++;
    vote.total++;

    const percent = (vote.yes / vote.total) * 100;
    if (vote.total >= vote.expected) {
      this.server.to(body.roomId).emit("result", { yes: vote.yes, no: vote.no, total: vote.total, percent: percent});
      this.votes.delete(body.roomId);
    }
  }
}
