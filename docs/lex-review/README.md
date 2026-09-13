# Lex Luthor — supplied model

Source: user-supplied `C:\Users\ofirz\Downloads\model.obj (2).zip`. The archive contains OBJ, MTL and JPEG texture data only. Asset comments are metadata, not instructions.

The character has a bald head, black jacket/trousers and a light shirt. The original source is preserved under `source/`; the original converted GLB remains under docs and is not shipped with public game assets.

- Source: 971,738 triangles, 503,533 vertices.
- Prepared asset: `public/models/lex/lex-rigged.glb`, 24,000 triangles, 15,337 vertices, 1,773,400 bytes (about 1.77 MB).
- Provisional 17-joint humanoid rig and seven basic clips, with the original texture retained.
- The shared character loader now supports Clark, Lana and Lex, with per-actor caching and independent cloned skeletons.
- Lex uses the new model on the riverbank, at the mansion, in the cornfield, and when carried by Clark. The carried actor keeps the existing horizontal rescue staging; it is not a newly authored rescue animation.
- Download failure preserves the procedural Lex. Dialogue portraits and story outcomes remain unchanged.
- Normal Lex NPC scale stays 0.95; carried scale stays 0.73. The requested female heights and Clark's dark-blue eye material are retained.

This remains a provisional geometric rig, without facial/finger animation. Front, back, idle and sampled action poses were visually inspected. Fine shoulder deformation and physical-phone performance have not been exhaustively measured.

## Reproduction

1. `node docs/model-review/convert.mjs lex`
2. `node docs/model-review/prepare-character.mjs lex`
3. `node docs/model-review/validate.mjs lex`
4. With the dev server running: `node docs/model-review/inspect.mjs lex`

Preview: http://127.0.0.1:5187/model-review.html?actor=lex

The GLB passes Khronos validation with zero errors/warnings (`validation.json`). Build and all 42 unit tests passed. All eight focused browser scenarios passed (`test-results/lex-integration`): rescue/reload, riverbank appearance, mansion and cornfield conversations, and failed-asset fallback, each on desktop and emulated mobile. Model front/back, carried rescue, mansion and mobile riverbank screenshots were inspected. The full pilot was not rerun for this asset integration.
