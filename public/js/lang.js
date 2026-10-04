(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RangLang = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const TRANSLATIONS = {
    en: {
      gameTitle: 'Rang Punjabi (Court Piece)',
      tagline: 'The Ultimate South Asian Trick-Taking Card Game',
      singleSar: 'Single Sar (Classic)',
      doubleSar: 'Double Sar (2-in-a-Row)',
      hiddenRung: 'Hidden Rung (Band Rang)',
      playSolo: 'Play Solo vs Bots',
      playOnline: 'Play Online with Friends',
      createRoom: 'Create Room',
      joinRoom: 'Join Room',
      roomCode: 'Room Code',
      enterRoomCode: 'Enter 4-Letter Code',
      yourName: 'Your Name',
      chooseAvatar: 'Choose Avatar',
      gameMode: 'Game Mode',
      difficulty: 'Bot Difficulty',
      easy: 'Shaukeen (Easy)',
      medium: 'Chalaak (Medium)',
      pro: 'Punjabi Pro (Ustaad)',
      targetScore: 'Target Score',
      points: 'Points',
      kotes: 'Kotes',
      hands: 'Hands',
      dealFirst5: 'Dealing first 5 cards...',
      chooseTrumpPrompt: 'Choose the Trump Suit (ਰੰਗ ਚੁਣੋ)',
      hiddenTrumpPrompt: 'Select a card from your 5 cards as Hidden Trump',
      trumpIs: 'Trump Suit is',
      hiddenTrumpActive: 'Hidden Trump is active! Plays reveal when someone revokes.',
      yourTurn: 'Your Turn! Play a card.',
      waitingFor: "Waiting for {name}'s move...",
      trickWonBy: '{name} won the trick with {card}!',
      koteAlert: '🔥 KOTE! {team} won 7-0 without letting opponents win a trick!',
      bawlaKoteAlert: '👑 BAWLA KOTE! {team} swept all 13 tricks!',
      handWonBy: '{team} won the hand ({t0} vs {t1} tricks)!',
      matchWonBy: '🏆 {team} won the Match!',
      rulesTitle: 'How to Play Rang (Court Piece)',
      settingsTitle: 'Game Settings',
      soundFx: 'Sound Effects',
      botSpeed: 'Bot Play Speed',
      fast: 'Fast (0.5s)',
      normal: 'Normal (1s)',
      relaxed: 'Relaxed (1.8s)',
      language: 'Language',
      sortCards: 'Sort Hand',
      bySuit: 'By Suit',
      byRank: 'By Rank',
      chat: 'Chat & Reactions',
      send: 'Send',
      inviteFriends: 'Invite Friends',
      copyLink: 'Copy Invite Link',
      linkCopied: 'Invite link copied to clipboard!',
      fillBots: 'Fill empty seats with bots',
      startGame: 'Start Game',
      waitingHost: 'Waiting for room host to start the game...',
      leaveRoom: 'Leave Room',
      rematch: 'Play Again',
      teamYou: 'Team You & Partner',
      teamOpponents: 'Opponents Team',
      tricks: 'Tricks',
      score: 'Score',
      heap: 'Double Sar Heap'
    },
    pa: {
      gameTitle: 'ਰੰਗ ਪੰਜਾਬੀ (ਕੋਰਟ ਪੀਸ)',
      tagline: 'ਪੰਜਾਬ ਦੀ ਸਭ ਤੋਂ ਮਸ਼ਹੂਰ ਤਾਸ਼ ਦੀ ਖੇਡ',
      singleSar: 'ਸਿੰਗਲ ਸਰ (ਕਲਾਸਿਕ)',
      doubleSar: 'ਡਬਲ ਸਰ (ਦੋ ਸਰਾਂ ਇਕੱਠੀਆਂ)',
      hiddenRung: 'ਬੰਦ ਰੰਗ (ਗੁਪਤ ਹੁਕਮ)',
      playSolo: 'ਕੱਲੇ ਖੇਡੋ (ਬੋਟਸ ਨਾਲ)',
      playOnline: 'ਦੋਸਤਾਂ ਨਾਲ ਆਨਲਾਈਨ ਖੇਡੋ',
      createRoom: 'ਕਮਰਾ ਬਣਾਓ',
      joinRoom: 'ਕਮਰੇ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਵੋ',
      roomCode: 'ਕਮਰੇ ਦਾ ਕੋਡ',
      enterRoomCode: '4-ਅੱਖਰੀ ਕੋਡ ਦਰਜ ਕਰੋ',
      yourName: 'ਤੁਹਾਡਾ ਨਾਮ',
      chooseAvatar: 'ਅਵਤਾਰ ਚੁਣੋ',
      gameMode: 'ਖੇਡ ਦਾ ਤਰੀਕਾ',
      difficulty: 'ਬੋਟ ਦਾ ਪੱਧਰ',
      easy: 'ਸ਼ੌਕੀਨ (ਆਸਾਨ)',
      medium: 'ਚਲਾਕ (ਦਰਮਿਆਨਾ)',
      pro: 'ਪੰਜਾਬੀ ਪ੍ਰੋ (ਉਸਤਾਦ)',
      targetScore: 'ਟਾਰਗੇਟ ਸਕੋਰ',
      points: 'ਅੰਕ',
      kotes: 'ਕੋਟ',
      hands: 'ਹੱਥ',
      dealFirst5: 'ਪਹਿਲੇ 5 ਪੱਤੇ ਵੰਡੇ ਜਾ ਰਹੇ ਹਨ...',
      chooseTrumpPrompt: 'ਰੰਗ ਚੁਣੋ (ਹੁਕਮ ਲਗਾਓ)',
      hiddenTrumpPrompt: 'ਆਪਣੇ 5 ਪੱਤਿਆਂ ਵਿੱਚੋਂ ਬੰਦ ਰੰਗ ਚੁਣੋ',
      trumpIs: 'ਹੁਕਮ / ਰੰਗ ਹੈ',
      hiddenTrumpActive: 'ਬੰਦ ਰੰਗ ਚਾਲੂ ਹੈ! ਕੱਟਣ ਤੇ ਖੁੱਲ੍ਹੇਗਾ।',
      yourTurn: 'ਤੁਹਾਡੀ ਵਾਰੀ! ਪੱਤਾ ਸੁੱਟੋ।',
      waitingFor: "{name} ਦੀ ਵਾਰੀ ਦਾ ਇੰਤਜ਼ਾਰ ਹੈ...",
      trickWonBy: '{name} ਨੇ {card} ਨਾਲ ਸਰ ਜਿੱਤੀ!',
      koteAlert: '🔥 ਕੋਟ! {team} ਨੇ 7-0 ਨਾਲ ਕੋਟ ਮਾਰ ਦਿੱਤਾ!',
      bawlaKoteAlert: '👑 ਬਾਵਲਾ ਕੋਟ! {team} ਨੇ ਸਾਰੀਆਂ 13 ਸਰਾਂ ਜਿੱਤ ਲਈਆਂ!',
      handWonBy: '{team} ਨੇ ਹੱਥ ਜਿੱਤਿਆ ({t0} ਬਨਾਮ {t1})!',
      matchWonBy: '🏆 {team} ਨੇ ਮੈਚ ਜਿੱਤ ਲਿਆ!',
      rulesTitle: 'ਰੰਗ ਖੇਡਣ ਦੇ ਨਿਯਮ',
      settingsTitle: 'ਖੇਡ ਸੈਟਿੰਗਾਂ',
      soundFx: 'ਆਵਾਜ਼ (ਸਾਊਂਡ)',
      botSpeed: 'ਚਾਲ ਦੀ ਗਤੀ',
      fast: 'ਤੇਜ਼ (0.5s)',
      normal: 'ਆਮ (1s)',
      relaxed: 'ਆਰਾਮ ਨਾਲ (1.8s)',
      language: 'ਭਾਸ਼ਾ (Language)',
      sortCards: 'ਪੱਤੇ ਤਰਤੀਬ ਕਰੋ',
      bySuit: 'ਰੰਗ ਮੁਤਾਬਕ',
      byRank: 'ਵੱਡੇ ਤੋਂ ਛੋਟੇ',
      chat: 'ਗੱਲਬਾਤ ਅਤੇ ਨਾਅਰੇ',
      send: 'ਭੇਜੋ',
      inviteFriends: 'ਦੋਸਤਾਂ ਨੂੰ ਸੱਦਾ ਦਿਓ',
      copyLink: 'ਲਿੰਕ ਕਾਪੀ ਕਰੋ',
      linkCopied: 'ਸੱਦਾ ਲਿੰਕ ਕਾਪੀ ਹੋ ਗਿਆ!',
      fillBots: 'ਖਾਲੀ ਸੀਟਾਂ ਤੇ ਬੋਟ ਬਿਠਾਓ',
      startGame: 'ਖੇਡ ਸ਼ੁਰੂ ਕਰੋ',
      waitingHost: 'ਹੋਸਟ ਵਲੋਂ ਸ਼ੁਰੂ ਕਰਨ ਦੀ ਉਡੀਕ...',
      leaveRoom: 'ਕਮਰਾ ਛੱਡੋ',
      rematch: 'ਦੁਬਾਰਾ ਖੇਡੋ',
      teamYou: 'ਤੁਹਾਡੀ ਟੀਮ',
      teamOpponents: 'ਵਿਰੋਧੀ ਟੀਮ',
      tricks: 'ਸਰਾਂ (Tricks)',
      score: 'ਅੰਕ (Score)',
      heap: 'ਡਬਲ ਸਰ ਦਾ ਢੇਰ'
    }
  };

  const DESI_REACTIONS = [
    { text: 'Chak De Phatte! 🔥', pa: 'ਚੱਕ ਦੇ ਫੱਟੇ! 🔥', audio: 'fanfare' },
    { text: 'Kote maar ditta! 👑', pa: 'ਕੋਟ ਮਾਰ ਤਾ! 👑', audio: 'dhol' },
    { text: 'Tumbi Riff! 🪕', pa: 'ਤੂੰਬੀ ਖੜਕਾਓ! 🪕', audio: 'tumbi' },
    { text: 'Seeti Maaro! 😙🎶', pa: 'ਸੀਟੀ ਮਾਰੋ! 😙🎶', audio: 'whistle' },
    { text: 'Shabash Partner! 👏', pa: 'ਸ਼ਾਬਾਸ਼ ਸਾਥੀ! 👏', audio: 'cheer' },
    { text: 'Balle Balle! 💃', pa: 'ਬੱਲੇ ਬੱਲੇ! 💃', audio: 'dhol' },
    { text: 'Oye Hoye Hoye! 😲', pa: 'ਓਏ ਹੋਏ ਹੋਏ! 😲', audio: 'pop' },
    { text: 'Wah ji Wah! ✨', pa: 'ਵਾਹ ਜੀ ਵਾਹ! ✨', audio: 'cheer' },
    { text: 'Rang dasso ji! 🃏', pa: 'ਰੰਗ ਦੱਸੋ ਜੀ! 🃏', audio: 'pop' },
    { text: 'Tash patto! 🎴', pa: 'ਤਾਸ਼ ਪੱਟੋ! 🎴', audio: 'pop' }
  ];

  class LangManager {
    constructor() {
      this.currentLang = 'en';
    }

    setLang(lang) {
      if (TRANSLATIONS[lang]) {
        this.currentLang = lang;
      }
    }

    t(key, params = {}) {
      const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
      let text = dict[key] || TRANSLATIONS.en[key] || key;
      Object.keys(params).forEach(p => {
        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
      });
      return text;
    }

    getReactions() {
      return DESI_REACTIONS.map(r => ({
        ...r,
        label: this.currentLang === 'pa' ? r.pa : r.text
      }));
    }
  }

  return new LangManager();
}));
