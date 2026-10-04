const { RangGame, GAME_MODES } = require('./public/js/game-engine.js');

console.log("--- Testing Single Sar ---");
const game = new RangGame({ mode: GAME_MODES.SINGLE_SAR, targetScore: 7 });
game.startNewHand();
console.log("Phase after start:", game.phase, "Caller:", game.trumpCallerIndex);

// Trump caller selects Spades
game.setTrump('S');
console.log("Phase after trump:", game.phase, "Trump:", game.trumpSuit);
console.log("Player 0 cards:", game.players[0].cards.length);

// Simulate 13 tricks
for (let t = 0; t < 13; t++) {
  for (let step = 0; step < 4; step++) {
    const currentTurn = game.currentTurn;
    const validMoves = game.getValidMoves(currentTurn);
    if (validMoves.length === 0) throw new Error("No valid moves for player " + currentTurn);
    // Pick the first valid card
    const cardToPlay = validMoves[0];
    const res = game.playCard(currentTurn, cardToPlay.id);
    if (res.event === 'TRICK_FINISHED') {
      const summary = res.trickEvaluation;
      // console.log(`Trick ${t+1} won by Player ${summary.winnerIndex} (${summary.winningCard.rank}${summary.winningCard.suit})`);
      const endRes = game.resolveTrickEnd();
      if (endRes.event === 'HAND_FINISHED') {
        console.log("Hand finished!", endRes.handResult);
      }
    }
  }
}

console.log("--- Testing Double Sar ---");
const doubleGame = new RangGame({ mode: GAME_MODES.DOUBLE_SAR, targetScore: 7 });
doubleGame.startNewHand();
doubleGame.setTrump('H');
for (let t = 0; t < 13; t++) {
  for (let step = 0; step < 4; step++) {
    const currentTurn = doubleGame.currentTurn;
    const validMoves = doubleGame.getValidMoves(currentTurn);
    const cardToPlay = validMoves[0];
    const res = doubleGame.playCard(currentTurn, cardToPlay.id);
    if (res.event === 'TRICK_FINISHED') {
      const endRes = doubleGame.resolveTrickEnd();
      if (endRes.event === 'HAND_FINISHED') {
        console.log("Double Sar Hand finished!", endRes.handResult);
      }
    }
  }
}

console.log("--- Testing Hidden Rung ---");
const hiddenGame = new RangGame({ mode: GAME_MODES.HIDDEN_RUNG, targetScore: 7 });
hiddenGame.startNewHand();
const firstCard = hiddenGame.players[hiddenGame.trumpCallerIndex].cards[0];
hiddenGame.setTrump(firstCard.suit, firstCard.id);
console.log("Hidden Trump set. Revealed?", hiddenGame.trumpRevealed);
for (let t = 0; t < 13; t++) {
  for (let step = 0; step < 4; step++) {
    const currentTurn = hiddenGame.currentTurn;
    const validMoves = hiddenGame.getValidMoves(currentTurn);
    const cardToPlay = validMoves[0];
    const res = hiddenGame.playCard(currentTurn, cardToPlay.id);
    if (res.revealEvent) {
      console.log("Trump was revealed during play!", res.revealEvent.trumpSuit);
    }
    if (res.event === 'TRICK_FINISHED') {
      const endRes = hiddenGame.resolveTrickEnd();
      if (endRes.event === 'HAND_FINISHED') {
        console.log("Hidden Rung Hand finished!", endRes.handResult);
      }
    }
  }
}

console.log("All engine tests passed successfully!");
