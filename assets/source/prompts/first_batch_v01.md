# First batch prompts v01

生成方式：Codex 内置 Image Gen。  
风格参考：`../anchors/style_anchor_city_v01.png`。  
用途：设计评审与后续 3D 建模/绑定/材质输入，不直接进入运行时。

## residential_construction_reference_v01

```text
Use case: stylized-concept
Asset type: game building construction design reference sheet
Input images: Image 1 is the approved city style anchor; use only its art direction, palette, camera and material language
Primary request: show exactly five sequential states of one modest 2×2-tile ancient Chinese residential homestead: staked empty plot, compacted-earth foundation, timber frame with bamboo scaffold, roof-sealing stage, completed small courtyard house
Style/medium: original stylized hand-painted miniature realism; believable 3D geometry with mineral-pigment color and soft rough materials
Composition/framing: five isolated miniature states in one clean horizontal row, equal footprint and scale, identical fixed 45-degree orthographic three-quarter camera, full objects visible with generous separation
Lighting/mood: neutral soft late-morning studio light matching the anchor
Color palette: loess ochre, warm gray plaster, blue-gray tiles, dark brown timber, muted gray-green, tiny restrained vermilion accents only
Constraints: exact same house identity and orientation across all five stages; progress must be structurally logical; no ground scene except small matching footprint pads; no people; no text; no labels; no arrows; no border; no logo; no watermark
Avoid: direct imitation of any existing game asset, palace architecture, fantasy, photorealism, low-poly blocks, toy plastic, muddy sepia, dramatic perspective, cropped roofs, duplicated stages
```

## villager_anchor_v01

```text
Use case: stylized-concept
Asset type: game character model-sheet anchor for 3D modeling
Input images: Image 1 is the approved city style anchor; use its art direction, palette and population scale
Primary request: design one original adult migrant villager arriving to build a home, shown as exactly four consistent views: front, left profile, back, and front three-quarter
Subject: practical dusty blue-gray cross-collar tunic, brown trousers and cloth shoes, simple tied hair, weathered cloth shoulder bundle; lean sturdy body; calm determined expression; no armor and no status symbols
Style/medium: stylized hand-painted miniature realism for a browser city-builder, about 5 to 5.5 heads tall, readable silhouette, slightly enlarged hands but not chibi
Composition/framing: four full-body standing views in one clean horizontal row, equal height and baseline, neutral relaxed pose, orthographic character sheet, generous spacing
Lighting/mood: soft neutral studio light; colors and roughness matching the style anchor
Constraints: exact same person, face, hair, clothing construction, bundle and colors in all views; hands and feet fully visible; no text; no labels; no weapons; no extra props; no logo; no watermark
Avoid: direct imitation of existing game characters, oversized head, anime, palace costume, glossy plastic, photorealism, extra limbs, cropped feet, inconsistent garments
```

## villager_action_reference_v01

```text
Use case: identity-preserve
Asset type: game character animation key-pose reference sheet
Input images: Image 1 is the approved city style anchor; Image 2 is the approved villager anchor and controls identity, outfit, body proportions and palette
Primary request: show the exact same villager in exactly four full-body key poses: relaxed waiting with shoulder bundle, purposeful walking contact pose, carrying one short timber beam in both hands, overhead-to-downward mallet strike for house construction
Style/medium: the same stylized hand-painted miniature realism as the input anchors
Composition/framing: four isolated poses in one clean horizontal row, equal character scale and feet baseline, clear negative space between poses
Lighting/mood: identical soft neutral studio light in every pose
Constraints: change only pose and approved action prop; preserve face, hair, outfit, body proportions and colors; hands grip props plausibly; action silhouettes readable at game mid-distance; full body visible; no text; no labels; no ground scene; no logo; no watermark
Avoid: identity drift, costume changes, extra tools, extra people, extra limbs, motion blur, anime, chibi, photorealism, cropped hands or feet
```

## material_palette_reference_v01

```text
Use case: stylized-concept
Asset type: game material and color reference board for 3D texturing
Input images: Image 1 is the approved city style anchor; derive only its original material language and palette
Primary request: create exactly five large isolated square material swatches: patched warm-gray lime plaster, uneven blue-gray clay roof tiles, worn dark-brown structural timber, compacted loess rammed earth, faded restrained vermilion woven market cloth
Style/medium: hand-painted stylized realism with mineral-pigment variation and believable roughness, suitable as Substance Painter and Blender texture reference
Composition/framing: clean 5-column contact sheet, one flat front-facing square sample per material, equal size and spacing, no perspective scene
Lighting/mood: neutral diffuse lighting with no directional cast shadow
Constraints: swatches visually separated, controlled variation, no objects, no scenery, no text, no labels, no border, no logo, no watermark; edges do not need to be seamless in this reference board
Avoid: glossy plastic, metallic surfaces, strong highlights, photographic dirt noise, muddy monochrome, fantasy ornament, direct imitation of existing game textures
```
