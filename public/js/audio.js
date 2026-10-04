(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RangAudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.volume = 0.8;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
          this.initialized = true;
        }
      } catch (e) {
        console.warn('Web Audio API not supported', e);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMuted(muted) {
      this.enabled = !muted;
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, val));
    }

    // Realistic card deal sound
    playCardDeal() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, t);

      gain.gain.setValueAtTime(0.3 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
    }

    // Card slap on table
    playCardPlay() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      // Low thud
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

      oscGain.gain.setValueAtTime(0.4 * this.volume, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);

      // Noise slap
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25 * this.volume, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
    }

    // Deck shuffle ripple
    playShuffle() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          this.playCardDeal();
        }, i * 45);
      }
    }

    // Trump declaration fanfare
    playTrumpCall() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // Major arpeggio
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + i * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3 * this.volume, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    }

    // Trick win shimmer
    playTrickWin() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + i * 0.05;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2 * this.volume, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.26);
      });
    }

    // Punjabi Tumbi Folk Riff!
    playTumbi() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const tumbiNotes = [587.33, 659.25, 783.99, 880, 783.99, 880, 1174.66];
      tumbiNotes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.ctx) return;
          const t = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.25 * this.volume, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(t);
          osc.stop(t + 0.15);
        }, idx * 110);
      });
    }

    // Punjabi Seeti / Whistle!
    playWhistle() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.linearRampToValueAtTime(2200, t + 0.12);
      osc.frequency.linearRampToValueAtTime(1800, t + 0.25);
      osc.frequency.linearRampToValueAtTime(2600, t + 0.38);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28 * this.volume, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.43);
    }

    // Punjabi Dhol rhythm celebratory beat for Kote / Victory!
    playDholBeat() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const dholPattern = [
        { type: 'bass', delay: 0 },
        { type: 'treble', delay: 110 },
        { type: 'treble', delay: 220 },
        { type: 'bass', delay: 330 },
        { type: 'bass', delay: 440 },
        { type: 'treble', delay: 550 },
        { type: 'bass', delay: 660 },
        { type: 'treble', delay: 770 },
        { type: 'bass', delay: 880 },
        { type: 'tumbi', delay: 1000 }
      ];

      dholPattern.forEach(item => {
        setTimeout(() => {
          if (!this.ctx) return;
          const t = this.ctx.currentTime;
          if (item.type === 'bass') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(95, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

            gain.gain.setValueAtTime(0.6 * this.volume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.22);
          } else if (item.type === 'treble') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, t);
            osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

            gain.gain.setValueAtTime(0.35 * this.volume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.09);
          } else if (item.type === 'tumbi') {
            this.playTumbi();
          }
        }, item.delay);
      });
    }

    playTurnReminder() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.setValueAtTime(880, t + 0.08);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    playClick() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

      gain.gain.setValueAtTime(0.15 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    }

    playPop() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(750, t + 0.07);

      gain.gain.setValueAtTime(0.2 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  return new SoundEngine();
}));
