import { SubscribeMessage, WebSocketGateway, MessageBody,WebSocketServer} from "@nestjs/websockets";
import { Server } from "socket.io";
@WebSocketGateway({
  cors: {
    origin: "http://localhost:3000",
  }
})
export class EvantsGateway{
  @WebSocketServer()
  server: Server;

  @SubscribeMessage("message")
  handleMessage(@MessageBody() body:string){
    this.server.emit("update", `Hello socket.io ${body}'をクライアントから受け取った'`);

  }
  
  // 部屋に入れる処理
  @SubscribeMessage("enterRoom")
  handleEnterRoom(@MessageBody() body: { roomId: string; nickname: string }) {
    this.server.emit("enterRoom", body.roomId);  
  }
}

