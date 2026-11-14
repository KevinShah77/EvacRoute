/**
 * Voice Assistant service using browser Web Speech API (SpeechSynthesis)
 * and Web Audio API for Google Maps style emergency navigation guidance.
 */

class VoiceAssistantService {
  constructor() {
    this.synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.audioContext = null;
    this.currentUtterance = null;
    this.language = 'en-US';
  }

  isSupported() {
    return !!this.synthesis;
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  /**
   * Plays a distinct emergency alert tone using Web Audio API synthesis.
   */
  playAlertChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35); // A4

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Speaks navigation instruction.
   * Priority=true immediately cancels any active speech to avoid overlapping.
   */
  speak(text, { priority = false, onStart, onEnd, onError } = {}) {
    if (!this.synthesis || !text) {
      if (onEnd) onEnd();
      return;
    }

    if (priority || this.synthesis.speaking) {
      this.cancel();
    }

    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = this.language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick a natural English voice if available
    const voices = this.synthesis.getVoices() || [];
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPaused = false;
      this.currentUtterance = utterance;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
      if (onError) onError(err);
    };

    try {
      this.synthesis.speak(utterance);
    } catch (e) {
      if (onError) onError(e);
    }
  }

  cancel() {
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
    }
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentUtterance = null;
  }

  pause() {
    if (this.synthesis && this.isSpeaking && !this.isPaused) {
      try {
        this.synthesis.pause();
        this.isPaused = true;
      } catch (e) {}
    }
  }

  resume() {
    if (this.synthesis && this.isPaused) {
      try {
        this.synthesis.resume();
        this.isPaused = false;
      } catch (e) {}
    }
  }

  /**
   * Generates natural Google Maps style instruction for a route step.
   */
  formatStepSpokenText(step, index, totalSteps) {
    if (!step) return '';

    if (totalSteps === 1 && step.distance === 0) {
      return `You are already at the exit: ${step.to_label}. You are in a safe area.`;
    }

    let spoken = step.instruction;

    // Format numbers nicely for speech
    spoken = spoken.replace(/(\d+)m/g, '$1 meters');

    if (step.type === 'stairs_down') {
      spoken = `Take the stairs down to ${step.to_floor}. Proceed carefully.`;
    } else if (step.type === 'stairs_up') {
      spoken = `Take the stairs up to ${step.to_floor}.`;
    } else if (step.type === 'elevator') {
      spoken = `Take the accessible elevator to ${step.to_floor}.`;
    } else if (step.type === 'exit') {
      spoken = `You have reached the exit door: ${step.to_label}. Exit the building now.`;
    } else if (step.type === 'assembly') {
      spoken = `Proceed outdoors to ${step.to_label}. Check in with safety officers.`;
    }

    if (step.hazard) {
      spoken += ` Caution: ${step.hazard_label || 'hazard'} reported nearby. Keep moving forward.`;
    }

    return spoken;
  }
}

export const voiceAssistant = new VoiceAssistantService();
