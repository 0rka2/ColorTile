// Previous file-based SFX kept here for quick comparison:
// import { Howl } from "howler";
//
// export const hoverSound = new Howl({
//   src: ["./sfx/tap2.mp3"],
//   volume: 0.05,
// });
//
// export const swapSound = new Howl({
//   src: ["./sfx/swap1.mp3"],
//   volume: 0.5,
// });

type OscillatorWave = OscillatorType;

type SoundStep = {
  delay: number;
  duration: number;
  frequency: number;
  gain: number;
  type?: OscillatorWave;
};

type SoundEffect = {
  play: () => void;
};

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;
let soundEnabled = true;

const SOUND_ENABLED_STORAGE_KEY = "colortile-sound-enabled";

export function getSoundEnabled() {
  if (typeof window === "undefined") {
    return soundEnabled;
  }

  let storedValue: string | null = null;

  try {
    storedValue = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
  } catch {
    return soundEnabled;
  }

  if (storedValue !== null) {
    soundEnabled = storedValue === "true";
  }

  return soundEnabled;
}

export function setSoundEnabled(nextSoundEnabled: boolean) {
  soundEnabled = nextSoundEnabled;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(nextSoundEnabled));
  } catch {}
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as AudioWindow;
  const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  audioContext ??= new AudioContextClass();
  return audioContext;
}

function playSteps(steps: SoundStep[]) {
  if (!getSoundEnabled()) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const now = context.currentTime;

  steps.forEach(({ delay, duration, frequency, gain, type = "sine" }) => {
    const startTime = now + delay;
    const endTime = startTime + duration;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
  });
}

function createSoundEffect(steps: SoundStep[]): SoundEffect {
  return {
    play: () => playSteps(steps),
  };
}

export const hoverSound = createSoundEffect([
  { delay: 0, duration: 0.05, frequency: 500, gain: 0.015, type: "sine" },
]);

export const buttonClickSound = createSoundEffect([
  { delay: 0, duration: 0.1, frequency: 360, gain: 0.04, type: "sine" } // A soft, quick E4 tap
]);

export const swapSound = createSoundEffect([
  { delay: 0, duration: 0.05, frequency: 320, gain: 0.035, type: "sine" },
  { delay: 0.07, duration: 0.1, frequency: 420, gain: 0.025, type: "sine" },
]);

export const timeUpSound = createSoundEffect([
  { delay: 0, duration: 0.22, frequency: 220, gain: 0.045, type: "sine" },
  { delay: 0.18, duration: 0.26, frequency: 174, gain: 0.04, type: "sine" },
]);

export const boardCompleteSound = createSoundEffect([
  { delay: 0, duration: 0.5, frequency: 523, gain: 0.03, type: "triangle" },  // C5
  { delay: 0.1, duration: 0.5, frequency: 659, gain: 0.03, type: "triangle" },  // E5
  { delay: 0.2, duration: 0.5, frequency: 784, gain: 0.03, type: "triangle" },  // G5
  { delay: 0.35, duration: 0.5, frequency: 1047, gain: 0.04, type: "triangle" }, // C6 (High finish!)
]);
