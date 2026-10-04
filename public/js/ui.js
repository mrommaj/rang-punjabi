(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RangUI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const AVATAR_MAP = {
    'punjabi_m1': { emoji: '👳‍♂️', name: 'Balli' },
    'punjabi_m2': { emoji: '🧔‍♂️', name: 'Happy' },
    'punjabi_m3': { emoji: '👳', name: 'Gopi' },
    'punjabi_m4': { emoji: '🤠', name: 'Diljit' },
    'punjabi_f1': { emoji: '🧕', name: 'Jassi' },
    'punjabi_f2': { emoji: '👩', name: 'Simran' },
    'punjabi_f3': { emoji: '👸', name: 'Preet' },
    'punjabi_m5': { emoji: '🤴', name: 'Raja' }
  };

  class UIManager {
    constructor() {
      this.cardSortMode = 'suit';
      this.botSpeed = 900;
      this.soundEnabled = true;
      this.onCardPlayCallback = null;
      this.onTrumpSelectedCallback = null;
      this.selectedCardId = null;
    }

    init() {
      this.bindGlobalEvents();
      this.renderAvatarsGrid();
    }

    setCardPlayHandler(cb) {
      this.onCardPlayCallback = cb;
    }

    setTrumpSelectHandler(cb) {
      this.onTrumpSelectedCallback = cb;
    }

    showToast(msg, icon = '🃏', duration = 3000) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }

    showPlayerReaction(playerIndex, text) {
      const zones = ['south', 'east', 'north', 'west'];
      const zoneName = zones[playerIndex];
      const zoneEl = document.querySelector(`.player-zone.${zoneName}`);
      if (!zoneEl) return;

      const oldBubble = zoneEl.querySelector('.speech-bubble');
      if (oldBubble) oldBubble.remove();

      const bubble = document.createElement('div');
      bubble.className = 'speech-bubble';
      bubble.innerText = text;
      zoneEl.appendChild(bubble);

      setTimeout(() => {
        bubble.style.transition = 'opacity 0.25s, transform 0.25s';
        bubble.style.opacity = '0';
        bubble.style.transform = 'scale(0.8)';
        setTimeout(() => bubble.remove(), 280);
      }, 2400);
    }

    renderAvatarsGrid() {
      const grid = document.getElementById('avatar-selection-grid');
      if (!grid) return;
      grid.innerHTML = '';

      Object.entries(AVATAR_MAP).forEach(([key, val], idx) => {
        const item = document.createElement('div');
        item.className = `avatar-opt ${idx === 0 ? 'selected' : ''}`;
        item.dataset.avatarKey = key;
        item.innerHTML = `
          <div class="avatar-img">${val.emoji}</div>
          <span class="avatar-name">${val.name}</span>
        `;
        item.addEventListener('click', () => {
          document.querySelectorAll('.avatar-opt').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
        });
        grid.appendChild(item);
      });
    }

    getSelectedAvatar() {
      const selected = document.querySelector('.avatar-opt.selected');
      return selected ? selected.dataset.avatarKey : 'punjabi_m1';
    }

    renderTableState(state, mySeatIndex = 0) {
      if (!state) return;

      // Update Top Bar Score
      const teamYouTricks = state.tricksWon[`team${mySeatIndex % 2}`] || 0;
      const teamOppTricks = state.tricksWon[`team${(mySeatIndex + 1) % 2}`] || 0;
      const teamYouScore = state.matchScore[`team${mySeatIndex % 2}`] || 0;
      const teamOppScore = state.matchScore[`team${(mySeatIndex + 1) % 2}`] || 0;

      const topScore = document.getElementById('top-score-display');
      if (topScore) {
        topScore.innerHTML = `
          <span class="team-badge team-you">You: ${teamYouTricks} (${teamYouScore}p)</span>
          <span class="score-vs">:</span>
          <span class="team-badge team-opp">Opp: ${teamOppTricks} (${teamOppScore}p)</span>
        `;
      }

      // Update Trump Widget
      const trumpWidget = document.getElementById('top-trump-widget');
      if (trumpWidget) {
        if (!state.trumpRevealed) {
          trumpWidget.innerHTML = `<span>🔒</span> <span>Band</span>`;
        } else if (state.trumpSuit) {
          const meta = {
            'S': { symbol: '♠', name: 'Hukum', color: '#fff' },
            'H': { symbol: '♥', name: 'Paan', color: '#ef4444' },
            'D': { symbol: '♦', name: 'Eent', color: '#ef4444' },
            'C': { symbol: '♣', name: 'Chidi', color: '#fff' }
          }[state.trumpSuit];
          trumpWidget.innerHTML = `<span style="color:${meta.color};font-size:14px;">${meta.symbol}</span> <span>${meta.name}</span>`;
        } else {
          trumpWidget.innerHTML = `<span>🃏</span> <span>Calling...</span>`;
        }
      }

      // Update 4 Player Seats
      const seatPositions = ['south', 'east', 'north', 'west'];
      
      for (let relPos = 0; relPos < 4; relPos++) {
        const absPlayerIndex = (mySeatIndex + relPos) % 4;
        const pData = state.players[absPlayerIndex];
        const posClass = seatPositions[relPos];
        const zoneEl = document.querySelector(`.player-zone.${posClass}`);
        if (!zoneEl || !pData) continue;

        const isTurn = (state.currentTurn === absPlayerIndex && state.phase === 'PLAYING');
        const isCaller = (state.trumpCallerIndex === absPlayerIndex);
        const isDealer = (state.dealerIndex === absPlayerIndex);
        const avatarInfo = AVATAR_MAP[pData.avatar] || { emoji: '👳', name: pData.name };

        let roleBadge = '';
        if (isCaller) roleBadge = `<span class="player-badge-role">HUKMI</span>`;
        else if (isDealer) roleBadge = `<span class="player-badge-role dealer">DEALER</span>`;

        const pCard = zoneEl.querySelector('.player-card');
        if (pCard) {
          pCard.className = `player-card ${isTurn ? 'active-turn' : ''}`;
          pCard.innerHTML = `
            <div class="player-avatar-wrap">
              <div class="player-avatar">${avatarInfo.emoji}</div>
              ${roleBadge}
            </div>
            <div class="player-info-meta">
              <span class="player-name">${pData.name}</span>
              <span class="tricks-pill">${state.playerTricksWon[absPlayerIndex]} sar</span>
            </div>
          `;
        }

        // Render hands
        if (posClass === 'south') {
          this.renderPlayerHand(state.myHand, state.validMoves, isTurn);
        } else {
          this.renderOpponentHand(zoneEl, pData.cardCount, posClass);
        }
      }

      // Render Center Trick Arena
      this.renderCenterTrick(state.currentTrick, mySeatIndex, state.heapTricks, state.mode);
    }

    renderPlayerHand(cards, validCardIds = [], isMyTurn = false) {
      const handContainer = document.getElementById('player-hand-fan');
      if (!handContainer) return;
      handContainer.innerHTML = '';

      if (!cards || cards.length === 0) return;

      const total = cards.length;
      const screenWidth = window.innerWidth || document.documentElement.clientWidth || 360;
      const availWidth = Math.min(screenWidth - 20, 480);

      // Card width based on screen
      const isSmallMobile = screenWidth <= 380;
      const cardWidth = isSmallMobile ? 34 : 38;

      // Calculate overlap so cards are guaranteed to fit 100% inside screen width
      let overlap = 0;
      if (total > 1) {
        const rawTotalWidth = total * cardWidth;
        if (rawTotalWidth > availWidth) {
          overlap = (rawTotalWidth - availWidth) / (total - 1);
        } else {
          overlap = Math.max(0, cardWidth * 0.32);
        }
      }

      const angleStep = Math.min(2.5, 24 / total);
      const startAngle = -((total - 1) * angleStep) / 2;

      cards.forEach((card, idx) => {
        const isPlayable = isMyTurn && validCardIds.includes(card.id);
        const angle = startAngle + idx * angleStep;
        const yOffset = Math.abs(idx - (total - 1) / 2) * 1.2;

        const cardHtml = RangCardRenderer.renderCard(card, {
          isPlayable: isPlayable,
          size: 'normal'
        });

        const cardEl = document.createElement('div');
        cardEl.innerHTML = cardHtml.trim();
        const cardNode = cardEl.firstChild;

        if (idx > 0 && overlap > 0) {
          cardNode.style.marginLeft = `-${overlap}px`;
        }
        cardNode.style.transform = `rotate(${angle}deg) translateY(${yOffset}px)`;
        cardNode.style.zIndex = idx + 5;

        if (isPlayable) {
          cardNode.addEventListener('click', () => {
            if (this.onCardPlayCallback) {
              this.onCardPlayCallback(card.id);
            }
          });
        }

        handContainer.appendChild(cardNode);
      });
    }

    renderOpponentHand(zoneEl, count, posClass) {
      let handEl = zoneEl.querySelector('.opponent-mini-hand');
      if (!handEl) {
        handEl = document.createElement('div');
        handEl.className = `opponent-mini-hand ${posClass === 'north' ? 'horizontal' : 'vertical'}`;
        zoneEl.appendChild(handEl);
      }
      handEl.innerHTML = '';

      if (count <= 0) return;

      const renderCount = Math.min(count, 4);
      for (let i = 0; i < renderCount; i++) {
        const cardBack = document.createElement('div');
        cardBack.className = 'card card-back small';
        cardBack.innerHTML = `<div class="card-back-pattern"><div class="card-back-mandala"></div></div>`;
        handEl.appendChild(cardBack);
      }

      const pill = document.createElement('div');
      pill.className = 'card-count-pill';
      pill.innerText = `${count}`;
      handEl.appendChild(pill);
    }

    renderCenterTrick(trickCards, mySeatIndex = 0, heapTricks = 0, mode = 'single_sar') {
      const arena = document.getElementById('trick-arena');
      if (!arena) return;

      arena.querySelectorAll('.trick-slot').forEach(el => el.remove());

      const seatPositions = ['south', 'east', 'north', 'west'];

      if (trickCards && trickCards.length > 0) {
        trickCards.forEach(entry => {
          const relPos = (entry.playerIndex - mySeatIndex + 4) % 4;
          const posClass = seatPositions[relPos];

          const slot = document.createElement('div');
          slot.className = `trick-slot ${posClass}`;
          slot.innerHTML = RangCardRenderer.renderCard(entry.card, { isPlayable: false, size: 'normal' });
          arena.appendChild(slot);
        });
      }

      // Heap Badge for Double Sar
      let heapBadge = document.getElementById('heap-indicator-badge');
      if (mode === 'double_sar' || mode === 'hidden_rung') {
        if (!heapBadge) {
          heapBadge = document.createElement('div');
          heapBadge.id = 'heap-indicator-badge';
          heapBadge.className = 'heap-badge';
          arena.appendChild(heapBadge);
        }
        heapBadge.style.display = 'flex';
        heapBadge.innerHTML = `<span>📚</span> <span>Heap: ${heapTricks}</span>`;
      } else if (heapBadge) {
        heapBadge.style.display = 'none';
      }
    }

    showTrickWinnerBanner(winnerName, winningCard) {
      const arena = document.getElementById('trick-arena');
      if (!arena) return;

      const oldBanner = arena.querySelector('.trick-winner-banner');
      if (oldBanner) oldBanner.remove();

      const banner = document.createElement('div');
      banner.className = 'trick-winner-banner';
      banner.innerHTML = `🎉 <strong>${winnerName}</strong> (${winningCard.rank}${RangCardRenderer.getSuitSymbol(winningCard.suit)})`;
      arena.appendChild(banner);

      setTimeout(() => banner.remove(), 1600);
    }

    showTrumpSelectModal(cards, mode, onSelect) {
      const modal = document.getElementById('trump-modal');
      const container = document.getElementById('trump-suits-container');
      const handPreview = document.getElementById('trump-hand-preview');
      const recBox = document.getElementById('trump-recommendation-box');
      if (!modal || !container) return;

      modal.classList.add('active');

      if (handPreview && cards) {
        handPreview.innerHTML = cards.map(c => RangCardRenderer.renderCard(c, { size: 'small' })).join('');
      }

      const ai = new RangAI('pro');
      const rec = ai.chooseTrump(cards, mode);
      const suitMeta = RangGameEngine.SUIT_META[rec.suit];
      if (recBox) {
        recBox.innerHTML = `💡 Best: ${suitMeta.punjabi} (${suitMeta.symbol})`;
      }

      const suits = [
        { key: 'S', name: 'Spades', pa: 'ਹੁਕਮ (Hukum)', symbol: '♠', class: 'spades' },
        { key: 'H', name: 'Hearts', pa: 'ਪਾਨ (Paan)', symbol: '♥', class: 'hearts' },
        { key: 'D', name: 'Diamonds', pa: 'ਇੱਟ (Eent)', symbol: '♦', class: 'diamonds' },
        { key: 'C', name: 'Clubs', pa: 'ਚਿੜੀ (Chidi)', symbol: '♣', class: 'clubs' }
      ];

      container.innerHTML = suits.map(s => `
        <div class="trump-suit-card ${s.class}" data-suit="${s.key}">
          <span class="trump-card-symbol">${s.symbol}</span>
          <span class="trump-card-name">${s.name}</span>
          <span class="trump-card-punjabi">${s.pa}</span>
        </div>
      `).join('');

      container.querySelectorAll('.trump-suit-card').forEach(cardEl => {
        cardEl.addEventListener('click', () => {
          const suit = cardEl.dataset.suit;
          modal.classList.remove('active');
          if (onSelect) onSelect(suit, rec.cardId);
        });
      });
    }

    showMatchOverModal(result, onRematch) {
      const modal = document.getElementById('match-over-modal');
      if (!modal) return;

      const titleEl = document.getElementById('match-winner-title');
      const statsEl = document.getElementById('match-stats-content');
      const rematchBtn = document.getElementById('match-rematch-btn');

      const isYouWinner = (result.matchWinner === 0);
      const winnerName = isYouWinner ? 'Team You' : 'Opponents';

      if (titleEl) {
        titleEl.innerHTML = isYouWinner ? `🏆 ${winnerName} Won!` : `👏 ${winnerName} Won!`;
      }

      if (statsEl) {
        statsEl.innerHTML = `
          <div style="background:rgba(0,0,0,0.4); padding:10px; border-radius:8px; font-size:0.85rem;">
            <p>Score: You ${result.matchScore.team0} - Opp ${result.matchScore.team1}</p>
            <p>Kotes: You ${result.kotesCount.team0} - Opp ${result.kotesCount.team1}</p>
          </div>
        `;
      }

      modal.classList.add('active');
      this.triggerConfetti();

      if (rematchBtn) {
        rematchBtn.onclick = () => {
          modal.classList.remove('active');
          if (onRematch) onRematch();
        };
      }
    }

    triggerConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#ffd700', '#ffae19', '#e63946', '#22c55e', '#3b82f6'];

      for (let i = 0; i < 80; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.8) * 16,
          size: Math.random() * 6 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
          gravity: 0.3,
          alpha: 1
        });
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeCount = 0;

        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.rotation += p.vRot;
          p.alpha -= 0.009;

          if (p.alpha > 0) {
            activeCount++;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
          }
        });

        if (activeCount > 0) {
          requestAnimationFrame(render);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      render();
    }

    bindGlobalEvents() {
      const chatBtn = document.getElementById('action-chat-btn');
      const tray = document.getElementById('reactions-tray-popover');
      if (chatBtn && tray) {
        chatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          tray.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
          if (!tray.contains(e.target) && e.target !== chatBtn) {
            tray.classList.remove('open');
          }
        });
      }

      document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.closest('.modal-overlay').classList.remove('active');
        });
      });
    }
  }

  return new UIManager();
}));
