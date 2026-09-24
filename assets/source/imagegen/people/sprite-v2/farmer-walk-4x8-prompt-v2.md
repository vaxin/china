# Farmer walk 4×8 — targeted correction v2

Use case: identity-preserve
Asset type: correction of an existing production walk-cycle sprite sheet

Input images:
- Image 1 is the edit target and already has the correct 8×4 grid, character, four direction rows, color, scale and background.
- Image 2 is the canonical identity reference.

Primary request: preserve the complete image and change only the body articulation in columns 5, 6, 7 and 8 of every row so that they form the opposite-leg half of the walk cycle. Do not redesign or regenerate the sheet.

Locked invariants:
- Keep exactly 4 rows × 8 columns and exactly one figure in every existing cell.
- Keep all cell positions, spacing, scale, direction, camera, identity, costume, lighting and pure #ff00ff background unchanged.
- Keep columns 1–4 visually unchanged.
- Keep row directions unchanged: southeast, southwest, northwest, northeast.
- Do not add props, shadows, text, grid lines or scenery.

Required correction in every row:
- Column 5 must be a strong RIGHT-HEEL-FORWARD contact pose, clearly opposite column 1's left-foot contact. Left leg trails; left arm swings forward; right arm swings back.
- Column 6 must settle body weight onto the bent RIGHT leg. Left heel lifts. Pelvis is at the low point.
- Column 7 must keep the RIGHT foot planted under the body while the LEFT leg visibly passes forward off the ground. Arms cross neutral.
- Column 8 must push upward from the RIGHT support leg while LEFT knee advances. Pelvis is at the high point and the pose loops to column 1.

Columns 5–8 must not repeat, trace, copy or preserve the same leg arrangement as columns 1–4. The forward leg, planted foot, trailing leg and counter-swinging arm must visibly reverse. Preserve bottom-center registration; animate limbs without translating figures inside their cells.
