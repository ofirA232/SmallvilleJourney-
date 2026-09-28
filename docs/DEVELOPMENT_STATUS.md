# Development status

## Playable scope

The pilot is implemented as 27 explicit objectives across eight chapters, from the meteor opening to the barn ending. It includes navigation on the sphere, keyboard and touch controls, superspeed, jumping, swimming, contextual strength, kryptonite weakness, conversations, the Lex rescue (tearing the roof off his Porsche), a stealth fence repair, story cutscenes, the cornfield sequence, the timed school return, the last dance, checkpoint retry, local saves, and replay.

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

### September 13 - Desktop rendering performance

Static scenery now has per-mesh BVH acceleration for follow-camera occlusion queries, with nearest-hit-only traversal. A regression compares 112 rays across all seven locations against the original Three.js intersections; results match. One local run measured 60.7 ms before and 18.1 ms after for that batch, not overall frame time.

Automatic graphics now measures active wall time in two-second windows, disables shadows and reduces the pixel budget when frame rate stays below 38, then provides a second resolution reduction if needed. Mobile/Low use a 900k pixel budget, initial desktop uses 1.5M; shadow maps use 1024 rather than 1536. Low graphics disables moving HUD backdrop blur. Kryptonite no longer rewrites the CSS exposure value when unchanged. FPS telemetry uses actual elapsed time rather than capped simulation time.

Validation: 46 unit tests and two desktop browser scenarios (movement/superspeed/jump/pause plus camera/journal/settings) passed. The deployed baseline and local build both reported approximately 9 fps in headless browser samples; these are not a controlled hardware performance comparison and do not demonstrate a whole-game FPS gain on the user's computer. The local build correctly reached adaptive level 2. A physical-device retest is still needed.

### September 14 - Superspeed trail on production builds

Replaced the small, frame-sampled point trail with two continuous red/blue ribbons. The effect uses one draw call, preallocated buffers and at most 124 triangles. Samples are spaced by world distance, so lower frame rates do not create gaps or change the maximum length. Low and adaptive graphics retain the effect; Reduce motion intentionally disables it. Pausing clears the trail and teleport detection prevents lines across the planet.

Unit coverage checks 10/60 fps sampling, reduced motion, stopping and teleport resets. The new `playwright.production.config.ts` serves `dist` rather than the development server; build before using it. Dedicated trail scenarios check Low/Auto (including adaptive level 2), stop/resume settings, loaded Clark/Lana/Lex models and failed asset requests on desktop and mobile viewports. These checks distinguish shipped-build failures from device graphics/preferences; they do not imply that every browser or all future deployment configurations are covered.

### September 14 - Draw-call batching and self-healing graphics tier

Measured the production build on the development desktop (RTX 3060, 1920x1080) with Chromium on the real GPU: the game already held a vsync-capped 60 fps with about 2 ms of JavaScript per frame, so the remaining cost is GPU and driver work per draw call, which matters on laptops, integrated graphics and phones. Three changes cut draw calls without changing the picture:

- Static scenery is merged per shading variant with colours baked into vertex colours instead of one mesh per colour (240 meshes / 192 materials became 3 meshes).
- Procedural character joints merge across colours the same way (222 meshes became 120).
- The thirteen clouds are two instanced meshes instead of 65 separate spheres.

Draw calls per frame: globe view 415 to 133, follow view 229 to 82, superspeed 176-300 to 41-99. Before/after screenshots in both views are pixel-identical to the eye.

Automatic graphics now measures the share of slow frames rather than the average, so one-off stalls (model decode, shader compile, a returning tab) no longer lock a fast machine into a lower tier, and a drop recovers after eight seconds of near-perfect frames, at most three times per session. Netlify now serves hashed bundles as immutable and models with an hourly cache.

Validation: 50 unit tests, the production trail scenario and the full browser suite. A physical-device retest on a weaker machine is still the only way to confirm the whole-game gain there.

### September 20 - Supplied piano opening music

Added the user's supplied 970 KB MP3 as `public/audio/opening-piano.mp3`. A title-screen Play opening music button starts the track through a user gesture. The track loops through the title/prologue, respects the shared sound setting and pauses on focus loss or hidden tabs. Entering gameplay stops and rewinds it; returning to the title resumes it if sound remains enabled. Playback rejection leaves a retryable button. Streaming uses an HTML audio element with preload disabled, independent of the graphics loop and synthesized gameplay audio.

### September 20 - Kent family conversation soundtrack

The supplied Long Way Around instrumental streams from `public/audio/kent-morning.mp3` during the `morning` dialogue only, at 28% volume. Optional conversation branches keep the music running; finishing the dialogue stops and rewinds it. It honors the global sound preference and pauses for focus loss, hidden tabs and modal menus. The opening piano remains separate and is stopped during gameplay. Preload is disabled so the 3.65 MB file is requested only when the scene plays with sound enabled.

### September 20 - A cue-driven score with faded handovers

The episode's story music is driven by a cue table in `src/core/story-music.ts` rather than a single dialogue check. Each cue names the objective it belongs to, the dialogue that opens it, the objective that ends it, and optionally an `offset` that skips a track's intro. Every track streams at 15% volume (down from 28%) and leaves by riding its volume to zero over 2.6 seconds on an animation frame.

- `kent-morning.mp3` opens with the kitchen conversation, carries the feed-crate encounter, and fades out the moment `The first bell` becomes the objective - so it is already silent during the run to school.
- `everywhere-you-go.mp3` opens on Pete's line at school, carries the Lana conversation, and fades out when `A moment above the river` becomes the objective.
- `unstoppable.mp3` opens when Clark steps onto Loeb Bridge, carries the crash, the dive and both strength encounters, and fades out when `An unlikely beginning` becomes the objective.
- `everything.mp3` opens from 0:23 with the family on the porch, carries the whole loft ending, and fades out over the completion panel. A cue with an offset loops back to the offset rather than to the top, and seeks there before its first play so the skipped intro is never heard.

A cue latches once started, so finishing a dialogue never rewinds the track mid-stretch, and a cue the player never started stays silent instead of fading in from a reloaded save. `until` accepts `complete` for a cue that runs to the end of the episode. The constructor rejects a cue whose objectives are not a forward span, so a mistyped id fails at boot rather than silently going quiet. Fades stall while the tab is hidden, unfocused or muted, and the level resets once the stretch is left. In-world encounters and the completion panel do not count as modal menus for these tracks, so the minigames never cut a stretch off and the closing fade is audible. The opening piano remains separate. Preload stays disabled, so each 3-9 MB file is requested only when its stretch plays with sound enabled.

### September 20 - The prom promise and the daydream ending

Two pilot scenes were rewritten in `src/content/pilot.ts`. The cemetery conversation now ends with Clark asking Lana to the spring formal; she is already going with Whitney, and when he backs off she tells him to come anyway and promises to save him the last dance.

The loft finale pays that off. Lana is waiting in the barn in her dress, they dance in the lamplight with no music, and then the wind moves through the corn and the barn is empty - it was only ever a daydream. Clark returns to the telescope, watches her walk home far down the road and sees her stop and look back toward the farm, then lifts his eyes to the stars he fell from. The episode closes on `Every legend starts somewhere. This one starts here.`

### September 24 - Responsive navigation minimap

Added a north-up equirectangular map of the spherical world with named landmarks, a white player heading arrow and a gold objective marker. The map's Go to objective button uses the existing obstacle-aware navigator. It can be collapsed, has accessible labels and 44px controls, and hides during conversations, story scenes, restraint and nearby interactions. Desktop places it beneath the upper-right toolbar; touch layouts put it above the action controls. Static terrain is drawn once on a small canvas; dynamic markers refresh with the HUD, with no additional WebGL draw calls.

Production build passed. Desktop and mobile browser checks passed for screen bounds, non-overlap with controls/objective, live position updates, collapse/reopen, settings hiding, objective navigation and dialogue hiding. Visual screenshots are in the local `test-results/minimap` directory.

### September 27 - Cutscene system and the Loeb Bridge crash

Added a reusable cutscene system. `src/core/cutscene.ts` is a pure timeline: shots with camera and look-at spots in a location's local frame, optional dolly/pan between them, per-shot field of view and captions, named cues, and decaying camera shakes. `src/cutscene.ts` plays it over the live world with letterbox bars, subtitles above the host badge, a Skip scene button (and Escape), an impact flash, and a hidden HUD. The game loop supplies active time, so menus, blur and hidden tabs pause a scene where it stands. When a scene ends, the follow camera takes over from the last shot's position instead of cutting. Portrait screens widen the vertical field of view (up to 70 degrees) to keep roughly the landscape framing.

The bridge crash is the first scene (`bridgeFall` in `src/content/pilot-cutscenes.ts`, 6.8 seconds): an establishing shot of Clark on the bridge, the car rushing along the deck, the impact with a flash and shake, and a low shot of the splash. Synthesized engine, impact and splash sounds play on the scene's cues. Checkpoint behaviour is unchanged: the save still points to the bridge interaction until the splash, and skipping completes it exactly once.

Validation: 57 unit tests (seven new timeline tests), the production build, and 22 desktop/mobile browser scenarios (bridge, full pilot journey, minimap and controls). The bridge scenario saves one capture per shot.

### September 27 - The Porsche, the fence, the scarecrow night and the last dance

- **Lex's Porsche.** The car is now a light-blue fastback (`src/world/porsche.ts`): round headlights on the wings, a ducktail, a red tail-light bar, glass the player can see through, and a seated Lex at the wheel. Its roof is a separate hinged group. It appears in the bridge crash and in the river.
- **Tearing the roof off.** In the `car-door` strength encounter the roof peels up as Clark strains. Finishing it plays `roofTear` (4.2 seconds): the roof tears away and lands on the west bank, and Clark lifts Lex out. A new `opened` prop state keeps the wreck roofless and the roof on the bank until `lex-thanks`, including after reloads. The objective completes when the scene ends, so an interrupted scene replays from the encounter.
- **"Faster than Dad can see"** (`fence`, new objective between the crate and the run to school). Four fence sections are down. Jonathan works in the yard with his back turned, gives a short tell, then turns to watch the fence; a vision cone shows on the ground. While his back is turned, E repairs a section instantly at super speed. While he watches, a repair takes 3.2 seconds by hand, and super speed in front of him is a strike. The third strike starts the fence over. Jonathan's rhythm is fixed, not random. His reaction dialogue ends with the bus leaving, which leads into the existing race. Saves from before the objective, including saves older than the bridge scene, migrate through a general list of inserted objectives.
- **Scarecrow night** (`scarecrowNight`, 7.6 seconds) plays after Whitney's conversation: a wide shot over Riley Field as night falls, a low angle on Clark tied to the post with the necklace glowing, and Jeremy walking out of the corn.
- **The last dance.** The loft dialogue now pauses when Lana offers the dance. `DanceScene` stages the couple in the yard with a slow half-orbit camera; Lana leads six steps (arrows/WASD or on-screen buttons) with a shrinking window. A missed step is only a stumble. The daydream ends with a soft flash, and `loft-after` finishes the episode.
- Story scenes share one `StoryScene` interface in the game loop; a scene may pose Clark or animate one actor itself.

Validation: 58 unit tests (including the fence save migration) and the production build pass. The full browser suite (84 desktop/mobile tests, with new specs for the roof tear, the fence mission, the scarecrow scene and the dance) passed 80 of 84 in one run on a heavily loaded machine (4-7 fps); the other four passed on rerun after the fence and dance test helpers were made independent of frame rate. The dance helper steps Playwright's clock, so each lead is answered inside its window on any machine.

### September 27 (later) - Posts, the bus, a live world, Jeremy's truck and the loft

- **Fence posts.** The fence objective now has Clark driving four new posts into the ground: one push at super speed (with a dust ring) while Jonathan's back is turned, or seven hammer blows by hand while he watches. The rails go on once a post is home. Strikes and the reset are unchanged.
- **The bus.** A yellow school bus (`src/world/school-bus.ts`) pulls away from the farm gate in `BusScene` after Jonathan's reaction. During the run to school it drives the farm-to-school road, reaching the school as the clock runs out; the race clock waits for the scene.
- **Lex at full size.** Clark carries Lex at the world actor's scale, face up across his arms. In the roof tear Clark takes hold of the full-size Lex the moment he lifts him out.
- **Conversations stay live.** The 3D scene keeps rendering during conversations (it still sleeps behind menus and in the background), and dragging or pinching turns and zooms the camera while people talk.
- **A living town.** `src/world/actor-life.ts` gives every character a routine around the spot the story gives them: short strolls (never into water or buildings), glances over the shoulder, turning to Clark when he comes within 4.5 units, and gestures while they speak.
- **Jeremy's truck.** For `free-jeremy` the truck shows an open cab with Jeremy trapped at the wheel. `TruckDoorScene` has Clark tear the door off (it lands in the lane) and pull Jeremy out at full size before their conversation. A new `occupied` prop state marks someone trapped inside; `opened` keeps the door off afterwards.
- **The loft.** The finale plays in Clark's loft (`src/world/loft.ts`), modelled on the reference photo: A-frame roof with rafters and collar ties, string lights, a hay-door window with a moon, bookshelf, red couch, armchair, dartboard, trunk, rug, globe, hay and the telescope. The set floats far above the barn so nothing on the planet intrudes. `LoftScene` runs the conversation with a turnable camera, brings Lana up the stairs, plays the last dance as a short film with no choices, and ends the daydream; the closing panel follows, and "Keep exploring" returns Clark to the farm.

### September 27 (evening) - Title music, prom, the Wall of Weird, the valve, the pickup and the stars

- **Title music without the wait.** Sound is on by default (a saved choice is still respected). The opening track preloads and starts on the title; the supplied file opens with 2.7 s of silence and ends with 4.6 s, so playback starts at 2.6 s and loops back there before the silent tail. Browsers that refuse autoplay start it on the first touch, click or key press.
- **The Kent family track carries the whole morning**: the chores, the fence posts, the bus and the run to school. A cue can now name the conversation that ends it (`untilDialogue`), so it fades on Pete's first line as the school track opens.
- **Conversations stay light.** While people talk the 3D scene renders at up to 30 fps, or a few frames a second on a device that is already struggling, and at full rate while the player turns the camera.
- **Objective card on phones.** A fold control collapses the card to its title, like the map.
- **The prom question** (`PromScene`) closes the cemetery conversation: Clark asks, Lana is going with Whitney, he says to forget he asked, she promises the last dance and kisses his cheek. The lines play as subtitles with close-ups.
- **The Wall of Weird** (`WallScene`) plays before the deduction: the yearbook page, the meteor clipping and the hospital report, now printed and readable, tell Jeremy's story before the player connects the pieces.
- **Jeremy's pickup** is a blue truck with a chrome grille and bumpers (`src/world/pickup.ts`), and stopping it screeches the tyres.
- **The sprinkler valve** (`ValveChallenge`) replaces the strength meter: three full clockwise turns of the wheel in 12 seconds, by dragging around it or pressing the arrows in turn; the red wheel at the valve turns with it, and running out of time offers another try.
- **The last look.** After the loft conversation the camera pushes to the hay door, out through it, and tilts up to a dome of stars for the closing lines, before the ending panel. The panel's button now reads "Step outside into Smallville", and closing the panel any way returns Clark to the farm.

### September 27 (night) - The title screen, the bridge route, the porch and the closing song

- **A title screen that never overlaps.** The globe is framed into the free part of the screen, measured from the page: beside the text on wide screens and above it on phones. Globe labels hide wherever they would sit on the text or the bars, short laptop screens keep the bottom bar's layout without its tagline, and phones in landscape get a compact one-line title. On small phones the framed globe sits further off than the usual draw distance, so the camera's far plane now reaches it.
- **The bus takes Loeb Bridge.** The river has no other crossing, so the route runs from the farm gate to the bridge, across the deck, and on to the school gate.
- **The prom question is framed wider**, so Clark's and Lana's heads both stay in shot.
- **The Wall of Weird film is Clark's alone.** Chloe stands just behind the spot where Clark reads the wall, so she steps out of the film and is back for the deduction.
- **The service yard is empty.** From the race to the return home, Pete, Chloe and Whitney are inside at the dance; only Clark and Jeremy are at the school.
- **The loft camera breathes.** Every loft shot creeps in slowly (a small dolly and a gentle zoom that restart at each cut). Lana's arrival cuts to a view over Clark's shoulder to the top of the stairs.
- **"Goodnight, Lana."** After a beat on Clark, the film cuts across town to Lana at her aunt's front door (`src/world/porch.ts`: clapboard siding, a white door with a lamp-lit curtained pane, a porch lamp and a floral chair, after the reference still). She turns and looks into the camera as if she heard him, then it cuts straight back to Clark. The moment plays as a short film (`goodnight`) with letterbox bars and the line as a subtitle; the conversation waits behind it (Skip or Escape end it early), and when it ends the card moves on to the closing line by itself.
- **The series title over the stars.** The last look now holds on the stars after the closing line, and the Smallville logo (`public/images/smallville-logo.png`) fades up there before the ending panel opens; it stays behind the panel until Clark steps outside.
- **Every song eases in and out.** One envelope (`src/core/music-envelope.ts`) rides the title music and every story track: a 2 s fade in whenever a song starts, loops or resumes, and a 2.6 s fade out at every handover, when the title closes, and in the last seconds before a file ends or loops back. Story tracks now loop by hand to their offset so each pass fades out and in again.
- **The last dance is an embrace.** Clark and Lana dance close together; his hands rest at her waist and her arms go around his neck (`src/world/embrace.ts` lays the arm pose over the rigs after their animation each frame).
- **The closing song plays out.** `everything.mp3` now opens at 2:20, with the family by the barn. The final track no longer fades when the episode completes: it plays to its last note behind the ending panel (without looping), and fades only when the player steps outside into Smallville.

### September 27 (late night) - Score for the middle of the pilot

Five supplied tracks fill most of the stretch between the rescue and the return home that had no music.

- **`family-secrets.mp3`** opens on Lex's first line on the riverbank and carries Jonathan's answers and the craft in the storm cellar. It fades when `A quiet kind of understanding` becomes the objective. `unstoppable.mp3` now plays on under the questions on the bank, and fades as Lex's conversation opens, instead of fading as soon as he is ashore.
- **`autumn-afterlight.mp3`** opens on Lana's first line at the cemetery, carries the prom question and the kiss, and fades when `More than a name` becomes the objective.
- **`luminous-tension.mp3`** opens on Chloe's first line at the Wall of Weird, carries the three clippings, the film of Jeremy's story and the deduction, and fades when `An old tradition` becomes the objective.
- **`cornfield-night.mp3`** opens at 0:12 as night falls on Riley Field. It carries Jeremy at the scarecrow post and Lex's car pulling up, and fades as Clark calls out to Lex.
- **`forward-momentum.mp3`** takes over on that call, as Lex cuts Clark down. It carries the run back to school, the stand-off outside the gym, the valve and the truck, and fades when `Everybody gets to go home` becomes the objective. It is the first cue with its own `level` (0.10 instead of the shared 0.15, about 3.5 dB down), because it drives harder than the rest of the score.
- A cue without a `dialogue` now opens as soon as its `from` objective begins. The scarecrow scene plays after Whitney's conversation has already completed her objective, so no conversation opens that stretch.

Browser tests in `e2e/story-music.spec.ts` cover each new handover and fade.
