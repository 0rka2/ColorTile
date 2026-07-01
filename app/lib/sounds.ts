import { Howl } from "howler";

export const hoverSound = new Howl({
  src: ["./sfx/tap2.mp3"],
  volume: 0.05,
});

export const swapSound = new Howl({
  src: ["./sfx/swap1.mp3"],
  volume: 0.5,
});