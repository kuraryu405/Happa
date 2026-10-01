import { randomUUID } from 'crypto';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { corsOrigin } from '../config/cors-origins';

type Participant = {
  playerId: string;
  playerToken: string;
  socketId: string;
  nickname: string;
  connected: boolean;
};

type RoundState = {
  questionerPlayerId: string;
  participantIds: Set<string>;
};

type QuestionState = {
  questionId: string;
  text: string;
  eligibleVoterIds: Set<string>;
};

type VoteState = {
  yes: number;
  no: number;
  total: number;
  voterIds: Set<string>;
  eligibleVoterIds: Set<string>;
};

type ResultPayload = {
  yes: number;
  no: number;
  total: number;
  percent: number;
  questionId: string;
};

type CompletedRoundState = {
  participantIds: Set<string>;
  question: QuestionState;
  result: ResultPayload;
};

type SocketSessionData = {
  roomId?: string;
  playerId?: string;
  playerToken?: string;
  nickname?: string;
};

type StartGameBody = {
  roomId: string;
  playerId?: string;
  playerToken?: string;
};

const INVALID_INPUT_MESSAGE = '入力が不正です';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

@WebSocketGateway({
  cors: {
    origin: corsOrigin,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
})
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, Participant[]>();
  private roomContexts = new Map<string, string>();
  private roomAdmins = new Map<string, string>();
  private currentQuestions = new Map<string, QuestionState>();
  private activeRounds = new Map<string, RoundState>();
  private completedRounds = new Map<string, CompletedRoundState>();
  private roomCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private participantCleanupTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly roomCleanupDelayMs = 2 * 60 * 1000;

  private votes = new Map<string, VoteState>();

  @SubscribeMessage('message')
  handleMessage(@MessageBody() body: string) {
    this.server.emit(
      'update',
      `Hello socket.io ${body}'をクライアントから受け取った'`,
    );
  }

  @SubscribeMessage('enterRoom')
  handleEnterRoom(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    if (
      !isRecord(body) ||
      !isString(body.roomId) ||
      !isString(body.nickname) ||
      !isOptionalString(body.playerId) ||
      !isOptionalString(body.context) ||
      (body.mode !== 'create' && body.mode !== 'join')
    ) {
      client.emit('enterRoomError', INVALID_INPUT_MESSAGE);
      return;
    }

    const roomId = body.roomId.trim();
    const nickname = body.nickname.trim();
    const playerId = body.playerId?.trim() || client.id;
    const context = body.context?.trim() ?? '';
    if (!roomId || !nickname || !playerId) {
      client.emit('enterRoomError', 'ニックネームと合言葉を入力してください');
      return;
    }

    const roomExists = this.roomAdmins.has(roomId);
    const socketSession = this.getSocketSession(client);
    if (
      roomExists &&
      socketSession.roomId === roomId &&
      socketSession.playerId === playerId &&
      socketSession.playerToken
    ) {
      client.emit('enterRoom', {
        roomId,
        playerToken: socketSession.playerToken,
      });
      return;
    }
    if (body.mode === 'create' && roomExists) {
      client.emit('enterRoomError', 'このルームは使用中です');
      return;
    }
    if (body.mode === 'join' && !roomExists) {
      client.emit('enterRoomError', 'ルームが見つかりません');
      return;
    }

    const playerToken = randomUUID();
    if (body.mode === 'create') {
      this.roomAdmins.set(roomId, playerId);
      this.roomContexts.set(roomId, context);
    }

    const participant = this.upsertParticipant(
      roomId,
      playerId,
      playerToken,
      nickname,
      client,
    );
    if (!participant) {
      this.clearSocketSession(socketSession);
      if (body.mode === 'create') {
        this.clearRoom(roomId);
      }
      client.emit('enterRoomError', '参加者情報を登録できませんでした');
      return;
    }
    client.emit('enterRoom', { roomId, playerToken });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    if (
      !isRecord(body) ||
      !isString(body.roomId) ||
      !isString(body.nickname) ||
      !isString(body.playerId) ||
      !isString(body.playerToken)
    ) {
      client.emit('enterRoomError', INVALID_INPUT_MESSAGE);
      return;
    }

    const roomId = body.roomId.trim();
    const nickname = body.nickname.trim();
    const playerId = body.playerId.trim();
    const playerToken = body.playerToken.trim();
    if (!roomId || !nickname || !playerId || !playerToken) {
      client.emit('enterRoomError', INVALID_INPUT_MESSAGE);
      return;
    }
    if (!this.roomAdmins.has(roomId)) {
      client.emit('enterRoomError', 'ルームが見つかりません');
      return;
    }

    const participants = this.rooms.get(roomId) ?? [];
    const existingParticipant = participants.find(
      (participant) => participant.playerId === playerId,
    );
    const socketSession = this.getSocketSession(client);
    if (
      existingParticipant &&
      existingParticipant.playerToken !== playerToken
    ) {
      client.emit('enterRoomError', '参加者情報が確認できません');
      return;
    }
    if (
      existingParticipant?.connected &&
      existingParticipant.socketId !== client.id &&
      this.server.sockets.sockets.get(existingParticipant.socketId)?.connected
    ) {
      client.emit('enterRoomError', 'この参加情報は別のタブで使用中です');
      return;
    }
    if (
      !existingParticipant &&
      (socketSession.roomId !== roomId ||
        socketSession.playerId !== playerId ||
        socketSession.playerToken !== playerToken)
    ) {
      client.emit('enterRoomError', '入室手順が正しくありません');
      return;
    }

    const participant = this.upsertParticipant(
      roomId,
      playerId,
      playerToken,
      nickname,
      client,
    );
    if (!participant) {
      client.emit('enterRoomError', 'ルームが見つかりません');
      return;
    }

    const ctx = this.roomContexts.get(roomId);
    if (ctx !== undefined) {
      client.emit('roomContext', ctx);
    }

    const isAdmin = this.roomAdmins.get(roomId) === playerId;
    client.emit('yourAdmin', isAdmin);

    const round = this.activeRounds.get(roomId);
    if (round?.participantIds.has(playerId)) {
      const role =
        round.questionerPlayerId === playerId ? 'question' : 'answer';
      client.emit('yourRole', role);
      client.emit('gameStart');

      const currentQuestion = this.currentQuestions.get(roomId);
      if (currentQuestion) {
        client.emit('question', {
          questionId: currentQuestion.questionId,
          text: currentQuestion.text,
        });
      }
      return;
    }

    const completedRound = this.completedRounds.get(roomId);
    if (completedRound?.participantIds.has(playerId)) {
      client.emit('question', {
        questionId: completedRound.question.questionId,
        text: completedRound.question.text,
      });
      client.emit('result', completedRound.result);
    }
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isString(body)) return;
    const roomId = body.trim();
    if (!roomId) return;

    void client.leave(roomId);
    const participants = this.rooms.get(roomId) ?? [];
    const socketSession = this.getSocketSession(client);
    const leavingParticipant = participants.find(
      (participant) => participant.socketId === client.id,
    );

    if (!leavingParticipant) {
      if (participants.length === 0 && socketSession.roomId === roomId) {
        this.clearRoom(roomId);
      }
      if (socketSession.roomId === roomId) {
        this.clearSocketSession(socketSession);
      }
      return;
    }

    this.removeParticipant(roomId, leavingParticipant.playerId);
    if (socketSession.roomId === roomId) {
      this.clearSocketSession(socketSession);
    }
  }

  handleDisconnect(client: Socket) {
    let markedDisconnected = false;

    for (const [roomId, participants] of this.rooms.entries()) {
      for (const participant of participants) {
        if (!participant.connected || participant.socketId !== client.id) {
          continue;
        }

        participant.connected = false;
        markedDisconnected = true;
        this.scheduleParticipantCleanup(roomId, participant.playerId);
        this.ensureAdmin(roomId, participants);

        this.emitResultIfReady(roomId);
      }

      if (
        participants.length > 0 &&
        participants.every((participant) => !participant.connected)
      ) {
        this.scheduleRoomCleanup(roomId);
      }
    }

    const roomId = this.getSocketSession(client).roomId;
    if (!markedDisconnected && roomId && !this.rooms.has(roomId)) {
      this.scheduleRoomCleanup(roomId);
    }
  }

  @SubscribeMessage('startGame')
  handleStartGame(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    let command: StartGameBody;
    if (isString(body)) {
      command = { roomId: body };
    } else if (
      isRecord(body) &&
      isString(body.roomId) &&
      isOptionalString(body.playerId) &&
      isOptionalString(body.playerToken)
    ) {
      command = {
        roomId: body.roomId,
        playerId: body.playerId,
        playerToken: body.playerToken,
      };
    } else {
      return;
    }

    const roomId = command.roomId.trim();
    if (!roomId) return;

    const participant = this.getParticipant(
      roomId,
      command.playerId,
      command.playerToken,
      client,
    );
    if (!participant || this.roomAdmins.get(roomId) !== participant.playerId) {
      return;
    }
    if (this.activeRounds.has(roomId)) return;

    this.startRound(roomId);
  }

  @SubscribeMessage('askQuestion')
  handleAskQuestion(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    if (
      !isRecord(body) ||
      !isString(body.roomId) ||
      !isString(body.question) ||
      !isOptionalString(body.playerId) ||
      !isOptionalString(body.playerToken)
    ) {
      return;
    }

    const roomId = body.roomId.trim();
    const question = body.question.trim();
    if (!roomId || !question) return;
    if (this.currentQuestions.has(roomId)) return;

    const participant = this.getParticipant(
      roomId,
      body.playerId,
      body.playerToken,
      client,
    );
    const round = this.activeRounds.get(roomId);
    if (
      !participant ||
      !round ||
      !round.participantIds.has(participant.playerId) ||
      round.questionerPlayerId !== participant.playerId
    ) {
      return;
    }

    const currentQuestion: QuestionState = {
      questionId: randomUUID(),
      text: question,
      eligibleVoterIds: new Set(
        [...round.participantIds].filter((playerId) =>
          this.rooms
            .get(roomId)
            ?.some(
              (participant) =>
                participant.playerId === playerId && participant.connected,
            ),
        ),
      ),
    };
    this.currentQuestions.set(roomId, currentQuestion);
    this.votes.delete(roomId);
    this.emitToRound(roomId, round, 'question', {
      questionId: currentQuestion.questionId,
      text: currentQuestion.text,
    });
  }

  @SubscribeMessage('submitAnswer')
  handleSubmitAnswer(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    if (
      !isRecord(body) ||
      !isString(body.roomId) ||
      !isString(body.answer) ||
      !isString(body.questionId) ||
      !isOptionalString(body.playerId) ||
      !isOptionalString(body.playerToken) ||
      (body.answer !== 'yes' && body.answer !== 'no')
    ) {
      return;
    }

    const roomId = body.roomId.trim();
    const questionId = body.questionId.trim();
    if (!roomId || !questionId) return;

    const participant = this.getParticipant(
      roomId,
      body.playerId,
      body.playerToken,
      client,
    );
    const round = this.activeRounds.get(roomId);
    const currentQuestion = this.currentQuestions.get(roomId);
    if (
      !participant ||
      !round ||
      !round.participantIds.has(participant.playerId) ||
      !currentQuestion ||
      currentQuestion.questionId !== questionId
    ) {
      return;
    }

    let vote = this.votes.get(roomId);
    if (!vote) {
      vote = {
        yes: 0,
        no: 0,
        total: 0,
        voterIds: new Set(),
        eligibleVoterIds: new Set(currentQuestion.eligibleVoterIds),
      };
      this.votes.set(roomId, vote);
    }

    if (
      !vote.eligibleVoterIds.has(participant.playerId) ||
      vote.voterIds.has(participant.playerId)
    ) {
      return;
    }

    vote.voterIds.add(participant.playerId);
    if (body.answer === 'yes') vote.yes++;
    else vote.no++;
    vote.total++;

    this.emitResultIfReady(roomId);
  }

  canGenerateQuestion(
    roomId: string,
    playerId: string,
    playerToken: string,
  ): boolean {
    const normalizedRoomId = roomId.trim();
    const normalizedPlayerId = playerId.trim();
    const normalizedPlayerToken = playerToken.trim();
    if (!normalizedRoomId || !normalizedPlayerId || !normalizedPlayerToken) {
      return false;
    }

    const participant = this.rooms
      .get(normalizedRoomId)
      ?.find(
        (currentParticipant) =>
          currentParticipant.playerId === normalizedPlayerId &&
          currentParticipant.playerToken === normalizedPlayerToken &&
          currentParticipant.connected,
      );
    const round = this.activeRounds.get(normalizedRoomId);
    return Boolean(
      participant &&
      round?.participantIds.has(normalizedPlayerId) &&
      round.questionerPlayerId === normalizedPlayerId &&
      !this.currentQuestions.has(normalizedRoomId),
    );
  }

  private getParticipant(
    roomId: string,
    playerId: string | undefined,
    playerToken: string | undefined,
    client: Socket,
  ): Participant | undefined {
    const socketSession = this.getSocketSession(client);
    const resolvedPlayerId = playerId ?? socketSession.playerId;
    const resolvedPlayerToken = playerToken ?? socketSession.playerToken;
    if (
      !resolvedPlayerId ||
      !resolvedPlayerToken ||
      socketSession.roomId !== roomId ||
      socketSession.playerId !== resolvedPlayerId ||
      socketSession.playerToken !== resolvedPlayerToken
    ) {
      return undefined;
    }

    return this.rooms
      .get(roomId)
      ?.find(
        (participant) =>
          participant.playerId === resolvedPlayerId &&
          participant.playerToken === resolvedPlayerToken &&
          participant.socketId === client.id &&
          participant.connected,
      );
  }

  private upsertParticipant(
    roomId: string,
    playerId: string,
    playerToken: string,
    nickname: string,
    client: Socket,
  ): Participant | undefined {
    if (!this.roomAdmins.has(roomId)) return undefined;

    const participants = this.rooms.get(roomId) ?? [];
    const existingParticipant = participants.find(
      (participant) => participant.playerId === playerId,
    );
    if (
      existingParticipant &&
      existingParticipant.playerToken !== playerToken
    ) {
      return undefined;
    }

    let participant: Participant;
    if (existingParticipant) {
      const oldSocket = this.server.sockets.sockets.get(
        existingParticipant.socketId,
      );
      if (oldSocket && oldSocket.id !== client.id) {
        void oldSocket.leave(roomId);
      }
      existingParticipant.socketId = client.id;
      existingParticipant.nickname = nickname;
      existingParticipant.connected = true;
      participant = existingParticipant;
    } else {
      participant = {
        playerId,
        playerToken,
        socketId: client.id,
        nickname,
        connected: true,
      };
      participants.push(participant);
    }

    this.cancelRoomCleanup(roomId);
    this.cancelParticipantCleanup(roomId, playerId);
    void client.join(roomId);
    const socketSession = this.getSocketSession(client);
    socketSession.roomId = roomId;
    socketSession.playerId = playerId;
    socketSession.playerToken = playerToken;
    socketSession.nickname = nickname;
    this.rooms.set(roomId, participants);
    this.ensureAdmin(roomId, participants);

    const round = this.activeRounds.get(roomId);
    const currentQuestion = this.currentQuestions.get(roomId);
    if (round?.participantIds.has(playerId) && currentQuestion) {
      currentQuestion.eligibleVoterIds.add(playerId);
      this.votes.get(roomId)?.eligibleVoterIds.add(playerId);
      this.emitResultIfReady(roomId);
    }

    this.server.to(roomId).emit(
      'roomUpdate',
      participants.map((currentParticipant) => currentParticipant.nickname),
    );
    return participant;
  }

  private startRound(roomId: string) {
    const participants = (this.rooms.get(roomId) ?? []).filter(
      (participant) => participant.connected,
    );
    if (participants.length === 0) {
      this.activeRounds.delete(roomId);
      this.currentQuestions.delete(roomId);
      this.votes.delete(roomId);
      return;
    }

    this.currentQuestions.delete(roomId);
    this.votes.delete(roomId);
    this.completedRounds.delete(roomId);
    const questioner =
      participants[Math.floor(Math.random() * participants.length)];
    const round: RoundState = {
      questionerPlayerId: questioner.playerId,
      participantIds: new Set(
        participants.map((participant) => participant.playerId),
      ),
    };
    this.activeRounds.set(roomId, round);

    this.emitToRound(roomId, round, 'yourRole', (participant: Participant) =>
      participant.playerId === round.questionerPlayerId ? 'question' : 'answer',
    );
    this.emitToRound(roomId, round, 'gameStart');
  }

  private emitToRound(
    roomId: string,
    round: RoundState,
    event: string,
    ...args: unknown[]
  ) {
    const participants = this.rooms.get(roomId) ?? [];
    for (const participant of participants) {
      if (
        participant.connected &&
        round.participantIds.has(participant.playerId)
      ) {
        const eventArgs =
          args.length === 1 && typeof args[0] === 'function'
            ? [
                (args[0] as (currentParticipant: Participant) => unknown)(
                  participant,
                ),
              ]
            : args;
        this.server.to(participant.socketId).emit(event, ...eventArgs);
      }
    }
  }

  private emitResultIfReady(roomId: string) {
    const vote = this.votes.get(roomId);
    const round = this.activeRounds.get(roomId);
    const question = this.currentQuestions.get(roomId);
    if (!vote || !round || !question) return;
    const hasConnectedParticipant = (this.rooms.get(roomId) ?? []).some(
      (participant) =>
        participant.connected && round.participantIds.has(participant.playerId),
    );
    if (!hasConnectedParticipant) return;
    if (
      vote.eligibleVoterIds.size === 0 ||
      vote.total < vote.eligibleVoterIds.size
    ) {
      return;
    }

    const result: ResultPayload = {
      yes: vote.yes,
      no: vote.no,
      total: vote.total,
      percent: (vote.yes / vote.total) * 100,
      questionId: question.questionId,
    };
    this.completedRounds.set(roomId, {
      participantIds: new Set(round.participantIds),
      question,
      result,
    });
    this.emitToRound(roomId, round, 'result', result);
    this.votes.delete(roomId);
    this.currentQuestions.delete(roomId);
    this.activeRounds.delete(roomId);
  }

  private removeParticipant(roomId: string, playerId: string) {
    const participants = this.rooms.get(roomId);
    if (!participants) return;

    const leavingParticipant = participants.find(
      (participant) => participant.playerId === playerId,
    );
    if (!leavingParticipant) return;

    this.cancelParticipantCleanup(roomId, playerId);
    const round = this.activeRounds.get(roomId);
    const wasQuestioner = round?.questionerPlayerId === playerId;
    round?.participantIds.delete(playerId);
    this.completedRounds.get(roomId)?.participantIds.delete(playerId);
    this.currentQuestions.get(roomId)?.eligibleVoterIds.delete(playerId);
    this.votes.get(roomId)?.eligibleVoterIds.delete(playerId);

    const updated = participants.filter(
      (participant) => participant.playerId !== playerId,
    );
    if (updated.length === 0) {
      this.clearRoom(roomId);
      return;
    }

    this.rooms.set(roomId, updated);
    if (this.roomAdmins.get(roomId) === playerId) {
      const replacement = updated.find((participant) => participant.connected);
      if (replacement) {
        this.roomAdmins.set(roomId, replacement.playerId);
        this.emitAdminStatuses(roomId, updated);
      }
    }
    this.server.to(roomId).emit(
      'roomUpdate',
      updated.map((participant) => participant.nickname),
    );

    if (wasQuestioner) {
      this.currentQuestions.delete(roomId);
      this.votes.delete(roomId);
      this.activeRounds.delete(roomId);
      this.startRound(roomId);
    } else {
      this.emitResultIfReady(roomId);
    }

    if (updated.every((participant) => !participant.connected)) {
      this.scheduleRoomCleanup(roomId);
    }
  }

  private ensureAdmin(roomId: string, participants: Participant[]) {
    const adminPlayerId = this.roomAdmins.get(roomId);
    const currentAdmin = participants.find(
      (participant) =>
        participant.playerId === adminPlayerId && participant.connected,
    );
    if (currentAdmin) return;

    const replacement = participants.find(
      (participant) => participant.connected,
    );
    if (!replacement || replacement.playerId === adminPlayerId) return;

    this.roomAdmins.set(roomId, replacement.playerId);
    this.emitAdminStatuses(roomId, participants);
  }

  private emitAdminStatuses(roomId: string, participants: Participant[]) {
    const adminPlayerId = this.roomAdmins.get(roomId);
    for (const participant of participants) {
      if (participant.connected) {
        this.server
          .to(participant.socketId)
          .emit('yourAdmin', participant.playerId === adminPlayerId);
      }
    }
  }

  private scheduleParticipantCleanup(roomId: string, playerId: string) {
    this.cancelParticipantCleanup(roomId, playerId);
    const timer = setTimeout(() => {
      const participant = this.rooms
        .get(roomId)
        ?.find(
          (currentParticipant) => currentParticipant.playerId === playerId,
        );
      if (participant && !participant.connected) {
        this.removeParticipant(roomId, playerId);
      }
    }, this.roomCleanupDelayMs);
    timer.unref?.();
    this.participantCleanupTimers.set(
      this.getParticipantTimerKey(roomId, playerId),
      timer,
    );
  }

  private cancelParticipantCleanup(roomId: string, playerId: string) {
    const key = this.getParticipantTimerKey(roomId, playerId);
    const timer = this.participantCleanupTimers.get(key);
    if (!timer) return;
    clearTimeout(timer);
    this.participantCleanupTimers.delete(key);
  }

  private scheduleRoomCleanup(roomId: string) {
    this.cancelRoomCleanup(roomId);
    const timer = setTimeout(() => {
      const participants = this.rooms.get(roomId);
      if (
        !participants ||
        participants.every((participant) => !participant.connected)
      ) {
        this.clearRoom(roomId);
      }
    }, this.roomCleanupDelayMs);
    timer.unref?.();
    this.roomCleanupTimers.set(roomId, timer);
  }

  private cancelRoomCleanup(roomId: string) {
    const timer = this.roomCleanupTimers.get(roomId);
    if (!timer) return;
    clearTimeout(timer);
    this.roomCleanupTimers.delete(roomId);
  }

  private clearRoom(roomId: string) {
    this.cancelRoomCleanup(roomId);
    for (const participant of this.rooms.get(roomId) ?? []) {
      this.cancelParticipantCleanup(roomId, participant.playerId);
    }
    this.rooms.delete(roomId);
    this.roomContexts.delete(roomId);
    this.roomAdmins.delete(roomId);
    this.currentQuestions.delete(roomId);
    this.activeRounds.delete(roomId);
    this.completedRounds.delete(roomId);
    this.votes.delete(roomId);
  }

  private getParticipantTimerKey(roomId: string, playerId: string) {
    return `${roomId}\u0000${playerId}`;
  }

  private clearSocketSession(socketSession: SocketSessionData) {
    delete socketSession.roomId;
    delete socketSession.playerId;
    delete socketSession.playerToken;
    delete socketSession.nickname;
  }

  private getSocketSession(client: Socket): SocketSessionData {
    return client.data as SocketSessionData;
  }
}
