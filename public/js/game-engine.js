(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RangGameEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const SUITS = {
    SPADES: 'S',
    HEARTS: 'H',
    DIAMONDS: 'D',
    CLUBS: 'C'
  };

  const SUIT_META = {
    'S': { name: 'Spades', punjabi: 'ਹੁਕਮ (Hukum)', symbol: '♠', color: '#1a1a2e', isRed: false },
    'H': { name: 'Hearts', punjabi: 'ਪਾਨ (Paan)', symbol: '♥', color: '#e63946', isRed: true },
    'D': { name: 'Diamonds', punjabi: 'ਇੱਟ (Eent)', symbol: '♦', color: '#e63946', isRed: true },
    'C': { name: 'Clubs', punjabi: 'ਚਿੜੀ (Chidi)', symbol: '♣', color: '#1a1a2e', isRed: false }
  };

  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  const GAME_MODES = {
    SINGLE_SAR: 'single_sar',   // Classic Rang / Single Sir
    DOUBLE_SAR: 'double_sar',   // Double Sir (collect on 2 in a row)
    HIDDEN_RUNG: 'hidden_rung'  // Band Rang (trump face-down until revoke)
  };

  function createDeck() {
    const deck = [];
    const suits = ['S', 'H', 'D', 'C'];
    for (const suit of suits) {
      for (const rank of RANKS) {
        deck.push({
          id: `${rank}_${suit}`,
          suit: suit,
          rank: rank,
          value: RANK_VALUES[rank],
          name: `${rank} of ${SUIT_META[suit].name}`
        });
      }
    }
    return deck;
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  class RangGame {
    constructor(options = {}) {
      this.mode = options.mode || GAME_MODES.SINGLE_SAR;
      this.targetScore = options.targetScore || 7; // Hand points or Kotes
      this.matchLength = options.matchLength || 'points'; // 'points' (first to targetScore), 'hands' (best of N)
      this.dealerIndex = (options.dealerIndex !== undefined) ? options.dealerIndex : 3; // 0: South, 1: East, 2: North, 3: West
      this.trumpCallerIndex = (this.dealerIndex + 1) % 4;
      
      this.players = [
        { id: 'p0', name: 'You (South)', team: 0, isHuman: true, avatar: 'punjabi_m1', cards: [] },
        { id: 'p1', name: 'Happy (East)', team: 1, isHuman: false, avatar: 'punjabi_m2', cards: [] },
        { id: 'p2', name: 'Jassi (North)', team: 0, isHuman: false, avatar: 'punjabi_f1', cards: [] },
        { id: 'p3', name: 'Gopi (West)', team: 1, isHuman: false, avatar: 'punjabi_m3', cards: [] }
      ];

      if (options.playerNames) {
        options.playerNames.forEach((name, i) => {
          if (this.players[i] && name) this.players[i].name = name;
        });
      }

      this.matchScore = { team0: 0, team1: 0 };
      this.kotesCount = { team0: 0, team1: 0 };
      this.currentHandNumber = 0;
      this.roundHistory = [];

      this.resetHandState();
    }

    resetHandState() {
      this.phase = 'WAITING'; // WAITING, DEALING_1, CALLING_TRUMP, DEALING_2, PLAYING, TRICK_END, HAND_END, MATCH_OVER
      this.deck = [];
      this.trumpSuit = null;
      this.hiddenTrumpCard = null;
      this.trumpRevealed = (this.mode !== GAME_MODES.HIDDEN_RUNG);
      this.hiddenTrumpRevealer = null;
      
      this.currentTrick = []; // Array of { playerIndex, card }
      this.trickHistory = []; // All completed tricks in this hand
      this.currentTurn = this.trumpCallerIndex;
      this.tricksWon = { team0: 0, team1: 0 };
      this.playerTricksWon = [0, 0, 0, 0];

      // Double Sar variables
      this.heapTricks = 0; // Number of unresolved tricks in heap
      this.lastTrickWinner = -1; // Player index who won previous trick
      this.heapCards = []; // Cards in center heap for Double Sar

      // Clear player hands
      this.players.forEach(p => p.cards = []);
    }

    startNewHand() {
      this.currentHandNumber++;
      this.resetHandState();
      this.deck = shuffle(createDeck());

      // Phase 1: Deal first 5 cards to each player
      this.phase = 'DEALING_1';
      for (let i = 0; i < 4; i++) {
        const pIndex = (this.dealerIndex + 1 + i) % 4;
        this.players[pIndex].cards = this.deck.splice(0, 5);
        this.sortHand(pIndex);
      }

      this.phase = 'CALLING_TRUMP';
      this.currentTurn = this.trumpCallerIndex;

      return {
        event: 'TRUMP_CALL_REQUIRED',
        callerIndex: this.trumpCallerIndex,
        mode: this.mode
      };
    }

    setTrump(suit, hiddenCardId = null) {
      if (this.phase !== 'CALLING_TRUMP') {
        throw new Error('Not in trump calling phase');
      }

      if (this.mode === GAME_MODES.HIDDEN_RUNG) {
        const callerHand = this.players[this.trumpCallerIndex].cards;
        let chosenCard = null;
        if (hiddenCardId) {
          chosenCard = callerHand.find(c => c.id === hiddenCardId);
        }
        if (!chosenCard) {
          // If suit is provided or fallback, pick first card matching suit
          chosenCard = callerHand.find(c => c.suit === suit) || callerHand[0];
        }
        this.hiddenTrumpCard = chosenCard;
        this.trumpSuit = chosenCard.suit;
        this.trumpRevealed = false;
      } else {
        if (!['S', 'H', 'D', 'C'].includes(suit)) {
          throw new Error('Invalid trump suit: ' + suit);
        }
        this.trumpSuit = suit;
        this.trumpRevealed = true;
      }

      // Phase 2: Deal remaining 8 cards to each player (total 13)
      this.phase = 'DEALING_2';
      for (let i = 0; i < 4; i++) {
        const pIndex = (this.dealerIndex + 1 + i) % 4;
        const extraCards = this.deck.splice(0, 8);
        this.players[pIndex].cards.push(...extraCards);
        this.sortHand(pIndex);
      }

      this.phase = 'PLAYING';
      this.currentTurn = this.trumpCallerIndex; // Trump caller leads first trick

      return {
        event: 'TRUMP_SELECTED',
        trumpSuit: this.trumpRevealed ? this.trumpSuit : null,
        trumpRevealed: this.trumpRevealed,
        trumpCallerIndex: this.trumpCallerIndex,
        nextTurn: this.currentTurn
      };
    }

    revealHiddenTrump(revealerIndex) {
      if (this.mode !== GAME_MODES.HIDDEN_RUNG || this.trumpRevealed) return null;
      this.trumpRevealed = true;
      this.hiddenTrumpRevealer = revealerIndex;
      return {
        event: 'TRUMP_REVEALED',
        trumpSuit: this.trumpSuit,
        hiddenCard: this.hiddenTrumpCard,
        revealerIndex: revealerIndex
      };
    }

    getValidMoves(playerIndex) {
      const player = this.players[playerIndex];
      if (!player || !player.cards || player.cards.length === 0) return [];
      
      if (this.currentTrick.length === 0) {
        // Leading player can play any card
        return [...player.cards];
      }

      const leadCard = this.currentTrick[0].card;
      const leadSuit = leadCard.suit;
      const cardsInSuit = player.cards.filter(c => c.suit === leadSuit);

      if (cardsInSuit.length > 0) {
        // Player MUST follow suit
        return cardsInSuit;
      }

      // Player has void in lead suit: can play any card (trump or off-suit)
      return [...player.cards];
    }

    isValidMove(playerIndex, cardId) {
      if (this.phase !== 'PLAYING') return false;
      if (this.currentTurn !== playerIndex) return false;

      const validCards = this.getValidMoves(playerIndex);
      return validCards.some(c => c.id === cardId);
    }

    playCard(playerIndex, cardId) {
      if (!this.isValidMove(playerIndex, cardId)) {
        throw new Error(`Invalid move by player ${playerIndex} for card ${cardId}`);
      }

      const player = this.players[playerIndex];
      const cardIndex = player.cards.findIndex(c => c.id === cardId);
      const [card] = player.cards.splice(cardIndex, 1);

      let revealEvent = null;

      // In Hidden Rung, check if playing this card triggers trump reveal
      if (this.mode === GAME_MODES.HIDDEN_RUNG && !this.trumpRevealed && this.currentTrick.length > 0) {
        const leadSuit = this.currentTrick[0].card.suit;
        if (card.suit !== leadSuit) {
          // Player cannot follow suit and played off-suit -> Reveal Trump!
          revealEvent = this.revealHiddenTrump(playerIndex);
        }
      }

      const trickEntry = {
        playerIndex,
        card,
        playerName: player.name,
        team: player.team
      };

      this.currentTrick.push(trickEntry);

      // Check if trick is complete (4 cards played)
      if (this.currentTrick.length === 4) {
        this.phase = 'TRICK_END';
        const trickEvaluation = this.evaluateCurrentTrick();
        return {
          event: 'TRICK_FINISHED',
          playedCard: card,
          playerIndex,
          trickCards: [...this.currentTrick],
          trickEvaluation,
          revealEvent
        };
      } else {
        // Advance to next player turn clockwise
        this.currentTurn = (playerIndex + 1) % 4;
        return {
          event: 'CARD_PLAYED',
          playedCard: card,
          playerIndex,
          nextTurn: this.currentTurn,
          revealEvent
        };
      }
    }

    evaluateCurrentTrick() {
      const trickCards = this.currentTrick;
      const leadSuit = trickCards[0].card.suit;
      let winningEntry = trickCards[0];
      let highestValue = winningEntry.card.value;
      let trumpPlayed = (this.trumpRevealed && this.trumpSuit && winningEntry.card.suit === this.trumpSuit);

      for (let i = 1; i < trickCards.length; i++) {
        const entry = trickCards[i];
        const isTrump = (this.trumpRevealed && this.trumpSuit && entry.card.suit === this.trumpSuit);

        if (isTrump) {
          if (!trumpPlayed) {
            trumpPlayed = true;
            winningEntry = entry;
            highestValue = entry.card.value;
          } else if (entry.card.value > highestValue) {
            winningEntry = entry;
            highestValue = entry.card.value;
          }
        } else if (!trumpPlayed && entry.card.suit === leadSuit) {
          if (entry.card.value > highestValue) {
            winningEntry = entry;
            highestValue = entry.card.value;
          }
        }
      }

      const winnerIndex = winningEntry.playerIndex;
      const winnerTeam = this.players[winnerIndex].team;
      const isLastTrick = (this.trickHistory.length === 12); // Trick 13 (0-indexed 12)

      let tricksAwarded = 0;
      let awardedToPlayer = -1;
      let awardedToTeam = -1;
      let doubleSarStatus = null;

      if (this.mode === GAME_MODES.SINGLE_SAR) {
        tricksAwarded = 1;
        awardedToPlayer = winnerIndex;
        awardedToTeam = winnerTeam;
        this.tricksWon[`team${winnerTeam}`] += 1;
        this.playerTricksWon[winnerIndex] += 1;
      } else {
        // Double Sar or Hidden Rung (Double Sar trick resolution)
        this.heapCards.push(...trickCards.map(t => t.card));

        if (isLastTrick) {
          // Last trick: winner gets everything remaining on heap + this trick!
          tricksAwarded = this.heapTricks + 1;
          awardedToPlayer = winnerIndex;
          awardedToTeam = winnerTeam;
          this.tricksWon[`team${winnerTeam}`] += tricksAwarded;
          this.playerTricksWon[winnerIndex] += tricksAwarded;
          doubleSarStatus = {
            collected: true,
            tricksAwarded,
            reason: 'last_trick_sweep',
            heapRemaining: 0
          };
          this.heapTricks = 0;
          this.heapCards = [];
          this.lastTrickWinner = -1;
        } else if (this.lastTrickWinner === winnerIndex) {
          // Same player won 2 consecutive tricks! Collects all heap tricks + this trick!
          tricksAwarded = this.heapTricks + 1;
          awardedToPlayer = winnerIndex;
          awardedToTeam = winnerTeam;
          this.tricksWon[`team${winnerTeam}`] += tricksAwarded;
          this.playerTricksWon[winnerIndex] += tricksAwarded;
          doubleSarStatus = {
            collected: true,
            tricksAwarded,
            reason: 'two_in_a_row',
            heapRemaining: 0
          };
          this.heapTricks = 0;
          this.heapCards = [];
          this.lastTrickWinner = -1;
        } else {
          // New winner, accumulate to heap
          this.heapTricks += 1;
          this.lastTrickWinner = winnerIndex;
          doubleSarStatus = {
            collected: false,
            heapCount: this.heapTricks,
            currentStreakHolder: winnerIndex
          };
        }
      }

      const completedTrick = {
        trickNumber: this.trickHistory.length + 1,
        cards: [...this.currentTrick],
        winnerIndex,
        winningCard: winningEntry.card,
        winnerTeam,
        tricksAwarded,
        awardedToTeam
      };

      this.trickHistory.push(completedTrick);

      return {
        winnerIndex,
        winnerName: this.players[winnerIndex].name,
        winnerTeam,
        winningCard: winningEntry.card,
        tricksAwarded,
        awardedToTeam,
        doubleSarStatus,
        isLastTrick,
        tricksWon: { ...this.tricksWon }
      };
    }

    resolveTrickEnd() {
      const isHandComplete = (this.trickHistory.length === 13);
      const lastTrick = this.trickHistory[this.trickHistory.length - 1];
      const nextLeader = lastTrick.winnerIndex;

      this.currentTrick = [];

      if (isHandComplete) {
        this.phase = 'HAND_END';
        const handResult = this.evaluateHandResult();
        return {
          event: 'HAND_FINISHED',
          handResult
        };
      } else {
        this.phase = 'PLAYING';
        this.currentTurn = nextLeader;
        return {
          event: 'NEW_TRICK_START',
          leaderIndex: nextLeader,
          trickNumber: this.trickHistory.length + 1
        };
      }
    }

    evaluateHandResult() {
      const t0 = this.tricksWon.team0;
      const t1 = this.tricksWon.team1;

      let winningTeam = (t0 > t1) ? 0 : 1;
      let losingTeam = (winningTeam === 0) ? 1 : 0;
      let isKote = false;
      let isBawlaKote = false;
      let pointsScored = 1;

      // Kote check: 7-0 or winning team took 7+ and losing team took 0
      if ((t0 >= 7 && t1 === 0) || (t1 >= 7 && t0 === 0)) {
        isKote = true;
        pointsScored = 2;
      }

      // Bawla Kote check: 13-0 clean sweep
      if (t0 === 13 || t1 === 13) {
        isBawlaKote = true;
        pointsScored = 3;
      }

      this.matchScore[`team${winningTeam}`] += pointsScored;
      if (isKote || isBawlaKote) {
        this.kotesCount[`team${winningTeam}`] += 1;
      }

      // Dealer & Trump caller rotation rules:
      // If Trump caller's team won: Previous dealer's partner deals (winning team keeps trump call)
      // If Dealer's team won: Deal passes to next player clockwise (trump call switches to other team)
      const callerTeam = this.players[this.trumpCallerIndex].team;
      const dealerTeam = this.players[this.dealerIndex].team;

      let nextDealerIndex;
      if (winningTeam === callerTeam) {
        // Winning team keeps trump call advantage -> previous dealer deals again or partner deals
        nextDealerIndex = (this.dealerIndex + 2) % 4; // Dealer's partner
      } else {
        // Dealer's team won -> deal moves clockwise
        nextDealerIndex = (this.dealerIndex + 1) % 4;
      }

      const nextCallerIndex = (nextDealerIndex + 1) % 4;

      // Check Match Winner
      let matchWinner = null;
      if (this.matchLength === 'points') {
        if (this.matchScore.team0 >= this.targetScore) matchWinner = 0;
        else if (this.matchScore.team1 >= this.targetScore) matchWinner = 1;
      } else if (this.matchLength === 'kotes') {
        if (this.kotesCount.team0 >= this.targetScore) matchWinner = 0;
        else if (this.kotesCount.team1 >= this.targetScore) matchWinner = 1;
      } else if (this.matchLength === 'hands') {
        if (this.currentHandNumber >= this.targetScore) {
          matchWinner = (this.matchScore.team0 > this.matchScore.team1) ? 0 : 1;
        }
      }

      if (matchWinner !== null) {
        this.phase = 'MATCH_OVER';
      }

      const handSummary = {
        handNumber: this.currentHandNumber,
        tricksWon: { ...this.tricksWon },
        winningTeam,
        losingTeam,
        isKote,
        isBawlaKote,
        pointsScored,
        matchScore: { ...this.matchScore },
        kotesCount: { ...this.kotesCount },
        matchWinner,
        nextDealerIndex,
        nextCallerIndex
      };

      this.roundHistory.push(handSummary);

      // Setup for next hand if match not over
      this.dealerIndex = nextDealerIndex;
      this.trumpCallerIndex = nextCallerIndex;

      return handSummary;
    }

    sortHand(playerIndex) {
      const suitOrder = { 'S': 0, 'H': 1, 'C': 2, 'D': 3 };
      this.players[playerIndex].cards.sort((a, b) => {
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
          return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return b.value - a.value; // High to low
      });
    }

    getPublicState(viewerIndex = 0) {
      return {
        mode: this.mode,
        phase: this.phase,
        dealerIndex: this.dealerIndex,
        trumpCallerIndex: this.trumpCallerIndex,
        trumpSuit: this.trumpRevealed ? this.trumpSuit : null,
        trumpRevealed: this.trumpRevealed,
        hiddenTrumpCard: (viewerIndex === this.trumpCallerIndex && !this.trumpRevealed) ? this.hiddenTrumpCard : null,
        currentTurn: this.currentTurn,
        currentTrick: this.currentTrick.map(t => ({
          playerIndex: t.playerIndex,
          card: t.card,
          playerName: t.playerName,
          team: t.team
        })),
        tricksWon: { ...this.tricksWon },
        playerTricksWon: [...this.playerTricksWon],
        heapTricks: this.heapTricks,
        lastTrickWinner: this.lastTrickWinner,
        matchScore: { ...this.matchScore },
        kotesCount: { ...this.kotesCount },
        currentHandNumber: this.currentHandNumber,
        targetScore: this.targetScore,
        matchLength: this.matchLength,
        myHand: this.players[viewerIndex] ? this.players[viewerIndex].cards : [],
        validMoves: (this.phase === 'PLAYING' && this.currentTurn === viewerIndex) ? this.getValidMoves(viewerIndex).map(c => c.id) : [],
        players: this.players.map((p, idx) => ({
          id: p.id,
          name: p.name,
          team: p.team,
          isHuman: p.isHuman,
          avatar: p.avatar,
          cardCount: p.cards.length,
          isCaller: idx === this.trumpCallerIndex,
          isDealer: idx === this.dealerIndex,
          isTurn: idx === this.currentTurn
        }))
      };
    }
  }

  return {
    SUITS,
    SUIT_META,
    RANKS,
    RANK_VALUES,
    GAME_MODES,
    createDeck,
    shuffle,
    RangGame
  };
}));
