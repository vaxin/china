# Design QA — 紧凑 RTS 右侧指挥栏

- source visual truth: `/var/folders/xg/5d5x5dp52tb41rx5h8zywvym0000gn/T/codex-clipboard-9a0b87f2-7476-45b9-a41d-6b00628af28c.png`
- rail hierarchy correction source: `/var/folders/xg/5d5x5dp52tb41rx5h8zywvym0000gn/T/codex-clipboard-8d77cdc4-44cb-45ac-84b5-925f541363a9.png`
- category-tab sizing correction source: `/var/folders/xg/5d5x5dp52tb41rx5h8zywvym0000gn/T/codex-clipboard-e6c25054-f32d-493b-9773-2dde77de54b4.png`
- rail-map hierarchy correction source: `/var/folders/xg/5d5x5dp52tb41rx5h8zywvym0000gn/T/codex-clipboard-8f7dd5dd-d15d-4bbb-9cb8-cf300b780c66.png`
- tab-overlap correction source: `/var/folders/xg/5d5x5dp52tb41rx5h8zywvym0000gn/T/codex-clipboard-70c7d5a7-87cb-4804-b119-f3bc29f7bc3d.png`
- crop-picker correction source: `/var/folders/xg/5d5x5dp52tb41rx5h8zywvym0000gn/T/codex-clipboard-57e884e8-6671-426f-a4e8-0e1129084dbf.png`
- implementation screenshot: `/Users/bytedance/.codex/visualizations/2026/07/13/019f5ae0-4ffa-79e2-9d6e-b8f9dc77369d/crop-picker-attached/01-final.png`
- viewport: `1280 × 720`
- state: 默认建造态，民生分类，模拟 1×
- full-view evidence: `/Users/bytedance/.codex/visualizations/2026/07/13/019f5ae0-4ffa-79e2-9d6e-b8f9dc77369d/image-card-fidelity/01-building-image-cards.png` (the supplied target is a focused rail crop and does not define the full viewport)
- focused right-rail comparison evidence: `/Users/bytedance/.codex/visualizations/2026/07/13/019f5ae0-4ffa-79e2-9d6e-b8f9dc77369d/tab-overlap-fix/03-side-by-side.png`
- crop-picker comparison evidence: `/Users/bytedance/.codex/visualizations/2026/07/13/019f5ae0-4ffa-79e2-9d6e-b8f9dc77369d/crop-picker-attached/02-side-by-side.png`
- city-statistics evidence: `/Users/bytedance/.codex/visualizations/2026/07/14/city-stats-panel/01-final.png`
- unified-stat-entry evidence: `/Users/bytedance/.codex/visualizations/2026/07/14/unified-stat-entry/01-city-stats.png`
- command-rail collapse evidence: `/Users/bytedance/.codex/visualizations/2026/07/14/command-rail-collapse/04-expanded-collapsed.png`
- central house detail evidence: `/Users/bytedance/.codex/visualizations/2026/07/13/019f5ae0-4ffa-79e2-9d6e-b8f9dc77369d/right-rail-build/06-central-house-detail.png`

## Findings

- No actionable P0/P1/P2 differences remain for the user-selected direction.
- The generated source placed selected-object properties inside the rail. The user explicitly overrode that decision: building and household properties now open in a centered modal, leaving the rail for commands and compact summaries.
- P3: the reference shows currency costs, but construction currently has no cost model in the simulation protocol. The implementation shows real footprint size instead of inventing non-functional costs.

## Required Fidelity Surfaces

- Fonts and typography: compact Chinese UI uses 8–10px for persistent HUD chrome and 12–14px inside the centered detail surface. The Songti display face remains limited to the city identity; numeric telemetry uses tabular monospace figures. No clipping was observed at 1280×720.
- Spacing and layout rhythm: top rail is 40px; right command rail is 286px. Building cards use a two-column 112px grid and remain limited to four-to-six visible tools per category. The map occupies the entire remaining viewport.
- Colors and visual tokens: near-black ink surfaces, bronze dividers, jade selection and cinnabar warnings match the selected direction. Contrast remains legible against the bright map.
- Image quality and asset fidelity: every building card uses the same transparent PNG asset consumed by the renderer. Twelve runtime building images were inspected and loaded; only Road and Demolish remain library icons because they are tools rather than placeable building art. No emoji, handcrafted SVG, CSS drawing or placeholder imagery is used.
- Copy and content: persistent HUD copy is limited to five resources, three command tabs, two entity shortcuts and the active tool category. Detailed simulation telemetry is available only in the 城情 tab.

## Comparison History

1. Initial implementation evidence: `01-right-rail.png`.
   - P2: all fourteen build tools were visible at once and the three-column cells still read as a tool warehouse.
   - Fix: added 民生/产业/城务 categories, switched the rail to a four-column compact grid and limited each state to four-to-six tools.
   - Post-fix evidence: `03-compact-build-ready.png` and `qa-right-rail-focus.png`.
2. Initial interaction model inherited side-aligned entity panels.
   - P2: property information competed with commands and made the rail feel overloaded.
   - Fix: wrapped residential, population and generic building detail panels in a centered modal layer while preserving map selection and existing data flow.
   - Post-fix evidence: `06-central-house-detail.png`.
3. Initial compact rail evidence: `right-rail-build/07-final-default.png`.
   - P1: building cards had been reduced to linear icons, losing the defining visual content of the selected effect image.
   - Fix: catalogued the repository's runtime building PNGs and rebuilt the catalogue as two-column image cards with availability dots, footprint metadata, active states and functional Q/W/E/R/T/Y shortcuts. Road and Demolish were separated as narrow utility rows.
   - Post-fix evidence: `image-card-fidelity/01-building-image-cards.png`, `02-industry-image-cards.png`, and `qa-building-cards-side-by-side.png`.
4. User-reported rail hierarchy evidence: `codex-clipboard-8d77cdc4-44cb-45ac-84b5-925f541363a9.png`.
   - P1: the heading, icon-led primary tabs, bordered entity counters, helper copy and three category cards all used competing navigation-card treatments. Text baselines and active states did not form a coherent hierarchy.
   - Fix: removed decorative icons from the primary tabs, reduced the heading to one compact identity line, converted 住宅/人口 into an unboxed status strip, and merged 建筑 with 民生/产业/城务 into one directory toolbar. Focus treatment is now an inset bronze indicator rather than a detached white box.
   - Post-fix evidence: `rail-header-polish/09-final.png` and `11-side-by-side-final.png`.
5. User-reported category sizing evidence: `codex-clipboard-e6c25054-f32d-493b-9773-2dde77de54b4.png`.
   - P1: a broad historical `.build-dock button` rule forced category buttons to 40px tall with `justify-content: flex-start`, overriding the intended 21px tab strip. The 7px labels therefore sat at the upper left of oversized hit areas.
   - Fix: isolated the category control with explicit flex geometry: 24px toolbar, 20px buttons, `min-height: 0`, 9px labels, and two-axis centering. The active indicator remains on the lower edge.
   - Post-fix evidence: `tab-sizing-fix/01-final.png`, `02-category-tabs-crop.png`, and `03-side-by-side.png`.
6. User-reported hierarchy collision evidence: `codex-clipboard-8f7dd5dd-d15d-4bbb-9cb8-cf300b780c66.png`.
   - P1: the global 住宅/人口 shortcuts interrupted the sequence between the primary tabs and the active governance content, creating crossed dividers and occupying the intended map region.
   - Fix: restored a data-backed isometric minimap directly below the rail heading. It renders the live 32×32 snapshot, roads, building footprints/types and selected tile. Primary tabs now follow the map, while 住宅/人口 live in a fixed global tray above the status ribbon.
   - Post-fix evidence: `minimap-rail/01-build-tab.png`, `02-governance-tab.png`, and `04-side-by-side.png`.
7. User-reported tab overlap evidence: `codex-clipboard-70c7d5a7-87cb-4804-b119-f3bc29f7bc3d.png`.
   - P1: the primary tab buttons still inherited the historical 40px minimum height while their containing strip was 28px, so the active 建造 surface overflowed into the 民生 category row.
   - Fix: the primary tab strip now clips overflow and owns explicit button geometry: `height: 100%`, `min-height: 0`, centered content and zero inherited gap. The rendered button is 26px inside the strip's two 1px borders, with a 4px gap before the category toolbar and zero intersection.
   - Post-fix evidence: `tab-overlap-fix/01-final.png`, `02-crop.png`, and `03-side-by-side.png`.
8. User-reported crop-picker overflow evidence: `codex-clipboard-57e884e8-6671-426f-a4e8-0e1129084dbf.png`.
   - P1: selecting 农场 opened a 570px-wide floating selector over the map, crossed the rail boundary, obscured buildings and treated a secondary parameter like a modal command surface.
   - First fix regression: moving the control directly below the category tabs eliminated overflow but severed it spatially from the 农场 card that opened it.
   - Final fix: the crop drawer is rendered immediately after the 农场/粮仓 card row. Its top edge is exactly flush with the 112px farm card's bottom edge (`0px` gap), while remaining a static 271×38px row inside the 286px rail with zero overflow. It disappears outside 民生 and reappears in-place when returning.
   - Post-fix evidence: `crop-picker-attached/01-final.png` and `02-side-by-side.png`.
9. User-reported empty 城情 state.
   - P1: the expanded statistics list remained nested inside the 40px top bar. Absolute top/bottom offsets were therefore resolved against the wrong containing block and the right rail covered the result.
   - Fix: moved the statistics list out of the top-bar stacking context and anchored it to the viewport within the rail bounds. All 43 live statistics now render in a 270×478px two-column scrolling panel from `x=1002` to `x=1272` inside the 286px rail.
   - Post-fix evidence: `city-stats-panel/01-final.png`.
10. User-requested unified statistics interaction model.
   - P2: 住宅/人口 were duplicated in a fixed bottom shortcut tray even though both already existed as statistics in 城情, making clickability look like a separate information category.
   - Fix: removed the duplicate tray and its CSS, preserved 住宅/人口 as ordinary 城情 statistics with the same hover/focus affordance used by future drill-down statistics, and made the top 人口 resource keyboard- and pointer-activatable. Reclaimed 32px of rail height for the statistics list.
   - Post-fix evidence: `unified-stat-entry/01-city-stats.png`.
11. User-requested command-rail collapse control.
   - Added a fixed 24×24px copper-line toggle in the rail's upper-right corner. The expanded 286px rail collapses to a 34px edge, the top bar grows from 994px to 1246px, the speed controls follow the active rail edge, and rail-only status/governance/city overlays are hidden while collapsed.
   - Expanding restores the previous 建造/政令/城情 state rather than resetting the player context. Reduced-motion settings disable the 160ms rail transition through the existing global rule.
   - Post-fix evidence: `command-rail-collapse/01-collapsed.png`, `03-expanded-clean.png`, and `04-expanded-collapsed.png`.

## Interaction Verification

- 建造分类 switches between 民生、产业、城务.
- All twelve building image sources resolve from the runtime asset tree; industry cards were visually checked.
- Q/W/E/R/T/Y shortcuts select the visible category's tools while the canvas is focused.
- 指挥栏 switches between 建造、政令、城情.
- 住宅入口 opens the centered list; selecting a house opens its centered property/livelihood detail.
- Pause and 1×/2×/4× controls remain available.
- Browser console checked after a clean reload: no warnings or errors.
- Primary tabs and build-category tabs were clicked in the in-app browser; active state and category content switched correctly.
- The relocated 住宅 shortcut was activated from the lower tray and opened the centered list successfully.
- The live minimap is present above the primary tabs and updates from the simulation snapshot.
- Selecting 农场 reveals a compact in-rail crop strip; crop changes work and the strip disappears in 政令/城情.
- 城情 displays all 43 live statistics inside the right rail and provides vertical scrolling for the remaining rows.
- 住宅/人口 drill-down lives in 城情 without a duplicate bottom tray; the top 人口 resource opens the same population detail panel.
- The right command rail collapses to a 34px edge and restores its active tab when expanded.
- Chromium layout and household-livelihood acceptance tests passed.

## Follow-up Polish

- Make the minimap clickable for camera recentering once the renderer exposes a camera-target command.
- Add production/construction queues to the lower rail when queue state exists in the simulation protocol.

final result: passed
