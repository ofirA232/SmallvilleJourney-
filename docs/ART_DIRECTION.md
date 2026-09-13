# A small place worth caring about

## Direction

Keep the miniature spherical world, with a warm rural palette, clear human silhouettes and recognizable landmarks. Clark wears a red overshirt over blue, with dark swept hair; Lana has long dark hair and an ivory blouse; Lex has a clean bald silhouette and dark tailoring. Jonathan's work shirt, Martha's auburn hair, Chloe's camera and Whitney's varsity sleeves help distinguish the supporting cast. These are original stylized models, not scans or actor likeness meshes.

The revised rigs use tapered clothing, smoother faces, articulated elbows and knees, restrained body sway and a slight running lean. Geometry is combined within joints to keep animation pivots while reducing draw calls. Nearby characters turn toward Clark. His speed subtly widens the follow camera; reduced motion disables that effect.

Original vector busts replace dialogue initials and share the 3D wardrobe palette. Power encounters use a compact side panel on desktop and a lower panel on touch screens, keeping Clark and the physical action visible. The crate lifts and vehicles strain in response to the player's input; canceling restores their original positions.

Kent Farm uses yellow clapboard, a porch, white fencing, a red barn with a gambrel roof and loft opening, and a small named mailbox. The mansion uses a square crenellated tower, steep roofs, pale masonry and ivy. School signs identify Smallville High and the Crows, and the investigation board now has its own readable title. The cemetery has an angel silhouette, following the visual motif in the supplied pilot transcript.

## References actually inspected

The local images below are research references in `docs/references/`. The runtime does not load them; its models, signage and interface artwork are generated locally.

| Reference | Source | Applied observation |
| --- | --- | --- |
| [Early-series Clark, Lana and Lex](references/cast.jpg) | [TopKool gallery](https://www.topkool.com/fr/series-tv/smallville) | Hair silhouettes, red/blue versus ivory versus dark wardrobe, distinct proportions. This is promotional imagery, not a claim that one outfit is worn throughout the pilot. |
| [Kent Farm exterior](references/kent-farm.jpg) | [Fortaleza de la Soledad location visit](https://www.fortalezadelasoledad.com/component/content/article?id=620%3Avisitando-smallville-osea-vancouver) | Yellow farmhouse, red vertical barn siding, dark roof, pale fence. |
| [Hatley Castle facade](references/hatley-castle.jpg) | [MovieMaps architectural reference](https://moviemaps.org/images/9kz) | Square tower, roof lines, chimneys and ivy. The reference frame is from another production at the same building, not a pilot screencap. |

The castle's own [Hatley Park filming page](https://www.hatleypark.ca/media-film) confirms its use as Lex Luthor's home in Smallville. The [Kent Farm restoration page](https://www.thekentfarm.com/restoration) provides additional present-day context for the farmhouse, barns and surrounding landscape.

## Architectural reference pass — September 8, 2026

The farm and school now use dedicated geometry in `src/world/architecture.ts`. This is a stylized, compressed interpretation of the series locations within the existing spherical-world footprints, not a measured reproduction or a claim of pilot-shot accuracy.

| Reference | Provenance and interpretation | Applied geometry |
| --- | --- | --- |
| [Kent barn still](references/kent-barn-series.jpg) | [Apple TV: Rush](https://tv.apple.com/us/episode/rush/umc.cmc.2ips26yk34zhvyt4kgjwbjj40?showId=umc.cmc.3oxo773g0bf8tylw00pccrhqs), official episode image. | Steep roof with flared eaves, red board-and-batten siding on all walls, recessed hayloft opening, sliding doors with small windows, roof seams, two ventilating cupolas and a weathervane. The long farm wing is omitted to preserve the yard and silo clearance. |
| [Templeton location photograph](references/smallville-high-series.jpg) | [Location visit](https://www.fortalezadelasoledad.com/component/content/article?id=620%3Avisitando-smallville-osea-vancouver). The photograph's sign reads **Truman**, so it is an architectural location reference, not a Smallville frame. [MovieMaps](https://moviemaps.org/locations/3c) identifies Templeton as an exterior/interior Smallville High location. | Three-storey pale facade, burgundy window bays, tall multipane sash windows, projecting central entrance and stepped parapet. Game signage says Smallville High. |

The pilot also used [Vancouver Technical Secondary](https://moviemaps.org/locations/3b); this model deliberately follows the recognizable Templeton facade used later in the series rather than mixing both facades. Roofs and entrance proportions are compressed for readability in the little-planet camera.

The farmhouse gains side clapboards, framed side windows, corner trim, foundation and porch balusters. The silo gains a ladder. These remain exterior scenery; no new building interiors are playable. Existing quest anchors, collision footprints and imported actors are preserved. Repeated parts share materials and are statically batched. Reference photographs stay in documentation and are not loaded by the game.

For unobstructed geometry review, run `node docs/references/inspect-architecture.mjs` with Vite on port 5187. It writes barn and school views to `test-results/architecture-models/`.

## Kansas countryside pass — September 9, 2026

The little planet now suggests an agricultural Kansas town: broad shallow prairie swells outside level building pads, more open land, a farm windbreak, corn plots, a three-cow pasture with trough, equipment shed, hay bales and a short feed/hardware/general-store frontage behind the school. These new shops and farm details are invented environmental dressing, not claimed series locations. Cows are static stylized models in grazing/standing poses, not simulated livestock. Shops have no playable interiors.

Landscape references: [Kansas Geological Survey: surface features](https://www.kgs.ku.edu/General/surface_features.html) describes flat and gently rolling plains and agricultural river valleys; [Kansas State: windbreak management](https://www.kansasforests.org/forestry/windbreakmanagement.html) describes shelter plantings around fields and livestock. The treatment evokes farm country rather than reproducing one surveyed Kansas town. The spherical format and compact distances are retained.

Farm and cornfield fences use individually grounded posts and short rails along the curved surface, leaving paths and story points open. They remain scenery rather than continuous physical barriers. Cows, the shed and shops have collision footprints. Crop stems, leaves and tassels use instancing; static props use the existing material batching.

Loeb Bridge gains a surfaced lane, painted markings, steel truss profile, concrete pier caps and end hazard markers. The river no longer has path geometry drawn across open water. Metropolis remains locked in the pilot, but now has spaced blocks, a street grid, side/rear windows, roof details and a more legible Daily Planet tower. Streets use separate surface offsets to prevent flickering over the city ground.

`node docs/references/inspect-world.mjs` (Vite on 5187) writes review-only farm, pasture, bridge, city, town and cornfield renders under `test-results/kansas-review/`.

## User-supplied Clark model

Clark now uses the user's stylized dark-haired character with tan jacket, plaid shirt, and blue jeans. The red/blue procedural character remains the loading fallback; other actors and SVG portraits retain their prior art. The imported clothing therefore intentionally differs from the previous Clark palette and portrait.

The supplied unrigged OBJ has been reduced from 990,606 to 24,000 triangles and exported as a 2.1 MB animated GLB, with 17 joints and seven basic motion clips. The rig uses fitted geometric skin weights and still needs artistic refinement around shoulders/hips for close-ups; facial expression and individual fingers are not animated. The original mesh and texture are preserved separately.

Open `/model-review.html` for the motion lab, skeleton inspection, and original comparison. See [model preparation notes](model-review/README.md) for reproducible steps and limitations.

## User-supplied Lana model

Follow-up appearance correction: Lana, Chloe and Martha share the 0.90 NPC scale. Clark's previous bright iris ring is removed; the existing dark eye area is tinted a subdued navy blue using its original shading, without generating a separate pupil ring. The revised appearance was inspected in the motion lab and the build passed.

Latest requested adjustments: Lana's game scale is now 0.90 instead of 0.95 (about 5.3% shorter), also reflected in her motion-lab view. Clark's irises use a blue material tint confined to the eye region, retaining dark pupils and the source face atlas. This rendering adjustment is applied in gameplay and the motion lab; the original GLB/OBJ texture remains unchanged. The procedural Clark fallback also uses blue eyes.

Lana now uses the supplied long-haired character in a pale blue blouse and black trousers. The 24,000-triangle model has a provisional humanoid rig and keeps the original texture. Its green pendant is separated so episode rules can hide it after the early school encounter. Her existing SVG dialogue portrait remains in use. See [Lana integration and limitations](lana-review/README.md) and `/model-review.html?actor=lana`.

## User-supplied Lex model

Lex now uses the supplied bald character in a black jacket and trousers with a light shirt. The 24,000-triangle, 1.77 MB GLB replaces his world NPC and carried rescue model, with an independent provisional skeleton for each instance. His existing dialogue portrait is retained. See [Lex preparation notes](lex-review/README.md) and `/model-review.html?actor=lex`.

## Pilot story interpretation

Follow-up: two additional evidence encounters reuse the investigation controls. At `lex-thanks`, players connect the impact, damaged railing and Clark's lack of injuries; at `spaceship`, they compare the craft with Jonathan's account of 1989 and distinguish known facts from unanswered origins. Wrong answers provide hints, leaving the quest unfinished; the conclusion leads into the original conversation. The interface uses a general investigation heading rather than referring every encounter to Chloe.

At the scarecrow, Clark's rendered pose is aligned with the post, raised 0.34 units above ground and faces the field entrance. Wrist ties align with his provisional rig's outstretched hands; his feet no longer rest on the ground. Lex is hidden at the `call-for-help` checkpoint. Explicitly calling waits three seconds, then Lex walks in over 3.5 seconds before dialogue begins. Focus loss and menus pause the approach. Reloading an unfinished rescue hides Lex and restores the suspended pose; completing the dialogue releases Clark into the existing race checkpoint. Both this scene and the bridge use active wall time rather than capped physics catch-up time, preventing slow rendering from stretching scene duration.

September 9 update: Lana's active necklace now has proximity-driven green emission and a small additive halo attached to the chest bone. A green local light, ground tint and non-flashing screen-edge tint communicate Clark's kryptonite exposure. Effects use the same world kryptonite sources and 2.5-unit range as weakness; inactive/removed necklaces do not glow. Materials are cloned per character to avoid tinting other model instances.

The pilot now has 26 objectives. `bridge-moment` explicitly asks Clark to stand on Loeb Bridge and reflect. Completing its original dialogue starts a 4.4-second scripted vehicle impact and fall into the river, then saves the existing `car-door` rescue checkpoint. It supports skipping and pauses on focus loss/menus. An interrupted scene reloads before the bridge interaction; completed scenes do not replay. Pre-update saves at the rescue or later are migrated without resetting progress. The scene uses the existing car and Clark assets, not a physics vehicle simulation.

The user supplied the pilot transcript. It informs the missed school bus, Lana's necklace, the car rescue, the storm cellar, the cemetery conversation, the returned gift, Jeremy's twelve-year coma and electrical awakening, the scarecrow sequence, the school confrontation, and the quiet ending. Dialogue remains newly written and compressed for play. The game still uses its existing compact shared locations and its maintenance-truck staging for the final encounter.

The opening school day is now described as an ordinary school day, not Clark's first-ever day there. The craft is described and staged at the storm cellar beside the barn. Three evidence cards distinguish the yearbook, hospital record and meteor report, so players establish the connection themselves. Optional field notes are original character observations rather than additional claims about events in the episode.

## Playable changes

- A gentle first strength challenge teaches holding and releasing within a readable gold window.
- The missed bus creates an early use for superspeed and a repeatable checkpoint.
- The underwater rescue, sprinkler valve and truck have distinct control sequences.
- The Wall of Weird requires three deductions; a wrong connection gives a hint and leaves the objective unfinished.
- Six small discoveries invite detours and persist in Clark's journal without advancing the main plot.
- Rustling steps, water sounds and a wind layer respond to movement. All audio is synthesized locally and remains optional.

The intended experience alternates movement, concentration, investigation and quiet observation. Reading-paced play length and physical phone ergonomics still require user playtesting.
