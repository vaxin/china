# Farmer walk 4×8 — prompt v1

Use case: identity-preserve
Asset type: production 2D game character walk-cycle sprite sheet

Input images:
- Image 1 is the edit target: an exact 8-column × 4-row registration template containing 32 copies of the farmer. Preserve its canvas, cell positions, character scale, cell spacing and flat magenta background.
- Image 2 is the canonical identity reference: preserve the same adult ancient Chinese farmer, facial identity, topknot, faded blue-grey wrap jacket, tan trousers, cloth belt, straw shoes, body proportions, hand-painted rendering and worn agricultural clothing.

Primary request:
Edit Image 1 into ONE complete production sprite sheet. Replace the repeated pose with 32 distinct but identity-consistent walk poses. Keep exactly 8 columns and exactly 4 rows. Do not move, add, remove, merge, split or reorder any cell.

Grid contract:
- Exactly 32 full-body figures: one and only one figure inside every 256×256 cell.
- Overall 2:1 landscape canvas; 8 equal columns × 4 equal rows.
- Each figure remains centered on the template registration point and uses the same ground baseline, apparent height and scale.
- Generous empty separation between figures; no body part or tool crosses a cell boundary.
- No grid lines, labels, numbers, captions, arrows, borders or UI.

Direction rows, interpreted relative to the image canvas:
- Row 1: southeast-facing walk, moving visually toward the lower-right. Clear front three-quarter view.
- Row 2: southwest-facing walk, moving visually toward the lower-left. Clear front three-quarter view.
- Row 3: northwest-facing walk, moving visually toward the upper-left. Clear back three-quarter view; face mostly hidden.
- Row 4: northeast-facing walk, moving visually toward the upper-right. Clear back three-quarter view; face mostly hidden.
- Facing direction stays constant across each row. A row is a walk cycle, not a turn-around sequence.
- The four rows must be visibly different directions. Do not mirror asymmetric anatomy or clothing incorrectly.

Eight columns are eight chronological phases of the same seamless two-step walk cycle, repeated independently in every row:
1. LEFT CONTACT — left heel reaches forward; right leg trails; right arm forward; left arm back.
2. LEFT DOWN — weight settles onto bent left leg; right heel lifts; pelvis at lowest point.
3. LEFT PASS — planted left foot under body; right leg passes forward; arms cross neutral.
4. LEFT UP — left support leg pushes upward; right knee forward; pelvis at highest point.
5. RIGHT CONTACT — exact opposite gait phase: right heel forward; left leg trails; left arm forward.
6. RIGHT DOWN — weight settles onto bent right leg; left heel lifts; pelvis at lowest point.
7. RIGHT PASS — planted right foot under body; left leg passes forward; arms cross neutral.
8. RIGHT UP — right support leg pushes upward; left knee forward; pelvis at highest point; loops naturally to frame 1.

Animation requirements:
- All eight poses in every row must be clearly distinguishable at thumbnail size.
- Legs genuinely alternate; arms counter-swing opposite the legs.
- Contact feet appear planted; passing feet visibly lift off the ground.
- Subtle natural pelvis rise/fall, torso counter-rotation, sleeve and jacket-hem follow-through.
- Column 8 transitions smoothly back to column 1.
- No repeated pose, frozen legs, skating stance, walking-stick pose or eight near-identical copies.
- This is an in-place animation reference: keep root registration fixed; animate the body rather than translating it across cells.

Character and prop requirements:
- The farmer carries no hoe, sack, basket, weapon or other prop while walking.
- Preserve the same face, hairstyle, costume construction, palette and physique in all 32 cells.
- Hands, feet, head and clothing remain complete and anatomically coherent.

Style and camera:
- Hand-painted historical Chinese strategy-game character sprite, crisp readable silhouette, restrained texture, warm natural colors.
- Orthographic isometric three-quarter game camera with no perspective drift.
- Identical neutral upper-left lighting in every cell.
- No photorealistic background, no scenery, no floor plane and no cast shadow.

Background:
- Preserve a perfectly flat, uniform pure #ff00ff chroma-key background in every cell.
- No gradients, texture, glow, reflection, contact shadow or magenta color inside the farmer.

Before output, count and verify: 4 rows, 8 columns, exactly 32 complete figures, four fixed directions, eight distinct gait phases per row, consistent identity/scale/baseline, no text or borders.
