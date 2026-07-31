delete from player_cosmetic_loadout
where slot in ('correct-tile-effect', 'confetti-style');

delete from player_cosmetic_ownership
where item_id in (
  'no-correct-effect',
  'glow-correct-effect',
  'ripple-correct-effect',
  'sparkle-correct-effect',
  'pulse-correct-effect',
  'rainbow-confetti',
  'starburst-confetti'
);
