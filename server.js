const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const { RangGame, GAME_MODES } = require('./public/js/game-engine.js');
const RangAI = require('./public/js/ai.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms in memory
const rooms = new Map();
const socketToRoom = new Map();

// Helper to generate friendly 4-letter room codes
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const DEFAULT_BOT_NAMES = [
  { name: 'Jassi', avatar: 'punjabi_f1' },
  { name: 'Happy', avatar: 'punjabi_m2' },
  { name: 'Gopi', avatar: 'punjabi_m3' },
  { name: 'Balli', avatar: 'punjabi_m1' },
  { name: 'Simran', avatar: 'punjabi_f2' },
  { name: 'Diljit', avatar: 'punjabi_m4' }
];

class RoomManager {
  constructor(roomCode, hostSocketId, options = {}) {
    this.code = roomCode;
    this.hostSocketId = hostSocketId;
    this.mode = options.mode || GAME_MODES.SINGLE_SAR;
    this.targetScore = options.targetScore || 7;
    this.matchLength = options.matchLength || 'points';
    this.botDifficulty = options.botDifficulty || 'medium';
    this.ai = new RangAI(this.botDifficulty);
    this.status = 'LOBBY'; // 'LOBBY', 'PLAYING', 'MATCH_OVER'
    
    this.seats = [
      { playerIndex: 0, socketId: hostSocketId, sessionToken: options.sessionToken, name: options.playerName || 'Player 1', avatar: options.avatar || 'punjabi_m1', isBot: false, team: 0 },
      { playerIndex: 1, socketId: null, sessionToken: null, name: 'Happy', avatar: 'punjabi_m2', isBot: true, team: 1 },
      { playerIndex: 2, socketId: null, sessionToken: null, name: 'Jassi (Partner)', avatar: 'punjabi_f1', isBot: true, team: 0 },
      { playerIndex: 3, socketId: null, sessionToken: null, name: 'Gopi', avatar: 'punjabi_m3', isBot: true, team: 1 }
    ];

    this.game = null;
    this.botTimer = null;
  }

  getLobbyState() {
    return {
      roomCode: this.code,
      hostSocketId: this.hostSocketId,
      status: this.status,
      mode: this.mode,
      targetScore: this.targetScore,
      matchLength: this.matchLength,
      botDifficulty: this.botDifficulty,
      seats: this.seats.map(s => ({
        playerIndex: s.playerIndex,
        name: s.name,
        avatar: s.avatar,
        isBot: s.isBot,
        isOccupied: s.socketId !== null || s.isBot,
        isHost: s.socketId === this.hostSocketId,
        team: s.team
      }))
    };
  }

  broadcastLobby() {
    io.to(this.code).emit('room_update', this.getLobbyState());
  }

  broadcastGameState() {
    if (!this.game) return;
    this.seats.forEach((seat, idx) => {
      if (seat.socketId) {
        const playerState = this.game.getPublicState(idx);
        io.to(seat.socketId).emit('game_state_update', playerState);
      }
    });
  }

  startGame() {
    this.status = 'PLAYING';
    const playerNames = this.seats.map(s => s.name);
    this.game = new RangGame({
      mode: this.mode,
      targetScore: this.targetScore,
      matchLength: this.matchLength,
      playerNames: playerNames
    });

    // Update game player metadata
    this.seats.forEach((seat, idx) => {
      this.game.players[idx].name = seat.name;
      this.game.players[idx].avatar = seat.avatar;
      this.game.players[idx].isHuman = !seat.isBot;
    });

    const handStart = this.game.startNewHand();
    this.broadcastGameState();
    io.to(this.code).emit('game_started', {
      dealerIndex: this.game.dealerIndex,
      trumpCallerIndex: this.game.trumpCallerIndex,
      mode: this.mode
    });

    this.checkNextAction();
  }

  checkNextAction() {
    if (this.status !== 'PLAYING' || !this.game) return;
    if (this.botTimer) clearTimeout(this.botTimer);

    if (this.game.phase === 'CALLING_TRUMP') {
      const callerIndex = this.game.trumpCallerIndex;
      const callerSeat = this.seats[callerIndex];

      if (callerSeat.isBot || !callerSeat.socketId) {
        // AI Bot or disconnected player calls trump
        this.botTimer = setTimeout(() => {
          const cards = this.game.players[callerIndex].cards;
          const trumpChoice = this.ai.chooseTrump(cards, this.mode);
          this.handleTrumpCall(callerIndex, trumpChoice.suit, trumpChoice.cardId);
        }, 1200);
      } else {
        // Notify human caller
        io.to(callerSeat.socketId).emit('trump_call_required', {
          callerIndex: callerIndex,
          cards: this.game.players[callerIndex].cards,
          mode: this.mode
        });
      }
    } else if (this.game.phase === 'PLAYING') {
      const currentTurn = this.game.currentTurn;
      const turnSeat = this.seats[currentTurn];

      if (turnSeat.isBot || !turnSeat.socketId) {
        // AI Bot turn
        this.botTimer = setTimeout(() => {
          const cardToPlay = this.ai.chooseCardToPlay(this.game, currentTurn);
          if (cardToPlay) {
            this.handleCardPlay(currentTurn, cardToPlay.id);
          }
        }, 1000);
      }
    }
  }

  handleTrumpCall(playerIndex, suit, hiddenCardId = null) {
    if (!this.game || this.game.phase !== 'CALLING_TRUMP') return;
    if (playerIndex !== this.game.trumpCallerIndex) return;

    try {
      const trumpRes = this.game.setTrump(suit, hiddenCardId);
      io.to(this.code).emit('trump_selected', {
        trumpSuit: this.game.trumpRevealed ? this.game.trumpSuit : null,
        trumpRevealed: this.game.trumpRevealed,
        trumpCallerIndex: this.game.trumpCallerIndex,
        callerName: this.seats[playerIndex].name
      });

      this.broadcastGameState();
      this.checkNextAction();
    } catch (e) {
      console.error('Error setting trump:', e);
    }
  }

  handleCardPlay(playerIndex, cardId) {
    if (!this.game || this.game.phase !== 'PLAYING') return;
    if (playerIndex !== this.game.currentTurn) return;

    try {
      const playRes = this.game.playCard(playerIndex, cardId);
      this.broadcastGameState();

      if (playRes.revealEvent) {
        io.to(this.code).emit('trump_revealed', {
          trumpSuit: playRes.revealEvent.trumpSuit,
          revealerIndex: playRes.revealEvent.revealerIndex,
          revealerName: this.seats[playRes.revealEvent.revealerIndex].name
        });
      }

      if (playRes.event === 'TRICK_FINISHED') {
        const evalRes = playRes.trickEvaluation;
        io.to(this.code).emit('trick_finished', {
          trickCards: playRes.trickCards,
          evalRes: evalRes
        });

        // Delay to allow players to see completed trick before collecting
        setTimeout(() => {
          const resolveRes = this.game.resolveTrickEnd();
          this.broadcastGameState();

          if (resolveRes.event === 'HAND_FINISHED') {
            io.to(this.code).emit('hand_finished', resolveRes.handResult);
            if (resolveRes.handResult.matchWinner !== null) {
              this.status = 'MATCH_OVER';
              io.to(this.code).emit('match_finished', resolveRes.handResult);
            } else {
              // Start next hand after brief celebration
              setTimeout(() => {
                if (this.status === 'PLAYING') {
                  this.game.startNewHand();
                  this.broadcastGameState();
                  this.checkNextAction();
                }
              }, 4000);
            }
          } else {
            this.checkNextAction();
          }
        }, 1800);
      } else {
        this.checkNextAction();
      }
    } catch (e) {
      console.error('Error playing card:', e);
    }
  }
}

io.on('connection', (socket) => {
  const sessionToken = socket.handshake.auth.token;

  socket.on('create_room', (options) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const room = new RoomManager(roomCode, socket.id, {
      ...options,
      sessionToken
    });

    rooms.set(roomCode, room);
    socketToRoom.set(socket.id, { roomCode, playerIndex: 0 });
    socket.join(roomCode);

    socket.emit('room_created', {
      roomCode,
      playerIndex: 0,
      isHost: true,
      lobbyState: room.getLobbyState()
    });
  });

  socket.on('join_room', ({ roomCode, playerName, avatar, sessionToken }) => {
    const code = roomCode.trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit('error_message', 'Room not found. Please check the code.');
      return;
    }

    // Check if player is reconnecting with existing session token
    let seatIndex = -1;
    if (sessionToken) {
      seatIndex = room.seats.findIndex(s => s.sessionToken === sessionToken);
    }

    if (seatIndex !== -1) {
      // Reconnect to existing seat!
      room.seats[seatIndex].socketId = socket.id;
      room.seats[seatIndex].name = playerName || room.seats[seatIndex].name;
      room.seats[seatIndex].avatar = avatar || room.seats[seatIndex].avatar;
      room.seats[seatIndex].isBot = false;
    } else {
      // Find first empty seat
      seatIndex = room.seats.findIndex(s => s.socketId === null && s.isBot);
      if (seatIndex === -1) {
        seatIndex = room.seats.findIndex(s => s.socketId === null);
      }

      if (seatIndex === -1) {
        socket.emit('error_message', 'Room is currently full.');
        return;
      }

      room.seats[seatIndex].socketId = socket.id;
      room.seats[seatIndex].sessionToken = sessionToken;
      room.seats[seatIndex].name = playerName || `Player ${seatIndex + 1}`;
      room.seats[seatIndex].avatar = avatar || 'punjabi_m2';
      room.seats[seatIndex].isBot = false;
    }

    socketToRoom.set(socket.id, { roomCode: code, playerIndex: seatIndex });
    socket.join(code);

    socket.emit('room_joined', {
      roomCode: code,
      playerIndex: seatIndex,
      isHost: (socket.id === room.hostSocketId),
      lobbyState: room.getLobbyState()
    });

    room.broadcastLobby();

    if (room.status === 'PLAYING') {
      room.broadcastGameState();
      room.checkNextAction();
    }
  });

  socket.on('select_seat', ({ roomCode, seatIndex }) => {
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'LOBBY') return;
    const currentInfo = socketToRoom.get(socket.id);
    if (!currentInfo) return;

    const fromSeat = currentInfo.playerIndex;
    if (fromSeat === seatIndex) return;

    const targetSeat = room.seats[seatIndex];
    if (targetSeat.socketId !== null) return; // Already occupied by human

    // Swap / Move to target seat
    const prevData = { ...room.seats[fromSeat] };
    room.seats[fromSeat] = {
      playerIndex: fromSeat,
      socketId: null,
      sessionToken: null,
      name: DEFAULT_BOT_NAMES[fromSeat].name,
      avatar: DEFAULT_BOT_NAMES[fromSeat].avatar,
      isBot: true,
      team: (fromSeat % 2)
    };

    room.seats[seatIndex] = {
      playerIndex: seatIndex,
      socketId: socket.id,
      sessionToken: prevData.sessionToken,
      name: prevData.name,
      avatar: prevData.avatar,
      isBot: false,
      team: (seatIndex % 2)
    };

    socketToRoom.set(socket.id, { roomCode, playerIndex: seatIndex });
    socket.emit('room_joined', {
      roomCode,
      playerIndex: seatIndex,
      isHost: (socket.id === room.hostSocketId),
      lobbyState: room.getLobbyState()
    });

    room.broadcastLobby();
  });

  socket.on('toggle_seat_bot', ({ roomCode, seatIndex, isBot }) => {
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'LOBBY') return;
    if (socket.id !== room.hostSocketId) return;

    if (room.seats[seatIndex] && room.seats[seatIndex].socketId === null) {
      room.seats[seatIndex].isBot = isBot;
      room.broadcastLobby();
    }
  });

  socket.on('start_game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    if (socket.id !== room.hostSocketId) return;
    room.startGame();
  });

  socket.on('call_trump', ({ roomCode, suit, hiddenCardId }) => {
    const room = rooms.get(roomCode);
    const info = socketToRoom.get(socket.id);
    if (!room || !info) return;
    room.handleTrumpCall(info.playerIndex, suit, hiddenCardId);
  });

  socket.on('play_card', ({ roomCode, cardId }) => {
    const room = rooms.get(roomCode);
    const info = socketToRoom.get(socket.id);
    if (!room || !info) return;
    room.handleCardPlay(info.playerIndex, cardId);
  });

  socket.on('send_chat', ({ roomCode, text }) => {
    const info = socketToRoom.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || !info) return;
    const sender = room.seats[info.playerIndex];
    io.to(roomCode).emit('chat_message', {
      playerIndex: info.playerIndex,
      name: sender.name,
      avatar: sender.avatar,
      text: text.substring(0, 100),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('send_reaction', ({ roomCode, reaction }) => {
    const info = socketToRoom.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || !info) return;
    const sender = room.seats[info.playerIndex];
    io.to(roomCode).emit('reaction_received', {
      playerIndex: info.playerIndex,
      name: sender.name,
      avatar: sender.avatar,
      reaction
    });
  });

  socket.on('disconnect', () => {
    const info = socketToRoom.get(socket.id);
    if (info) {
      const { roomCode, playerIndex } = info;
      const room = rooms.get(roomCode);
      if (room) {
        if (room.status === 'LOBBY') {
          room.seats[playerIndex].socketId = null;
          room.seats[playerIndex].isBot = true;
          if (room.hostSocketId === socket.id) {
            // Reassign host to next available human
            const nextHuman = room.seats.find(s => s.socketId !== null);
            if (nextHuman) room.hostSocketId = nextHuman.socketId;
          }
          room.broadcastLobby();
        } else {
          // In game: mark socket as disconnected, AI takes temporary control
          room.seats[playerIndex].socketId = null;
          room.checkNextAction();
        }
      }
      socketToRoom.delete(socket.id);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Rang Card Game server running at http://0.0.0.0:${PORT}`);
});
