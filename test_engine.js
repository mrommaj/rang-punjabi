// Test basic Rang deck and trick evaluation logic
const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r, value: RANK_VALUES[r], id: `${r}_${s}` });
    }
  }
  return deck;
}

function evaluateTrick(trickCards, trumpSuit, trumpRevealed = true) {
  // trickCards: array of { playerIndex: 0..3, card: { suit, rank, value } }
  const leadSuit = trickCards[0].card.suit;
  let winningEntry = trickCards[0];
  let highestValue = winningEntry.card.value;
  let trumpPlayed = (trumpRevealed && trumpSuit && winningEntry.card.suit === trumpSuit);

  for (let i = 1; i < trickCards.length; i++) {
    const entry = trickCards[i];
    const isTrump = (trumpRevealed && trumpSuit && entry.card.suit === trumpSuit);

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
  return winningEntry;
}

console.log("Deck size:", createDeck().length);
const trick1 = [
  { playerIndex: 0, card: { suit: 'H', rank: 'K', value: 13 } },
  { playerIndex: 1, card: { suit: 'H', rank: 'A', value: 14 } },
  { playerIndex: 2, card: { suit: 'S', rank: '2', value: 2 } }, // Spades is Trump
  { playerIndex: 3, card: { suit: 'H', rank: '10', value: 10 } }
];
const win1 = evaluateTrick(trick1, 'S', true);
console.log("Trick 1 Winner (Trump 2 of Spades beats Ace of Hearts): Player", win1.playerIndex);

const win2 = evaluateTrick(trick1, 'D', true); // Diamonds is Trump
console.log("Trick 1 Winner with Diamonds trump (Ace of Hearts wins): Player", win2.playerIndex);
