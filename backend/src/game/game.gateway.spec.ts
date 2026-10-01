import type { Server, Socket } from 'socket.io';
import { EventsGateway } from './game.gateway';

type Emission = {
  target: string;
  event: string;
  args: unknown[];
};

class FakeServer {
  readonly sockets = { sockets: new Map<string, FakeSocket>() };
  readonly emissions: Emission[] = [];

  register(socket: FakeSocket) {
    this.sockets.sockets.set(socket.id, socket);
  }

  to(target: string) {
    return {
      emit: (event: string, ...args: unknown[]) => {
        this.emissions.push({ target, event, args });
      },
    };
  }

  emit(event: string, ...args: unknown[]) {
    this.emissions.push({ target: '*', event, args });
  }
}

class FakeSocket {
  readonly data: Record<string, unknown> = {};
  readonly directEmissions: Emission[] = [];
  connected = true;

  constructor(
    readonly id: string,
    private readonly server: FakeServer,
  ) {
    server.register(this);
  }

  emit(event: string, ...args: unknown[]) {
    this.directEmissions.push({ target: this.id, event, args });
    return true;
  }

  join() {
    return Promise.resolve();
  }

  leave() {
    return Promise.resolve();
  }
}

type Player = {
  socket: FakeSocket;
  playerId: string;
  nickname: string;
  playerToken: string;
};

function asSocket(socket: FakeSocket): Socket {
  return socket as unknown as Socket;
}

function createHarness() {
  const server = new FakeServer();
  const gateway = new EventsGateway();
  gateway.server = server as unknown as Server;
  return { gateway, server };
}

function latestDirectPayload<T>(socket: FakeSocket, event: string): T {
  const emission = [...socket.directEmissions]
    .reverse()
    .find((candidate) => candidate.event === event);
  if (!emission) throw new Error(`Missing ${event} emission`);
  return emission.args[0] as T;
}

function enter(
  gateway: EventsGateway,
  socket: FakeSocket,
  roomId: string,
  playerId: string,
  nickname: string,
  mode: 'create' | 'join',
): Player {
  gateway.handleEnterRoom(
    { roomId, playerId, nickname, mode },
    asSocket(socket),
  );
  const response = latestDirectPayload<{
    roomId: string;
    playerToken: string;
  }>(socket, 'enterRoom');
  return { socket, playerId, nickname, playerToken: response.playerToken };
}

function join(gateway: EventsGateway, roomId: string, player: Player) {
  gateway.handleJoinRoom(
    {
      roomId,
      playerId: player.playerId,
      playerToken: player.playerToken,
      nickname: player.nickname,
    },
    asSocket(player.socket),
  );
}

function start(gateway: EventsGateway, roomId: string, player: Player) {
  gateway.handleStartGame(
    {
      roomId,
      playerId: player.playerId,
      playerToken: player.playerToken,
    },
    asSocket(player.socket),
  );
}

function ask(gateway: EventsGateway, roomId: string, player: Player) {
  gateway.handleAskQuestion(
    {
      roomId,
      question: 'テストの質問ですか？',
      playerId: player.playerId,
      playerToken: player.playerToken,
    },
    asSocket(player.socket),
  );
}

function answer(
  gateway: EventsGateway,
  roomId: string,
  player: Player,
  questionId: string,
  value: 'yes' | 'no',
) {
  gateway.handleSubmitAnswer(
    {
      roomId,
      answer: value,
      questionId,
      playerId: player.playerId,
      playerToken: player.playerToken,
    },
    asSocket(player.socket),
  );
}

function latestEmission(server: FakeServer, event: string): Emission {
  const emission = [...server.emissions]
    .reverse()
    .find((candidate) => candidate.event === event);
  if (!emission) throw new Error(`Missing ${event} emission`);
  return emission;
}

describe('EventsGateway regressions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the room creator as admin when another player joins first', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );

    join(gateway, 'room', guest);
    join(gateway, 'room', creator);

    expect(latestDirectPayload<boolean>(creator.socket, 'yourAdmin')).toBe(
      true,
    );
    expect(latestDirectPayload<boolean>(guest.socket, 'yourAdmin')).toBe(false);

    start(gateway, 'room', creator);

    expect(
      server.emissions.filter((item) => item.event === 'gameStart'),
    ).toHaveLength(2);
  });

  it('returns the same token when an enter request is duplicated', () => {
    const { gateway, server } = createHarness();
    enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guestSocket = new FakeSocket('guest-socket', server);
    const first = enter(gateway, guestSocket, 'room', 'guest', 'Guest', 'join');
    const second = enter(
      gateway,
      guestSocket,
      'room',
      'guest',
      'Guest',
      'join',
    );

    expect(second.playerToken).toBe(first.playerToken);
  });

  it('allows a guest to reconnect after enter succeeds but before join completes', () => {
    const { gateway, server } = createHarness();
    enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );

    guest.socket.connected = false;
    gateway.handleDisconnect(asSocket(guest.socket));
    const reconnectedGuest = {
      ...guest,
      socket: new FakeSocket('guest-reconnected', server),
    };
    join(gateway, 'room', reconnectedGuest);

    expect(
      reconnectedGuest.socket.directEmissions.some(
        (item) => item.event === 'enterRoomError',
      ),
    ).toBe(false);
    expect(
      reconnectedGuest.socket.directEmissions.some(
        (item) => item.event === 'yourAdmin',
      ),
    ).toBe(true);
    expect(
      latestDirectPayload<boolean>(reconnectedGuest.socket, 'yourAdmin'),
    ).toBe(false);
  });

  it('finishes voting after an explicit participant leaves', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );
    const leaver = enter(
      gateway,
      new FakeSocket('leaver-socket', server),
      'room',
      'leaver',
      'Leaver',
      'join',
    );
    join(gateway, 'room', guest);
    join(gateway, 'room', leaver);
    start(gateway, 'room', creator);
    ask(gateway, 'room', creator);
    const question = latestEmission(server, 'question').args[0] as {
      questionId: string;
    };

    answer(gateway, 'room', creator, question.questionId, 'yes');
    gateway.handleLeaveRoom('room', asSocket(leaver.socket));
    expect(server.emissions.some((item) => item.event === 'result')).toBe(
      false,
    );

    answer(gateway, 'room', guest, question.questionId, 'no');
    const result = latestEmission(server, 'result').args[0] as {
      total: number;
    };
    expect(result.total).toBe(2);
  });

  it('transfers admin after an unexpected disconnect', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );
    join(gateway, 'room', guest);

    creator.socket.connected = false;
    gateway.handleDisconnect(asSocket(creator.socket));

    const adminEmission = [...server.emissions]
      .reverse()
      .find(
        (item) => item.target === guest.socket.id && item.event === 'yourAdmin',
      );
    expect(adminEmission?.args[0]).toBe(true);
    start(gateway, 'room', guest);
    expect(
      server.emissions.filter((item) => item.event === 'gameStart'),
    ).toHaveLength(1);
  });

  it('does not add a participant who joins during a live round to its vote', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );
    join(gateway, 'room', guest);
    start(gateway, 'room', creator);
    ask(gateway, 'room', creator);

    const newcomer = enter(
      gateway,
      new FakeSocket('newcomer-socket', server),
      'room',
      'newcomer',
      'Newcomer',
      'join',
    );
    join(gateway, 'room', newcomer);

    expect(
      newcomer.socket.directEmissions.some(
        (item) => item.event === 'gameStart' || item.event === 'question',
      ),
    ).toBe(false);
  });

  it('keeps answers from separate questions isolated by questionId', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );
    join(gateway, 'room', guest);
    start(gateway, 'room', creator);
    ask(gateway, 'room', creator);
    const firstQuestion = latestEmission(server, 'question').args[0] as {
      questionId: string;
    };
    answer(gateway, 'room', creator, firstQuestion.questionId, 'yes');
    answer(gateway, 'room', guest, firstQuestion.questionId, 'no');

    start(gateway, 'room', creator);
    ask(gateway, 'room', creator);
    const secondQuestion = latestEmission(server, 'question').args[0] as {
      questionId: string;
    };
    expect(secondQuestion.questionId).not.toBe(firstQuestion.questionId);

    answer(gateway, 'room', creator, firstQuestion.questionId, 'yes');
    expect(
      server.emissions.filter((item) => item.event === 'result'),
    ).toHaveLength(2);
    answer(gateway, 'room', creator, secondQuestion.questionId, 'yes');
    answer(gateway, 'room', guest, secondQuestion.questionId, 'no');
    expect(
      server.emissions.filter((item) => item.event === 'result'),
    ).toHaveLength(4);
  });

  it('does not finish voting during a reconnect grace period and replays the result', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );
    join(gateway, 'room', guest);
    start(gateway, 'room', creator);
    ask(gateway, 'room', creator);
    const question = server.emissions.find((item) => item.event === 'question')
      ?.args[0] as { questionId: string };

    gateway.handleSubmitAnswer(
      {
        roomId: 'room',
        answer: 'yes',
        questionId: question.questionId,
        playerId: creator.playerId,
        playerToken: creator.playerToken,
      },
      asSocket(creator.socket),
    );
    guest.socket.connected = false;
    gateway.handleDisconnect(asSocket(guest.socket));
    expect(server.emissions.some((item) => item.event === 'result')).toBe(
      false,
    );

    const reconnectedGuest = {
      ...guest,
      socket: new FakeSocket('guest-reconnected', server),
    };
    join(gateway, 'room', reconnectedGuest);
    gateway.handleSubmitAnswer(
      {
        roomId: 'room',
        answer: 'no',
        questionId: question.questionId,
        playerId: guest.playerId,
        playerToken: guest.playerToken,
      },
      asSocket(reconnectedGuest.socket),
    );
    const result = server.emissions.find((item) => item.event === 'result')
      ?.args[0] as { total: number };
    expect(result.total).toBe(2);

    creator.socket.connected = false;
    gateway.handleDisconnect(asSocket(creator.socket));
    const reconnectedCreator = {
      ...creator,
      socket: new FakeSocket('creator-reconnected', server),
    };
    join(gateway, 'room', reconnectedCreator);
    expect(
      reconnectedCreator.socket.directEmissions.some(
        (item) => item.event === 'result',
      ),
    ).toBe(true);
  });

  it('restores a questioner who reconnects before submitting a question', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );
    join(gateway, 'room', guest);
    start(gateway, 'room', creator);

    creator.socket.connected = false;
    gateway.handleDisconnect(asSocket(creator.socket));
    const reconnectedCreator = {
      ...creator,
      socket: new FakeSocket('creator-reconnected', server),
    };
    join(gateway, 'room', reconnectedCreator);

    expect(
      reconnectedCreator.socket.directEmissions.some(
        (item) => item.event === 'yourRole' && item.args[0] === 'question',
      ),
    ).toBe(true);
  });

  it('ignores a duplicate start command while a round is active', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );

    start(gateway, 'room', creator);
    const firstCount = server.emissions.filter(
      (item) => item.event === 'gameStart',
    ).length;
    start(gateway, 'room', creator);

    expect(
      server.emissions.filter((item) => item.event === 'gameStart'),
    ).toHaveLength(firstCount);
  });

  it('rejects a second live socket that reuses another tab session', () => {
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const copiedTab = {
      ...creator,
      socket: new FakeSocket('copied-tab', server),
    };

    join(gateway, 'room', copiedTab);

    expect(
      copiedTab.socket.directEmissions.some(
        (item) => item.event === 'enterRoomError',
      ),
    ).toBe(true);
  });

  it('allows AI generation only for the current questioner', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { gateway, server } = createHarness();
    const creator = enter(
      gateway,
      new FakeSocket('creator-socket', server),
      'room',
      'creator',
      'Creator',
      'create',
    );
    const guest = enter(
      gateway,
      new FakeSocket('guest-socket', server),
      'room',
      'guest',
      'Guest',
      'join',
    );
    join(gateway, 'room', guest);
    start(gateway, 'room', creator);

    expect(
      gateway.canGenerateQuestion(
        'room',
        creator.playerId,
        creator.playerToken,
      ),
    ).toBe(true);
    expect(
      gateway.canGenerateQuestion('room', guest.playerId, guest.playerToken),
    ).toBe(false);
    ask(gateway, 'room', creator);
    expect(
      gateway.canGenerateQuestion(
        'room',
        creator.playerId,
        creator.playerToken,
      ),
    ).toBe(false);
  });
});
