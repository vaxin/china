# Farmer walk 4×8 — pose-guide render v3

Use case: sketch-to-render + identity-preserve
Asset type: production 2D game character walk-cycle sprite sheet

Input images:
- Image 1 is the exact 4×8 pose-and-registration guide. Every colored mannequin is a mandatory body pose. Orange and blue identify opposite limbs only; they are not output colors.
- Image 2 is the canonical farmer identity and costume reference.
- Image 3 is the approved visual scale, painterly finish and four-direction sprite-sheet reference, but its repeated gait poses must not be copied.

Primary request: replace all 32 guide mannequins in Image 1 with the exact same farmer from Image 2, rendered in the style and scale of Image 3. Preserve every guide pose, grid position, direction, foot placement and shared ground registration.

Hard constraints:
- Exactly 4 rows × 8 columns, one complete farmer per cell, exactly 32 figures.
- Follow Image 1 limb geometry cell by cell; do not invent a different pose and do not repeat poses.
- Orange guide limbs become the same anatomical side consistently across all frames; blue guide limbs become the opposite side. Remove all guide colors and lines from the final render.
- Row directions are southeast, southwest, northwest and northeast. First two rows are front three-quarter; last two are back three-quarter.
- Same identity, costume, proportions, scale, orthographic camera and bottom-center anchor in every cell.
- No props. Flat pure #ff00ff background. No text, grid, shadow, scenery or watermark.
