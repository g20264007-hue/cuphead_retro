class CupheadAudioController {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private bgmInterval: any = null;
  private isBgmPlaying: boolean = false;
  private beatCount: number = 0;

  private initContext() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.warn('Web Audio API not supported', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
  }

  public isMuted() {
    return this.muted;
  }

  // Play a procedurally generated upbeat 1930s jazz/ragtime background music loop!
  public startBGM() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || this.isBgmPlaying) return;

    this.isBgmPlaying = true;
    this.beatCount = 0;

    // Fast swing tempo (BPM: 160 -> 150ms per 16th note)
    const stepTime = 0.16;

    // Ragtime bass & melody progression
    // C Major -> A minor -> F Major -> G Major
    const chordProgression = [
      // C Major (Bass: C, Chord: C-E-G)
      { bass: 65.41, chord: [261.63, 329.63, 392.00] },
      // A Minor (Bass: A, Chord: C-E-A)
      { bass: 55.00, chord: [261.63, 329.63, 440.00] },
      // F Major (Bass: F, Chord: C-F-A)
      { bass: 43.65, chord: [261.63, 349.23, 440.00] },
      // G Major (Bass: G, Chord: D-F-G-B)
      { bass: 49.00, chord: [293.66, 349.23, 392.00, 493.88] }
    ];

    const playBgmStep = () => {
      if (!this.ctx || this.muted) return;

      const now = this.ctx.currentTime;
      const progressionIdx = Math.floor(this.beatCount / 4) % chordProgression.length;
      const stepInProg = this.beatCount % 4; // 0, 1, 2, 3
      const { bass, chord } = chordProgression[progressionIdx];

      try {
        // --- BASS LINE (on beat 0 and 2) ---
        if (stepInProg === 0 || stepInProg === 2) {
          const oscBass = this.ctx.createOscillator();
          const gainBass = this.ctx.createGain();
          oscBass.type = 'triangle';
          // alternate octave
          const freq = stepInProg === 2 ? bass * 1.5 : bass;
          oscBass.frequency.setValueAtTime(freq, now);
          gainBass.gain.setValueAtTime(0.2, now);
          gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          oscBass.connect(gainBass);
          gainBass.connect(this.ctx.destination);
          oscBass.start(now);
          oscBass.stop(now + 0.25);
        }

        // --- RAGTIME STRUM CHORD (on beat 1 and 3) ---
        if (stepInProg === 1 || stepInProg === 3) {
          chord.forEach(noteFreq => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(noteFreq, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now);
            osc.stop(now + 0.18);
          });
        }

        // --- RETRO RAGTIME MELODY ACCENT ---
        // Play a random happy major scale pitch on high triangle
        if (this.beatCount % 8 === 2 || this.beatCount % 8 === 5 || this.beatCount % 8 === 7) {
          const melodyNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
          const melodyNote = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
          const oscMelody = this.ctx.createOscillator();
          const gainMelody = this.ctx.createGain();

          oscMelody.type = 'sine';
          oscMelody.frequency.setValueAtTime(melodyNote, now);
          gainMelody.gain.setValueAtTime(0.04, now);
          gainMelody.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          oscMelody.connect(gainMelody);
          gainMelody.connect(this.ctx.destination);
          oscMelody.start(now);
          oscMelody.stop(now + 0.15);
        }

        // --- VINTAGE HI-HAT / SNARE BRUSH (every single beat 0,1,2,3 for swing rhythm) ---
        const oscNoise = this.ctx.createOscillator(); // simulated brush click using brief high sine / noise
        const gainNoise = this.ctx.createGain();
        oscNoise.type = 'triangle';
        oscNoise.frequency.setValueAtTime(8000, now);
        gainNoise.gain.setValueAtTime(stepInProg % 2 === 1 ? 0.02 : 0.01, now);
        gainNoise.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        oscNoise.connect(gainNoise);
        gainNoise.connect(this.ctx.destination);
        oscNoise.start(now);
        oscNoise.stop(now + 0.04);

      } catch (err) {
        console.warn('BGM scheduling error:', err);
      }

      this.beatCount++;
    };

    // run interval every step
    this.bgmInterval = setInterval(playBgmStep, stepTime * 1000);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.isBgmPlaying = false;
  }

  // Cuphead Peashooter laser finger sound
  public playPeashooter() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Cuphead Spread shot finger weapon
  public playSpread() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Air Dash sound: swish puff of wind
  public playDash() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Sprung jump boing!
  public playJump() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Parry success: high delightful vintage bell chime!
  public playParry() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const playChime = (freq: number, start: number, vol: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + 0.35);
    };

    // Lovely classic dual-chime bell
    playChime(880.00, now, 0.2); // A5
    playChime(1109.73, now + 0.05, 0.15); // C#6
  }

  // Dynamic hit damage: tragic honk/trombone sound
  public playHit() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.linearRampToValueAtTime(75, now + 0.25);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(105, now);
    osc2.frequency.linearRampToValueAtTime(72, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  // Psycarrot's Psychic wave emission
  public playPsywave() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, now);
    // crazy wobbly LFO pitch effect
    for (let i = 0; i < 15; i++) {
      const wobbleFreq = i % 2 === 0 ? 350 : 200;
      osc.frequency.setValueAtTime(wobbleFreq, now + (i * 0.02));
    }

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Super move: long charge-up buzzing beam
  public playSuperBeam() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 1.2;

    // Charging sound
    const chargeOsc = this.ctx.createOscillator();
    const chargeGain = this.ctx.createGain();
    chargeOsc.type = 'sine';
    chargeOsc.frequency.setValueAtTime(100, now);
    chargeOsc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    chargeGain.gain.setValueAtTime(0.12, now);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    chargeOsc.connect(chargeGain);
    chargeGain.connect(this.ctx.destination);
    chargeOsc.start(now);
    chargeOsc.stop(now + 0.3);

    // Active mega laser buzz
    const laserOsc = this.ctx.createOscillator();
    const laserGain = this.ctx.createGain();

    laserOsc.type = 'sawtooth';
    laserOsc.frequency.setValueAtTime(180, now + 0.25);
    // add minor jitter
    for (let j = 0; j < 30; j++) {
      const jitterVal = 180 + Math.sin(j * 1.5) * 45;
      laserOsc.frequency.setValueAtTime(jitterVal, now + 0.25 + (j * 0.03));
    }

    laserGain.gain.setValueAtTime(0.22, now + 0.25);
    laserGain.gain.setValueAtTime(0.22, now + duration - 0.1);
    laserGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    laserOsc.connect(laserGain);
    laserGain.connect(this.ctx.destination);

    laserOsc.start(now + 0.25);
    laserOsc.stop(now + duration);
  }

  // Knockout announcement chime!
  public playKnockout() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number, vol: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Mighty vintage horn fanfare!
    playNote(196.00, now, 0.25, 0.2); // G3
    playNote(261.63, now + 0.2, 0.25, 0.2); // C4
    playNote(329.63, now + 0.4, 0.25, 0.2); // E4
    playNote(392.00, now + 0.6, 0.5, 0.25); // G4
  }

  // Sad trombone defeat sound!
  public playDefeat() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const playWah = (freqStart: number, freqEnd: number, start: number, duration: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freqStart, start);
      osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Wah-wah-wah-wahhhh sad brass slide
    playWah(220, 180, now, 0.3);
    playWah(200, 160, now + 0.35, 0.3);
    playWah(180, 140, now + 0.7, 0.3);
    playWah(150, 110, now + 1.05, 0.6);
  }
}

export const cupheadAudio = new CupheadAudioController();
export default cupheadAudio;
