# Lana Lang — supplied model integration

Source: `C:\Users\ofirz\Downloads\model.obj (1).zip`, dated September 8, 2026. This is the newer character archive beside the previously supplied Clark archive. It contains only OBJ/MTL/texture data; material comments are metadata, not instructions.

The model is a stylized woman with long dark hair, a pale blue blouse, black trousers and a green necklace. The original files remain in `source/`.

## Game asset

- Source: 956,236 triangles, 495,120 vertices, 4096² JPEG texture.
- Prepared: 24,000 triangles, 15,199 vertices, 1,855,316 bytes (about 1.86 MB).
- File: `public/models/lana/lana-rigged.glb`.
- 17-joint provisional humanoid rig; seven basic clips, with Idle used by the current NPC behavior.
- Standardized feet at zero, forward +Z, 1.48 local height, with the existing NPC scale applied by the game.
- The green pendant is a separate skinned mesh. Existing episode rules control its visibility at school and later checkpoints. A small skin-colored backing fills the pendant's opening when absent; the thin chain remains part of the original mesh.
- The imported Lana replaces only Lana's 3D model. Her actor ID, conversations, movement/placement rules and kryptonite behavior remain tied to existing episode definitions. The existing SVG dialogue portrait is retained.
- Failed downloads retain the procedural NPC and its functional story necklace.

The fit was visually inspected in idle and sampled poses. This is a provisional geometric rig, with no facial animation, finger articulation or hair physics. Fine shoulder/hair deformation and actual phone performance still need artistic/device review.

## Reproduce and inspect

1. `node docs/model-review/convert.mjs lana`
2. `node docs/model-review/prepare-character.mjs lana`
3. `node docs/model-review/validate.mjs lana`
4. With the local server running: `node docs/model-review/inspect.mjs lana`

The pendant triangle selection is fitted to this exact source and deterministic simplification. `locate-pendant.mjs` documents how it was identified from the unsplit prepared mesh; do not regenerate the selection from the final split mesh or use it for another character.

Motion lab: http://127.0.0.1:5187/model-review.html?actor=lana

The 28 MB original converted mesh is kept under docs and is not shipped in public game assets. The game downloads only the optimized Lana GLB.

## Validation

Khronos glTF Validator reports zero errors and zero warnings (`validation.json`). TypeScript/Vite build and 42 unit tests passed. Eight Lana scenarios passed across focused browser runs: school and cemetery conversations, correct pendant/weakness state, checkpoint reload, next objective, failed-load fallback and the motion lab, on desktop and emulated mobile. Two additional Clark loading regressions passed. An initial school test incorrectly expected an optional-choice completion button after an automatically completed conversation; the test was corrected and both school cases passed. Screenshots of both locations, mobile school gameplay, and the model front/back were inspected. The entire pilot was not rerun for this asset integration.
