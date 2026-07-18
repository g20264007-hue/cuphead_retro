class ChessAudioController {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

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
  }

  public isMuted() {
    return this.muted;
  }

  public playMove() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playCapture() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    // Classic capture noise-pop sound
    const duration = 0.12;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + duration);
    osc2.stop(this.ctx.currentTime + duration);
  }

  public playCheck() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    // Urgent high double chime
    const now = this.ctx.currentTime;
    const playChime = (freq: number, start: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + 0.25);
    };

    playChime(523.25, now); // C5
    playChime(659.25, now + 0.08); // E5
  }

  public playVictory() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Uplifting major arpeggio
    playNote(261.63, now, 0.15); // C4
    playNote(329.63, now + 0.12, 0.15); // E4
    playNote(392.00, now + 0.24, 0.15); // G4
    playNote(523.25, now + 0.36, 0.4); // C5
  }

  public playDefeat() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Diminished sad chord
    playNote(392.00, now, 0.2); // G4
    playNote(349.23, now + 0.15, 0.2); // F4
    playNote(311.13, now + 0.3, 0.2); // Eb4
    playNote(246.94, now + 0.45, 0.4); // B3
  }
}

export const chessAudio = new ChessAudioController();
