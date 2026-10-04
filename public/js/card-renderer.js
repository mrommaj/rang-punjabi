(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RangCardRenderer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const SUIT_SVGS = {
    'S': `<svg viewBox="0 0 100 100" class="suit-svg spade"><path d="M50 15 C40 35 20 45 20 65 C20 78 32 85 45 78 C44 85 40 92 35 95 L65 95 C60 92 56 85 55 78 C68 85 80 78 80 65 C80 45 60 35 50 15 Z" fill="#1e293b"/></svg>`,
    'H': `<svg viewBox="0 0 100 100" class="suit-svg heart"><path d="M50 85 C20 60 15 45 15 32 C15 18 26 12 37 12 C44 12 48 16 50 20 C52 16 56 12 63 12 C74 12 85 18 85 32 C85 45 80 60 50 85 Z" fill="#e63946"/></svg>`,
    'D': `<svg viewBox="0 0 100 100" class="suit-svg diamond"><path d="M50 12 L82 50 L50 88 L18 50 Z" fill="#e63946"/></svg>`,
    'C': `<svg viewBox="0 0 100 100" class="suit-svg club"><path d="M50 12 C42 12 36 18 36 26 C36 32 40 36 43 38 C35 37 25 43 25 53 C25 62 33 68 42 66 C44 65 46 64 47 62 C45 72 40 85 35 90 L65 90 C60 85 55 72 53 62 C54 64 56 65 58 66 C67 68 75 62 75 53 C75 43 65 37 57 38 C60 36 64 32 64 26 C64 18 58 12 50 12 Z" fill="#1e293b"/></svg>`
  };

  const COURT_EMOJIS = {
    'K': '👑',
    'Q': '👸',
    'J': '⚔️',
    'A': '🌟'
  };

  class CardRenderer {
    static getSuitSymbol(suit) {
      const map = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
      return map[suit] || '';
    }

    static getSuitColor(suit) {
      return (suit === 'H' || suit === 'D') ? '#e63946' : '#1e293b';
    }

    static renderCard(card, options = {}) {
      if (!card) return '';
      const {
        isPlayable = false,
        isSelected = false,
        isFaceDown = false,
        size = 'normal', // 'small', 'normal', 'large'
        customClass = '',
        showBadge = false,
        badgeText = ''
      } = options;

      if (isFaceDown) {
        return `
          <div class="card card-back ${size} ${customClass}" data-card-id="${card.id || 'hidden'}">
            <div class="card-back-pattern">
              <div class="card-back-mandala"></div>
            </div>
            ${showBadge ? `<span class="card-badge">${badgeText}</span>` : ''}
          </div>
        `;
      }

      const isRed = (card.suit === 'H' || card.suit === 'D');
      const suitSvg = SUIT_SVGS[card.suit] || '';
      const suitChar = this.getSuitSymbol(card.suit);
      const isCourt = ['J', 'Q', 'K', 'A'].includes(card.rank);
      const courtIcon = isCourt ? COURT_EMOJIS[card.rank] : '';

      return `
        <div class="card card-front ${isRed ? 'card-red' : 'card-black'} ${size} ${isPlayable ? 'playable' : 'unplayable'} ${isSelected ? 'selected' : ''} ${customClass}" 
             data-card-id="${card.id}" 
             data-suit="${card.suit}" 
             data-rank="${card.rank}"
             role="button"
             tabindex="${isPlayable ? '0' : '-1'}"
             aria-label="${card.name || `${card.rank} of ${card.suit}`}">
          <div class="card-corner top-left">
            <span class="card-rank">${card.rank}</span>
            <span class="card-mini-suit">${suitChar}</span>
          </div>

          <div class="card-center">
            ${isCourt ? `
              <div class="court-art court-${card.rank}">
                <span class="court-icon">${courtIcon}</span>
                <div class="court-suit">${suitSvg}</div>
              </div>
            ` : `
              <div class="pip-container">
                <div class="main-suit-svg">${suitSvg}</div>
              </div>
            `}
          </div>

          <div class="card-corner bottom-right">
            <span class="card-rank">${card.rank}</span>
            <span class="card-mini-suit">${suitChar}</span>
          </div>
          ${showBadge ? `<span class="card-badge">${badgeText}</span>` : ''}
        </div>
      `;
    }

    static renderTrumpSuitBadge(suit, isRevealed = true) {
      if (!isRevealed || !suit) {
        return `
          <div class="trump-badge hidden-trump" title="Band Rang (Hidden Trump)">
            <span class="trump-icon">🔒</span>
            <span class="trump-label">ਬੰਦ ਰੰਗ (Band Rang)</span>
          </div>
        `;
      }

      const meta = {
        'S': { name: 'Hukum (Spades)', symbol: '♠', class: 'trump-spades' },
        'H': { name: 'Paan (Hearts)', symbol: '♥', class: 'trump-hearts' },
        'D': { name: 'Eent (Diamonds)', symbol: '♦', class: 'trump-diamonds' },
        'C': { name: 'Chidi (Clubs)', symbol: '♣', class: 'trump-clubs' }
      }[suit] || { name: suit, symbol: '', class: '' };

      return `
        <div class="trump-badge ${meta.class}" title="Trump: ${meta.name}">
          <span class="trump-icon">${meta.symbol}</span>
          <span class="trump-label">${meta.name}</span>
        </div>
      `;
    }
  }

  return CardRenderer;
}));
