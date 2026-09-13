# Development status

## Playable scope

The pilot is implemented as 25 explicit objectives across eight chapters, from the meteor opening to the barn ending. It includes navigation on the sphere, keyboard and touch controls, superspeed, jumping, swimming, contextual strength, kryptonite weakness, conversations, the Lex rescue, the cornfield sequence, the timed school return, checkpoint retry, local saves, and replay.

Metropolis remains a visible, locked future location. Episode two is a coming-soon card.

## Latest development work

Lex's supplied model is integrated on the riverbank, at the mansion, in the cornfield and as the carried rescue character. Its 1.77 MB GLB has 24,000 triangles and a provisional 17-joint rig. The source is preserved and model failure retains the procedural Lex. See [Lex model preparation](lex-review/README.md).

September 8: the supplied Lana model is integrated at her existing story locations. The prepared GLB is 1.86 MB, with 24,000 triangles and a provisional 17-joint rig. The green pendant follows episode state, including reloads. The model loader now caches Clark and Lana separately and preserves either procedural fallback if a download fails. See [Lana preparation](lana-review/README.md).

The user's custom Clark model is now loaded in gameplay: 24,000 triangles, 17 joints, seven basic clips, approximately 2.1 MB. Motion selection follows movement, jumping, swimming, strength/carrying and restraint. Loading failure preserves the procedural character. The responsive `/model-review.html` motion lab supports pose inspection, skeleton overlay and comparison with the untouched original. See [model preparation](model-review/README.md). The rig remains provisional, particularly at shoulder/hip joints; physical-device performance is not yet measured.

The current indie-focused revision adds held-input strength encounters, an evidence board with three deductions, a school-bus deadline, six persistent field notes, redesigned articulated characters, reference-informed farm/mansion scenery, readable world signage, nearby character attention, a speed camera response, and procedural wind/footstep audio. See [Art direction and references](ART_DIRECTION.md) for the source images and design choices.

- Episode definitions now own introductions, journal metadata, transition positions, completion messages, ending text, and world rules.
- Actor placements, story props, lighting, kryptonite zones, carrying, restraint, and available powers resolve from stable objective IDs. Checkpoint reloads reconstruct the same state without replaying events.
- An independent episode fixture verifies that the renderer and story system work with different objective IDs. Each episode gets its own save key; the pilot retains its existing format and key.
- The school countdown measures active time independently of frame rate and pauses for menus, conversations, hidden tabs, and focus loss.
- Conversations and menus suspend unnecessary 3D rendering while HTML controls and status continue updating.
- Lex appears on the riverbank after Clark carries him ashore, avoiding a duplicate visible character during the rescue.
- The game preview uses port 5187; browser tests own port 5188 so other local projects can continue using port 5173.

## Validation and artifacts

Story scene expansion, September 9: added the explicit bridge reflection/impact objective (26 pilot objectives), proximity-driven necklace/ground/edge glow, and migration for previous pilot saves. Added evidence encounters at Lex's riverbank conversation and the spacecraft, plus a suspended scarecrow pose with wrist ties and a delayed walking arrival for Lex after calling for help. Final production build and 43 unit tests pass. All 12 focused desktop/mobile scene and investigation scenarios passed (`test-results/story-scenes-final`), including scene pause, reload, skipping, proximity cleanup, incorrect answers and explicit completion. An earlier full-playthrough test exposed a bridge scene timeout under slow rendering; scene timing now uses active wall time separately from capped movement simulation. Final results confirmed September 10: all eight regression scenarios passed in 5.9 minutes (`test-results/expanded-pilot-final`), including both complete 26-objective journeys, saved endings, mid-rescue reload, race retry and investigation checks. Together with the 12 focused scenarios, 20 desktop/emulated-mobile browser cases passed. No failed cases remain in these runs.

Kansas world pass, September 9: broad prairie contours outside level landmark pads, open vegetation and farm windbreak, grounded fences, instanced leafy corn, three static cows with a trough, equipment shed, hay and small-town storefronts. Reworked bridge surfacing/trusses and Metropolis street blocks/Daily Planet. Build and 42 unit tests pass. Four browser scenarios passed: surface/UI and complete 25-objective pilot on both desktop and emulated mobile, including rescue reload and saved ending (`test-results/kansas-final`, 14.8 minutes). An earlier run was intentionally stopped while correcting visual layering. A final foliage-only cleanup removes a sports-field tree and corn intersecting hay; build/unit checks were repeated after that cleanup. Review renders are in `test-results/kansas-review`; gameplay screenshots were also inspected. Physical-phone performance remains unmeasured. New fences are grounded visual scenery, not continuous collision barriers; livestock is static.

Architecture pass, September 8: rebuilt Kent barn and Smallville High from documented series/location references; detailed farmhouse sides, porch and silo. Production build and all 42 unit tests pass, including navigation clearance and checkpoint reconstruction. Four focused browser scenarios passed: farm intro/dialogue/journal and school Lana interaction/checkpoint reload on desktop and emulated mobile. Farm/school gameplay and isolated building renders were visually inspected. The full pilot was not replayed for this scenery-only pass; quest points and collision footprints are unchanged. Screenshots: `test-results/architecture`, `test-results/architecture-farm`, and `test-results/architecture-models`. Vite still reports the existing Three.js chunk-size advisory.

Lex integration: production build, 42 unit tests and eight focused desktop/mobile browser scenarios passed. Rescue checkpoint reload, carried-to-riverbank transition, mansion/cornfield conversations, and fallback dialogue were verified. glTF validation returned zero errors/warnings. Rendered model and gameplay screenshots were inspected.

Lana integration, September 8: final build, 42 unit tests, all eight Lana browser cases and two Clark loading regressions passed across focused runs. The GLB validator reports zero issues. School/cemetery interactions, necklace weakness, checkpoint reload and objective advancement were verified on desktop and emulated mobile. An initial test-only conversation completion assumption was fixed and both affected cases passed on rerun. No full pilot replay was needed for this asset-only change.

Custom-model integration: **42 unit tests and eight focused browser scenarios passed**, including desktop/mobile movement, the motion lab, imported gameplay and failed-asset fallback. The prepared GLB passed Khronos validation with zero errors and warnings. Gameplay screenshots on desktop/emulated mobile and sampled animation poses were visually inspected. The complete pilot journey was not rerun for this model-only integration; its earlier validation is recorded below.

Verified September 7, 2026: the production build and all **40 unit tests** pass. All **20 browser scenarios** have passing results across focused runs: eight control/checkpoint/retry/storage cases, two surface reviews, two WebGL fallbacks, both complete 25-objective journeys, two alternate-content checks, and four investigation/exploration cases. The full journeys verify a mid-rescue reload and the saved ending on desktop and emulated Android. An initial journey run hit a test-clock scheduling error; the clock helper was corrected and both full journeys then passed. Desktop/mobile farm, power, dialogue and investigation screenshots were reviewed.

The Three.js vendor chunk is about 512 kB before compression (130 kB gzip), which produces Vite's advisory 500 kB chunk warning. The build completes successfully. Physical-phone performance and reading-paced usability are still unmeasured.

Run `npm test`, `npm run build`, and `npm run test:e2e`. Browser tests cover desktop and emulated Android, including the full pilot, a mid-rescue reload, the ending save, simultaneous touch controls, cancellation, retry, and storage/WebGL failure handling. Short input tests use a controlled browser clock; complete story journeys use ordinary browser time.

Review screenshots are generated in `test-results/`; the README previews are copied into `docs/preview-desktop.png` and `docs/preview-mobile.png`. Phone emulation does not replace testing on physical devices. The 10–15 minute play length is a design target that still needs a reading-paced usability session.

## Future work beyond this pilot

- Author and test the next episode's story and encounters.
- Add a player-facing episode selector and progression between installed episodes. The active episode is currently selected in `src/content/episodes.ts`.
- Build playable Metropolis and additional powers when the episode content calls for them.
- Measure performance and touch ergonomics on intended physical phones.

See [Adding episodes](ADDING_EPISODES.md) for a working content example and the boundary between content changes and new mechanics.

### September 10 - Jeremy truck reaction

The truck objective now starts a first-person scene along the school service lane. Jeremy appears in the cab and the vehicle approaches Clark over a 3.5-second response window. A fresh E press or the large touch button triggers a short braking animation; missing the window offers an explicit retry without advancing or changing the saved checkpoint. Focus loss, hidden tabs and settings pause the scene. Reloading an unfinished attempt returns to the truck objective. Normal camera, actor and vehicle transforms are restored on completion or cancellation.

Implementation: `src/truck-attack.ts`, connected at the existing stable `truck` quest ID. No save-format changes are required. The generic strength-meter entry for this objective was removed; other power challenges retain their existing controls. `e2e/truck-attack.spec.ts` covers missed/late input, retry, keyboard/touch success, focus/settings pauses and unfinished/completed reloads. The full-journey helper now recognizes the scene and explicitly presses the stop control.
Validation: production build and all 43 logic tests passed. All four dedicated truck browser scenarios passed across desktop and Pixel 7 emulation, including visual captures of approach, failure and successful stop.
