(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RangAI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class RangAI {
    constructor(difficulty = 'medium') {
      this.difficulty = difficulty; // 'easy', 'medium', 'pro'
    }

    setDifficulty(diff) {
      if (['easy', 'medium', 'pro'].includes(diff)) {
        this.difficulty = diff;
      }
    }

    // Choose Trump Suit from initial 5 cards
    chooseTrump(cards, mode = 'single_sar') {
      if (!cards || cards.length === 0) return 'S';

      const suitScores = { 'S': 0, 'H': 0, 'D': 0, 'C': 0 };
      const suitCounts = { 'S': 0, 'H': 0, 'D': 0, 'C': 0 };

      cards.forEach(card => {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
        let points = card.value; // A=14, K=13, Q=12, J=11...
        if (card.rank === 'A') points += 10;
        if (card.rank === 'K') points += 6;
        if (card.rank === 'Q') points += 3;
        suitScores[card.suit] = (suitScores[card.suit] || 0) + points;
      });

      // Factor in suit length heavily (3 cards of suit is great trump)
      let bestSuit = 'S';
      let maxScore = -1;

      for (const suit of ['S', 'H', 'D', 'C']) {
        const lengthBonus = (suitCounts[suit] || 0) * 15;
        const total = (suitScores[suit] || 0) + lengthBonus;
        if (total > maxScore) {
          maxScore = total;
          bestSuit = suit;
        }
      }

      // If hidden rung mode, pick best card of that suit
      let chosenCard = cards.find(c => c.suit === bestSuit) || cards[0];

      return {
        suit: bestSuit,
        cardId: chosenCard.id
      };
    }

    // Decide which card to play
    chooseCardToPlay(gameState, playerIndex) {
      const validMoves = gameState.getValidMoves ? gameState.getValidMoves(playerIndex) : [];
      if (!validMoves || validMoves.length === 0) return null;
      if (validMoves.length === 1) return validMoves[0];

      if (this.difficulty === 'easy') {
        // Easy: 60% random, 40% simple heuristic
        if (Math.random() < 0.6) {
          return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
      }

      const currentTrick = gameState.currentTrick || [];
      const trumpSuit = gameState.trumpRevealed ? gameState.trumpSuit : null;
      const partnerIndex = (playerIndex + 2) % 4;
      const isLead = (currentTrick.length === 0);
      const isDoubleSar = (gameState.mode === 'double_sar' || gameState.mode === 'hidden_rung');
      const lastWinner = gameState.lastTrickWinner;
      const heapTricks = gameState.heapTricks || 0;

      // 1. LEAD PLAY
      if (isLead) {
        return this.chooseLeadCard(validMoves, gameState, playerIndex, partnerIndex, isDoubleSar, lastWinner, heapTricks, trumpSuit);
      }

      // 2. FOLLOWING OR REVOKING PLAY
      const leadCard = currentTrick[0].card;
      const leadSuit = leadCard.suit;
      const hasLeadSuit = validMoves.some(c => c.suit === leadSuit);

      // Determine who is currently winning the trick
      const currentWinner = this.getCurrentTrickWinner(currentTrick, trumpSuit);
      const isPartnerWinning = (currentWinner.playerIndex === partnerIndex);
      const isOpponentWinning = !isPartnerWinning;

      if (hasLeadSuit) {
        // Player MUST follow suit
        const suitCards = validMoves.filter(c => c.suit === leadSuit).sort((a, b) => b.value - a.value);

        if (isPartnerWinning) {
          // If partner is currently winning
          // If bot is last player (4th), partner has won -> play lowest
          if (currentTrick.length === 3) {
            return suitCards[suitCards.length - 1]; // Lowest
          }
          // If partner played Ace and we are 2nd/3rd -> play lowest
          if (currentWinner.winningCard.value === 14) {
            return suitCards[suitCards.length - 1];
          }
          // If partner card is moderately high, play lowest
          if (currentWinner.winningCard.value >= 12) {
            return suitCards[suitCards.length - 1];
          }
        }

        // If opponent winning or partner's card might be beaten
        // Try to beat current winning card with lowest winning card
        const canBeatWinning = suitCards.filter(c => c.value > currentWinner.winningCard.value);
        if (canBeatWinning.length > 0 && currentWinner.winningCard.suit === leadSuit) {
          // Play the lowest card that still beats the opponent
          return canBeatWinning[canBeatWinning.length - 1];
        }

        // Cannot beat winning card or trick already trumped -> play lowest card in suit
        return suitCards[suitCards.length - 1];
      } else {
        // REVOKE / OUT OF SUIT (Can play Trump to cut, or discard off-suit)
        const trumpCards = trumpSuit ? validMoves.filter(c => c.suit === trumpSuit).sort((a, b) => a.value - b.value) : [];
        const nonTrumpCards = validMoves.filter(c => c.suit !== trumpSuit).sort((a, b) => a.value - b.value);

        if (isPartnerWinning) {
          // Partner already winning: DO NOT Trump! Discard lowest non-trump card
          if (nonTrumpCards.length > 0) {
            return nonTrumpCards[0]; // Lowest off-suit
          }
          // If only trumps left, play lowest
          return trumpCards[0];
        }

        // Opponent is winning
        if (trumpCards.length > 0) {
          // Check if trick was already trumped by opponent
          if (currentWinner.isTrump) {
            // Must beat opponent's trump
            const higherTrumps = trumpCards.filter(c => c.value > currentWinner.winningCard.value);
            if (higherTrumps.length > 0) {
              // Cut with lowest higher trump!
              return higherTrumps[0];
            } else {
              // Cannot beat opponent trump -> discard lowest non-trump
              if (nonTrumpCards.length > 0) return nonTrumpCards[0];
              return trumpCards[0];
            }
          } else {
            // Trick not trumped yet, and opponent has a high lead card (10, J, Q, K, A) or Double Sar has high heap
            if (currentWinner.winningCard.value >= 10 || heapTricks >= 1 || isDoubleSar) {
              // Cut with lowest trump!
              return trumpCards[0];
            }
          }
        }

        // If no trump or decided not to cut: discard lowest non-trump card
        if (nonTrumpCards.length > 0) {
          return nonTrumpCards[0];
        }
        return validMoves[0];
      }
    }

    chooseLeadCard(validMoves, gameState, playerIndex, partnerIndex, isDoubleSar, lastWinner, heapTricks, trumpSuit) {
      // 1. In Double Sar: If bot won previous trick, try to win this trick to collect the heap!
      if (isDoubleSar && lastWinner === playerIndex) {
        // Look for boss cards (Aces) in any suit
        const aces = validMoves.filter(c => c.rank === 'A');
        if (aces.length > 0) {
          // Prefer Trump Ace if held, otherwise any Ace
          const trumpAce = aces.find(c => c.suit === trumpSuit);
          if (trumpAce) return trumpAce;
          return aces[0];
        }
        // Look for highest Trump
        if (trumpSuit) {
          const trumps = validMoves.filter(c => c.suit === trumpSuit).sort((a, b) => b.value - a.value);
          if (trumps.length > 0 && trumps[0].value >= 12) {
            return trumps[0];
          }
        }
      }

      // 2. Play boss Aces in non-trump suits to secure tricks
      const nonTrumpAces = validMoves.filter(c => c.rank === 'A' && c.suit !== trumpSuit);
      if (nonTrumpAces.length > 0) {
        return nonTrumpAces[Math.floor(Math.random() * nonTrumpAces.length)];
      }

      // 3. Pro mode: lead trump if we have many trumps (pulling trumps)
      if (this.difficulty === 'pro' && trumpSuit) {
        const trumps = validMoves.filter(c => c.suit === trumpSuit).sort((a, b) => b.value - a.value);
        if (trumps.length >= 4 && trumps[0].value >= 13) {
          return trumps[0]; // Lead high trump to drain opponents
        }
      }

      // 4. Lead King if Ace already played or lead low card from strong suit
      const nonTrumpKings = validMoves.filter(c => c.rank === 'K' && c.suit !== trumpSuit);
      if (nonTrumpKings.length > 0 && Math.random() < 0.6) {
        return nonTrumpKings[0];
      }

      // 5. Default lead: pick lowest card of longest suit
      const suitCounts = {};
      validMoves.forEach(c => {
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
      });

      // Sort suits by length (excluding trump if possible)
      const sortedSuits = Object.keys(suitCounts).sort((a, b) => {
        if (a === trumpSuit) return 1;
        if (b === trumpSuit) return -1;
        return suitCounts[b] - suitCounts[a];
      });

      const bestLeadSuit = sortedSuits[0];
      const cardsOfSuit = validMoves.filter(c => c.suit === bestLeadSuit).sort((a, b) => a.value - b.value);
      return cardsOfSuit[0] || validMoves[0];
    }

    getCurrentTrickWinner(currentTrick, trumpSuit) {
      if (currentTrick.length === 0) return null;
      const leadSuit = currentTrick[0].card.suit;
      let winningEntry = currentTrick[0];
      let highestValue = winningEntry.card.value;
      let trumpPlayed = (trumpSuit && winningEntry.card.suit === trumpSuit);

      for (let i = 1; i < currentTrick.length; i++) {
        const entry = currentTrick[i];
        const isTrump = (trumpSuit && entry.card.suit === trumpSuit);

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

      return {
        playerIndex: winningEntry.playerIndex,
        winningCard: winningEntry.card,
        isTrump: trumpPlayed
      };
    }
  }

  return RangAI;
}));
