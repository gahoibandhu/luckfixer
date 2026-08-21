# Ram Shalaka Spin Wheel — Implementation Notes

New: `components/RamShalakaWheel.jsx`, wired into `app/ram-shalaka/page.jsx`
as a toggleable mode alongside the original tap-grid (never replaced —
both call the exact same `getAnswerForCell()` from `lib/ram-shalaka.js`,
so there's one source of truth for verses regardless of how the cell
was picked).

## How it works

- 225 real grid letters, split **sequentially** across 4 concentric
  rings (ring1 outer = flat index 0-56, ring2 = 57-112, ring3 =
  113-168, ring4 innermost = 169-224) so each letter stays legible.
- All 4 rings spin continuously at different speeds/directions and
  their displayed letters shuffle randomly (slot-machine feel) —
  **but only ring1 (outermost)'s final position ever determines the
  answer.** Rings 2-4 are real data but purely decorative motion.
- Pressing STOP reveals every ring's true letters immediately, then
  snaps ring1 so the landed letter sits exactly under the pin.

## The one real bug found during prototyping, and the fix

An early version computed "which cell is under the pin" with a
closed-form formula (`segAngle`, index arithmetic) derived by hand
from the CSS `transform` chain. It was measurably wrong — a dedicated
diagnostic build (rendering a green dot at the pin's true screen
position and comparing it to each cell's real `getBoundingClientRect()`
center) showed the formula picking a cell **204px away** from the
actual nearest letter.

Fix: stopped trying to invert the transform math by hand entirely.
`handleStop()` in `RamShalakaWheel.jsx` now:
1. Freezes the ring's current rotation (no transition yet).
2. Measures every ring1 cell's real screen position and finds
   whichever one is physically nearest the pin (`getBoundingClientRect`
   + `Math.hypot`) — this is the *ground truth* landed cell.
3. Computes the exact angle (via `Math.atan2`) between that cell and
   the pin, both from real measured coordinates, and rotates the ring
   by precisely that delta so the cell snaps exactly onto the pin.

This was re-verified with the same diagnostic method after the fix —
consistently <5px off, effectively exact — before being built into
the production component.

## Why the trace always starts from the residue's canonical cell

The algorithm has only 9 possible answers (225 ÷ 9 = 25 cells per
residue class). Any of the 25 cells in a residue class produces the
same verified verse, but only when you trace "every 9th letter"
starting from that residue's **canonical member** (flat index =
residue itself, i.e. one of positions 0-8) do you reconstruct the
verse's actual printed word order. Tracing from an arbitrary landed
cell within the same class produces a valid but *rotated* sequence
that wouldn't match the printed verse word-for-word. So:
`landedIndex` decides *which* answer (via `% 9`), but the animated
trace always walks `residue, residue+9, residue+18, ...` regardless
of the specific cell landed on — verified against all 9 residues with
a standalone script before shipping (every residue's canonical trace
exactly reconstructs the first ~16 characters of its verified verse).

## What's intentionally NOT done here

- No changes to `lib/ram-shalaka.js` itself — the wheel is purely a
  new UI on top of the existing, already-verified data/logic.
- No sound files/assets — the "tick" is a synthesized Web Audio
  oscillator (very low gain, ~0.006, soft roulette-click character,
  not a beep), so there's nothing to host or license.
- No persistence of which mode (wheel/grid) the person prefers —
  defaults to wheel each visit. Easy to add a localStorage/DB
  preference later if wanted, deliberately left out to keep this
  change scoped to what was asked.
