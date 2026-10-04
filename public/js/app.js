(function() {
  'use strict';

  let currentGame = null;
  let currentAI = null;
  let isMultiplayer = false;
  let soloBotTimer = null;
  let mySeatIndex = 0;
  let selectedMode = 'single_sar';
  let targetScore = 7;
  let botDifficulty = 'medium';
  let botSpeedMs = 900;

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('SW registration skipped:', err);
      });
    });
  }

  // Initialize App on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    RangUI.init();
    bindMainLobbyEvents();
    bindReactionButtons();
    bindSettingsEvents();
    loadSavedSettings();
    checkUrlForRoomCode();

    // Setup UI callback delegates
    RangUI.setCardPlayHandler(onUserPlayCard);
  });

  function checkUrlForRoomCode() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      document.getElementById('join-room-code-input').value = roomCode.toUpperCase();
      openJoinRoomModal();
    }
  }

  function loadSavedSettings() {
    try {
      const savedTheme = localStorage.getItem('rang_table_theme');
      if (savedTheme) {
        document.body.className = savedTheme;
        const themeSelect = document.getElementById('setting-table-theme');
        if (themeSelect) themeSelect.value = savedTheme;
      }

      const customServer = localStorage.getItem('rang_custom_server_url');
      if (customServer) {
        const serverInput = document.getElementById('setting-server-url');
        if (serverInput) serverInput.value = customServer;
      }
    } catch (e) {}
  }

  function bindMainLobbyEvents() {
    // Mode selection cards in main lobby
    document.querySelectorAll('.game-mode-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.game-mode-opt').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        selectedMode = opt.dataset.mode;
      });
    });

    // Solo Play Button
    document.getElementById('btn-play-solo').addEventListener('click', () => {
      RangAudio.init();
      RangAudio.playClick();
      closeMainLobby();
      startSoloGame();
    });

    // Create Online Room Button
    document.getElementById('btn-create-room').addEventListener('click', () => {
      RangAudio.init();
      RangAudio.playClick();
      const playerName = document.getElementById('player-name-input').value || 'You';
      const avatar = RangUI.getSelectedAvatar();
      
      RangMultiplayer.createRoom({
        playerName,
        avatar,
        mode: selectedMode,
        targetScore,
        botDifficulty
      });

      closeMainLobby();
      openLobbyModal();
    });

    // Open Join Room Modal
    document.getElementById('btn-open-join-modal').addEventListener('click', () => {
      RangAudio.playClick();
      openJoinRoomModal();
    });

    // Confirm Join Room
    document.getElementById('btn-confirm-join').addEventListener('click', () => {
      RangAudio.init();
      RangAudio.playClick();
      const roomCode = document.getElementById('join-room-code-input').value;
      const playerName = document.getElementById('player-name-input').value || 'Guest';
      const avatar = RangUI.getSelectedAvatar();

      if (!roomCode) {
        RangUI.showToast('Please enter a 4-letter room code', '⚠️');
        return;
      }

      RangMultiplayer.joinRoom(roomCode, playerName, avatar);
      document.getElementById('join-room-modal').classList.remove('active');
      closeMainLobby();
      openLobbyModal();
    });

    // Start Online Game (Host Only)
    document.getElementById('btn-start-online-game').addEventListener('click', () => {
      RangAudio.playClick();
      RangMultiplayer.startOnlineGame();
    });

    // Copy Invite Link Button
    document.getElementById('btn-copy-invite-link').addEventListener('click', () => {
      RangAudio.playClick();
      const roomCode = RangMultiplayer.currentRoom;
      if (!roomCode) return;
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(inviteUrl).then(() => {
          RangUI.showToast(RangLang.t('linkCopied'), '🔗');
        });
      } else {
        RangUI.showToast(`Room Code: ${roomCode}`, '📋');
      }
    });

    // Navbar Brand / Home
    document.getElementById('brand-home-btn').addEventListener('click', () => {
      RangAudio.playClick();
      if (confirm('Return to main menu? Current game will be left.')) {
        if (isMultiplayer) RangMultiplayer.leaveRoom();
        if (soloBotTimer) clearTimeout(soloBotTimer);
        openMainLobby();
      }
    });

    // Rules Modal Button
    document.getElementById('btn-open-rules').addEventListener('click', () => {
      RangAudio.playClick();
      document.getElementById('rules-modal').classList.add('active');
    });

    // Settings Modal Button
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      RangAudio.playClick();
      document.getElementById('settings-modal').classList.add('active');
    });

    // Sound Mute Toggle
    document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
      RangAudio.init();
      const isMuted = !RangAudio.enabled;
      RangAudio.setMuted(!isMuted);
      e.currentTarget.innerHTML = !isMuted ? '🔊' : '🔇';
      RangUI.showToast(!isMuted ? 'Sound Enabled' : 'Sound Muted', !isMuted ? '🔊' : '🔇');
    });

    // Sort Cards Toggle Button
    const sortBtn = document.getElementById('btn-sort-cards');
    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        RangAudio.playClick();
        if (currentGame) {
          currentGame.sortHand(mySeatIndex);
          RangUI.renderTableState(currentGame.getPublicState(mySeatIndex), mySeatIndex);
        }
      });
    }

    // Multiplayer socket events
    setupMultiplayerListeners();
  }

  function setupMultiplayerListeners() {
    RangMultiplayer.on('room_joined', (data) => {
      isMultiplayer = true;
      mySeatIndex = data.playerIndex;
      document.getElementById('lobby-room-code-badge').innerText = data.roomCode;
      renderLobbySeats(data.lobbyState);
    });

    RangMultiplayer.on('room_update', (lobbyState) => {
      renderLobbySeats(lobbyState);
    });

    RangMultiplayer.on('game_started', (data) => {
      document.getElementById('lobby-modal').classList.remove('active');
      RangAudio.playShuffle();
      RangUI.showToast('Game Started! Dealing cards...', '🎴');
    });

    RangMultiplayer.on('game_state_update', (state) => {
      RangUI.renderTableState(state, mySeatIndex);
    });

    RangMultiplayer.on('trump_call_required', (data) => {
      if (data.callerIndex === mySeatIndex) {
        RangAudio.playTurnReminder();
        RangUI.showTrumpSelectModal(data.cards, data.mode, (suit, cardId) => {
          RangMultiplayer.callTrump(suit, cardId);
        });
      }
    });

    RangMultiplayer.on('trump_selected', (data) => {
      RangAudio.playTrumpCall();
      const meta = RangGameEngine.SUIT_META[data.trumpSuit];
      const suitName = meta ? meta.punjabi : 'Trump';
      RangUI.showToast(`${data.callerName} selected Trump: ${suitName}!`, '🎺');
    });

    RangMultiplayer.on('trick_finished', (data) => {
      RangAudio.playTrickWin();
      RangUI.showTrickWinnerBanner(data.evalRes.winnerName, data.evalRes.winningCard);
      if (data.evalRes.doubleSarStatus && data.evalRes.doubleSarStatus.collected) {
        RangUI.showToast(`Double Sar! ${data.evalRes.winnerName} collected ${data.evalRes.tricksAwarded} tricks!`, '🔥');
      }
    });

    RangMultiplayer.on('hand_finished', (result) => {
      if (result.isBawlaKote) {
        RangAudio.playDholBeat();
        RangUI.showToast(RangLang.t('bawlaKoteAlert', { team: result.winningTeam === 0 ? 'Team You' : 'Opponents' }), '👑', 5000);
      } else if (result.isKote) {
        RangAudio.playDholBeat();
        RangUI.showToast(RangLang.t('koteAlert', { team: result.winningTeam === 0 ? 'Team You' : 'Opponents' }), '🔥', 5000);
      } else {
        RangAudio.playTrumpCall();
        RangUI.showToast(RangLang.t('handWonBy', {
          team: result.winningTeam === 0 ? 'Team You' : 'Opponents',
          t0: result.tricksWon.team0,
          t1: result.tricksWon.team1
        }), '🎉');
      }
    });

    RangMultiplayer.on('match_finished', (result) => {
      RangAudio.playDholBeat();
      RangUI.showMatchOverModal(result, () => {
        openMainLobby();
      });
    });

    RangMultiplayer.on('chat_message', (data) => {
      RangAudio.playPop();
      RangUI.showPlayerReaction(data.playerIndex, data.text);
    });

    RangMultiplayer.on('reaction_received', (data) => {
      if (data.reaction.audio === 'dhol') RangAudio.playDholBeat();
      else if (data.reaction.audio === 'fanfare') RangAudio.playTrumpCall();
      else if (data.reaction.audio === 'tumbi') RangAudio.playTumbi();
      else if (data.reaction.audio === 'whistle') RangAudio.playWhistle();
      else RangAudio.playPop();

      RangUI.showPlayerReaction(data.playerIndex, data.reaction.label || data.reaction.text);
    });

    RangMultiplayer.on('error_message', (msg) => {
      RangUI.showToast(msg, '⚠️');
    });
  }

  function renderLobbySeats(lobbyState) {
    if (!lobbyState) return;
    const grid = document.getElementById('lobby-seats-container');
    if (!grid) return;
    grid.innerHTML = '';

    const startBtn = document.getElementById('btn-start-online-game');
    if (startBtn) {
      startBtn.style.display = RangMultiplayer.isHost ? 'flex' : 'none';
    }

    lobbyState.seats.forEach((seat, idx) => {
      const isMySeat = (idx === mySeatIndex);
      const seatEl = document.createElement('div');
      seatEl.className = `lobby-seat team-${seat.team} ${isMySeat ? 'my-seat' : ''}`;
      
      const roleText = (idx === 0) ? 'South (You/Host)' : (idx === 2) ? 'North (Partner)' : (idx === 1) ? 'East (Opponent)' : 'West (Opponent)';

      seatEl.innerHTML = `
        <span class="lobby-seat-team">Team ${seat.team === 0 ? '1 (You & Partner)' : '2 (Opponents)'}</span>
        <div class="avatar-img">${(seat.avatar && RangUI) ? '👳' : '👤'}</div>
        <strong style="font-size:0.85rem;">${seat.name} ${isMySeat ? '(You)' : ''}</strong>
        <span style="font-size:0.7rem; color:var(--text-muted);">${roleText}</span>
        ${(!isMySeat && !seat.isOccupied) ? `<button class="seat-action-btn switch-seat-btn">Sit Here</button>` : ''}
        ${(RangMultiplayer.isHost && !isMySeat && !seat.isOccupied) ? `
          <button class="seat-action-btn toggle-bot-btn">${seat.isBot ? 'Change to Open' : 'Change to Bot'}</button>
        ` : ''}
      `;

      const switchBtn = seatEl.querySelector('.switch-seat-btn');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => {
          RangAudio.playClick();
          RangMultiplayer.selectSeat(idx);
        });
      }

      const botBtn = seatEl.querySelector('.toggle-bot-btn');
      if (botBtn) {
        botBtn.addEventListener('click', () => {
          RangAudio.playClick();
          RangMultiplayer.toggleSeatBot(idx, !seat.isBot);
        });
      }

      grid.appendChild(seatEl);
    });
  }

  // --- SOLO GAME ENGINE RUNNER ---
  function startSoloGame() {
    isMultiplayer = false;
    mySeatIndex = 0; // Human is South

    const playerName = document.getElementById('player-name-input').value || 'You';
    const playerAvatar = RangUI.getSelectedAvatar();

    currentAI = new RangAI(botDifficulty);
    currentGame = new RangGameEngine.RangGame({
      mode: selectedMode,
      targetScore: targetScore,
      matchLength: 'points',
      dealerIndex: 3, // West deals, so South (You) is caller in round 1!
      playerNames: [playerName, 'Happy', 'Jassi (Partner)', 'Gopi']
    });

    currentGame.players[0].avatar = playerAvatar;

    RangAudio.playShuffle();
    RangUI.showToast('New Hand Dealt! Dealing 5 cards...', '🎴');
    currentGame.startNewHand();

    updateSoloUI();
    processSoloTurn();
  }

  function processSoloTurn() {
    if (!currentGame || isMultiplayer) return;
    if (soloBotTimer) clearTimeout(soloBotTimer);

    if (currentGame.phase === 'CALLING_TRUMP') {
      const caller = currentGame.trumpCallerIndex;
      if (caller === mySeatIndex) {
        // Human is Trump Caller!
        RangAudio.playTurnReminder();
        RangUI.showTrumpSelectModal(currentGame.players[mySeatIndex].cards, currentGame.mode, (suit, cardId) => {
          currentGame.setTrump(suit, cardId);
          RangAudio.playTrumpCall();
          const meta = RangGameEngine.SUIT_META[suit];
          RangUI.showToast(`You called Trump: ${meta.punjabi} (${meta.symbol})!`, '🎺');
          updateSoloUI();
          processSoloTurn();
        });
      } else {
        // Bot is Trump Caller
        soloBotTimer = setTimeout(() => {
          const cards = currentGame.players[caller].cards;
          const choice = currentAI.chooseTrump(cards, currentGame.mode);
          currentGame.setTrump(choice.suit, choice.cardId);
          RangAudio.playTrumpCall();
          const meta = RangGameEngine.SUIT_META[choice.suit];
          RangUI.showToast(`${currentGame.players[caller].name} called Trump: ${meta.punjabi}!`, '🎺');
          updateSoloUI();
          processSoloTurn();
        }, botSpeedMs + 300);
      }
    } else if (currentGame.phase === 'PLAYING') {
      const turn = currentGame.currentTurn;
      if (turn === mySeatIndex) {
        RangAudio.playTurnReminder();
        updateSoloUI();
      } else {
        soloBotTimer = setTimeout(() => {
          const cardToPlay = currentAI.chooseCardToPlay(currentGame, turn);
          if (cardToPlay) {
            handleSoloCardPlay(turn, cardToPlay.id);
          }
        }, botSpeedMs);
      }
    }
  }

  function onUserPlayCard(cardId) {
    if (isMultiplayer) {
      RangAudio.playCardPlay();
      RangMultiplayer.playCard(cardId);
    } else if (currentGame) {
      if (currentGame.phase === 'PLAYING' && currentGame.currentTurn === mySeatIndex) {
        RangAudio.playCardPlay();
        handleSoloCardPlay(mySeatIndex, cardId);
      }
    }
  }

  function handleSoloCardPlay(playerIndex, cardId) {
    if (!currentGame) return;

    try {
      const res = currentGame.playCard(playerIndex, cardId);
      RangAudio.playCardPlay();
      updateSoloUI();

      if (res.revealEvent) {
        RangAudio.playTrumpCall();
        const meta = RangGameEngine.SUIT_META[res.revealEvent.trumpSuit];
        RangUI.showToast(`Band Rang Revealed by ${currentGame.players[res.revealEvent.revealerIndex].name}: ${meta.punjabi}!`, '🔓', 4000);
      }

      if (res.event === 'TRICK_FINISHED') {
        const evalRes = res.trickEvaluation;
        RangAudio.playTrickWin();
        RangUI.showTrickWinnerBanner(evalRes.winnerName, evalRes.winningCard);

        if (evalRes.doubleSarStatus && evalRes.doubleSarStatus.collected) {
          RangUI.showToast(`Double Sar! ${evalRes.winnerName} swept ${evalRes.tricksAwarded} tricks!`, '🔥');
        }

        soloBotTimer = setTimeout(() => {
          const resolveRes = currentGame.resolveTrickEnd();
          updateSoloUI();

          if (resolveRes.event === 'HAND_FINISHED') {
            const hRes = resolveRes.handResult;
            if (hRes.isBawlaKote) {
              RangAudio.playDholBeat();
              RangUI.showToast(RangLang.t('bawlaKoteAlert', { team: hRes.winningTeam === 0 ? 'Team You' : 'Opponents' }), '👑', 5000);
            } else if (hRes.isKote) {
              RangAudio.playDholBeat();
              RangUI.showToast(RangLang.t('koteAlert', { team: hRes.winningTeam === 0 ? 'Team You' : 'Opponents' }), '🔥', 5000);
            } else {
              RangAudio.playTrumpCall();
              RangUI.showToast(RangLang.t('handWonBy', {
                team: hRes.winningTeam === 0 ? 'Team You' : 'Opponents',
                t0: hRes.tricksWon.team0,
                t1: hRes.tricksWon.team1
              }), '🎉');
            }

            if (hRes.matchWinner !== null) {
              RangAudio.playDholBeat();
              RangUI.showMatchOverModal(hRes, () => {
                startSoloGame();
              });
            } else {
              setTimeout(() => {
                currentGame.startNewHand();
                RangAudio.playShuffle();
                updateSoloUI();
                processSoloTurn();
              }, 3000);
            }
          } else {
            processSoloTurn();
          }
        }, 1600);
      } else {
        processSoloTurn();
      }
    } catch (e) {
      console.error('Error in solo card play:', e);
    }
  }

  function updateSoloUI() {
    if (!currentGame) return;
    const state = currentGame.getPublicState(mySeatIndex);
    RangUI.renderTableState(state, mySeatIndex);
  }

  function bindReactionButtons() {
    const trayGrid = document.getElementById('reaction-slogans-grid');
    if (trayGrid) {
      trayGrid.innerHTML = '';
      const reactions = RangLang.getReactions();
      reactions.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'slogan-btn';
        btn.innerText = r.label;
        btn.addEventListener('click', () => {
          sendReaction(r);
          document.getElementById('reactions-tray-popover').classList.remove('open');
        });
        trayGrid.appendChild(btn);
      });
    }

    const chatInput = document.getElementById('custom-chat-input');
    const sendBtn = document.getElementById('custom-chat-send-btn');
    if (sendBtn && chatInput) {
      const handleSend = () => {
        const text = chatInput.value.trim();
        if (text) {
          sendReaction({ text, label: text, audio: 'pop' });
          chatInput.value = '';
          document.getElementById('reactions-tray-popover').classList.remove('open');
        }
      };
      sendBtn.addEventListener('click', handleSend);
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
      });
    }
  }

  function sendReaction(reaction) {
    if (isMultiplayer) {
      RangMultiplayer.sendReaction(reaction);
    } else {
      if (reaction.audio === 'dhol') RangAudio.playDholBeat();
      else if (reaction.audio === 'fanfare') RangAudio.playTrumpCall();
      else if (reaction.audio === 'tumbi') RangAudio.playTumbi();
      else if (reaction.audio === 'whistle') RangAudio.playWhistle();
      else RangAudio.playPop();

      RangUI.showPlayerReaction(mySeatIndex, reaction.label || reaction.text);

      if (Math.random() < 0.6) {
        setTimeout(() => {
          const partnerReplies = ['Aaho! 🔥', 'Shabash! 👏', 'Chak de! ✨', 'Wah ji Wah! 💃'];
          const botReply = partnerReplies[Math.floor(Math.random() * partnerReplies.length)];
          RangAudio.playPop();
          RangUI.showPlayerReaction(2, botReply);
        }, 1200);
      }
    }
  }

  function bindSettingsEvents() {
    const speedSelect = document.getElementById('setting-bot-speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        botSpeedMs = parseInt(e.target.value, 10);
      });
    }

    const diffSelect = document.getElementById('setting-bot-diff');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        botDifficulty = e.target.value;
        if (currentAI) currentAI.setDifficulty(botDifficulty);
      });
    }

    const langSelect = document.getElementById('setting-language');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        RangLang.setLang(e.target.value);
        bindReactionButtons();
        RangUI.showToast(e.target.value === 'pa' ? 'ਭਾਸ਼ਾ ਬਦਲੀ ਗਈ: ਪੰਜਾਬੀ' : 'Language changed: English', '🌐');
      });
    }

    // Table Theme selector
    const themeSelect = document.getElementById('setting-table-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = theme;
        try { localStorage.setItem('rang_table_theme', theme); } catch (err) {}
        RangUI.showToast('Table Theme Updated!', '🎨');
      });
    }

    // Custom Server URL (for Netlify frontend -> Render backend)
    const serverInput = document.getElementById('setting-server-url');
    if (serverInput) {
      serverInput.addEventListener('change', (e) => {
        const url = e.target.value.trim();
        try { localStorage.setItem('rang_custom_server_url', url); } catch (err) {}
        RangUI.showToast('Multiplayer Server URL saved', '🌐');
      });
    }
  }

  function openMainLobby() {
    document.getElementById('main-lobby-modal').classList.add('active');
  }

  function closeMainLobby() {
    document.getElementById('main-lobby-modal').classList.remove('active');
  }

  function openJoinRoomModal() {
    document.getElementById('join-room-modal').classList.add('active');
  }

  function openLobbyModal() {
    document.getElementById('lobby-modal').classList.add('active');
  }

})();
