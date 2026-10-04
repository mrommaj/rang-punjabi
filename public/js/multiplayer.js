(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RangMultiplayer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class MultiplayerManager {
    constructor() {
      this.socket = null;
      this.connected = false;
      this.currentRoom = null;
      this.myPlayerIndex = -1;
      this.isHost = false;
      this.listeners = {};
      this.sessionToken = this.getOrCreateSessionToken();
    }

    getOrCreateSessionToken() {
      try {
        let token = localStorage.getItem('rang_session_token');
        if (!token) {
          token = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
          localStorage.setItem('rang_session_token', token);
        }
        return token;
      } catch (e) {
        return 'usr_' + Math.random().toString(36).substring(2, 10);
      }
    }

    on(event, callback) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(callback);
    }

    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(data));
      }
    }

    connect() {
      if (this.socket && this.connected) return;
      if (typeof io === 'undefined') {
        console.warn('Socket.IO client library not loaded, running in offline mode');
        return;
      }

      // Check for custom backend URL (for Netlify frontend connecting to Render/Railway backend)
      let customServerUrl = '';
      try {
        customServerUrl = localStorage.getItem('rang_custom_server_url') || '';
      } catch (e) {}

      const socketOptions = {
        transports: ['websocket', 'polling'],
        auth: { token: this.sessionToken }
      };

      if (customServerUrl) {
        this.socket = io(customServerUrl, socketOptions);
      } else {
        this.socket = io(socketOptions);
      }

      this.socket.on('connect', () => {
        this.connected = true;
        this.emit('connection_status', { connected: true, socketId: this.socket.id });
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.emit('connection_status', { connected: false });
      });

      this.socket.on('room_created', (data) => {
        this.currentRoom = data.roomCode;
        this.myPlayerIndex = data.playerIndex;
        this.isHost = true;
        this.emit('room_joined', data);
      });

      this.socket.on('room_joined', (data) => {
        this.currentRoom = data.roomCode;
        this.myPlayerIndex = data.playerIndex;
        this.isHost = data.isHost;
        this.emit('room_joined', data);
      });

      this.socket.on('room_update', (roomState) => {
        this.emit('room_update', roomState);
      });

      this.socket.on('game_started', (gameState) => {
        this.emit('game_started', gameState);
      });

      this.socket.on('trump_call_required', (data) => {
        this.emit('trump_call_required', data);
      });

      this.socket.on('trump_selected', (data) => {
        this.emit('trump_selected', data);
      });

      this.socket.on('card_played', (data) => {
        this.emit('card_played', data);
      });

      this.socket.on('trick_finished', (data) => {
        this.emit('trick_finished', data);
      });

      this.socket.on('hand_finished', (data) => {
        this.emit('hand_finished', data);
      });

      this.socket.on('match_finished', (data) => {
        this.emit('match_finished', data);
      });

      this.socket.on('chat_message', (data) => {
        this.emit('chat_message', data);
      });

      this.socket.on('reaction_received', (data) => {
        this.emit('reaction_received', data);
      });

      this.socket.on('error_message', (msg) => {
        this.emit('error_message', msg);
      });
    }

    createRoom(options) {
      if (!this.socket || !this.connected) this.connect();
      if (this.socket) {
        this.socket.emit('create_room', {
          sessionToken: this.sessionToken,
          playerName: options.playerName || 'Player 1',
          avatar: options.avatar || 'punjabi_m1',
          mode: options.mode || 'single_sar',
          targetScore: options.targetScore || 7,
          matchLength: options.matchLength || 'points',
          botDifficulty: options.botDifficulty || 'medium'
        });
      }
    }

    joinRoom(roomCode, playerName, avatar) {
      if (!this.socket || !this.connected) this.connect();
      if (this.socket) {
        this.socket.emit('join_room', {
          sessionToken: this.sessionToken,
          roomCode: roomCode.trim().toUpperCase(),
          playerName: playerName || 'Guest',
          avatar: avatar || 'punjabi_m2'
        });
      }
    }

    selectSeat(seatIndex) {
      if (this.socket && this.currentRoom) {
        this.socket.emit('select_seat', { roomCode: this.currentRoom, seatIndex });
      }
    }

    toggleSeatBot(seatIndex, isBot) {
      if (this.socket && this.currentRoom) {
        this.socket.emit('toggle_seat_bot', { roomCode: this.currentRoom, seatIndex, isBot });
      }
    }

    startOnlineGame() {
      if (this.socket && this.currentRoom) {
        this.socket.emit('start_game', { roomCode: this.currentRoom });
      }
    }

    callTrump(suit, hiddenCardId = null) {
      if (this.socket && this.currentRoom) {
        this.socket.emit('call_trump', { roomCode: this.currentRoom, suit, hiddenCardId });
      }
    }

    playCard(cardId) {
      if (this.socket && this.currentRoom) {
        this.socket.emit('play_card', { roomCode: this.currentRoom, cardId });
      }
    }

    sendChat(text) {
      if (this.socket && this.currentRoom) {
        this.socket.emit('send_chat', { roomCode: this.currentRoom, text });
      }
    }

    sendReaction(reaction) {
      if (this.socket && this.currentRoom) {
        this.socket.emit('send_reaction', { roomCode: this.currentRoom, reaction });
      }
    }

    leaveRoom() {
      if (this.socket && this.currentRoom) {
        this.socket.emit('leave_room', { roomCode: this.currentRoom });
        this.currentRoom = null;
        this.isHost = false;
      }
    }
  }

  return new MultiplayerManager();
}));
