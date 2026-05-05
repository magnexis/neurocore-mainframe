# Animations

These animation notes are for local project understanding only. They are not release criteria or community contribution requirements.

The animation approach is controlled, cinematic, and performance-conscious.

## Boot

The boot screen uses typed terminal lines, a progress bar, a subtle grid, and a logo emergence. Once complete, the main shell unlocks with blur and scale settling into the interface.

## Ambient Effects

- Matrix rain is canvas-rendered at capped device pixel ratio.
- Cursor glow uses one radial gradient updated with smoothing.
- Right-rail and SIGNAL scopes use canvas waveforms.
- Module transitions use a short glitch motion.

## Performance Mode

Performance mode reduces matrix rain intensity, slows ambient motion, and pauses decorative cell animation. Functional interactions remain available.

## Accessibility

The app respects `prefers-reduced-motion` by shortening transitions and typing delays.
