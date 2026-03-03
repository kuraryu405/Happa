import { SubscribeMessage, WebSocketGateway, MessageBody, WebSocketServer, ConnectedSocket, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "http://localhost:3000",
  }
})
export class EvantsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, { socketId: string; nickname: string }[]>();

  @SubscribeMessage("message")
  handleMessage(@MessageBody() body: string) {
    this.server.emit("update", `Hello socket.io ${body}'をクライアントから受け取った'`);
  }

  @SubscribeMessage("enterRoom")
  handleEnterRoom(@MessageBody() body: { roomId: string; nickname: string }, @ConnectedSocket() client: Socket) {
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
  }

  @SubscribeMessage("leaveRoom")
  handleLeaveRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.leave(roomId);
    const participants = this.rooms.get(roomId) ?? [];
    const updated = participants.filter(p => p.socketId !== client.id);
    if (updated.length === 0) {
      this.rooms.delete(roomId);
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
        } else {
          this.rooms.set(roomId, participants);
          this.server.to(roomId).emit("roomUpdate", participants.map(p => p.nickname));
        }
        break;
      }
    }
  }
  @SubscribeMessage("startGame")
  handleStartGame(@MessageBody() roomId: string) {
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
}
