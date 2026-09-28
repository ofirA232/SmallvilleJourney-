import type { CutsceneDefinition } from '../core/cutscene';

// Points use the location's local frame: +x is east, +y is south. On Loeb Bridge the
// road runs east-west, Clark stands at the centre and the river runs north-south below.
export const bridgeFall: CutsceneDefinition = {
  id: 'bridge-fall',
  shots: [
    { duration: 2.4, caption: 'A moment of quiet above the river.', from: { location: 'bridge', point: [3.6, -5.2], height: 1.3 }, to: { location: 'bridge', point: [2.9, -4.5], height: 1.5 }, look: { location: 'bridge', point: [0, 0], height: 1.1 } },
    { duration: 1, caption: 'Then the sound of tires.', ease: 'linear', fov: 50, from: { location: 'bridge', point: [-7, 1.7], height: 2.5 }, to: { location: 'bridge', point: [-5.4, 1.3], height: 2.1 }, look: { location: 'bridge', point: [-1, 0], height: .7 }, lookTo: { location: 'bridge', point: [0, 0], height: .8 } },
    { duration: 1.6, caption: 'The impact throws Clark and the car over the edge.', fov: 46, from: { location: 'bridge', point: [-2.6, -3.6], height: 2.6 }, to: { location: 'bridge', point: [-2.2, -3.9], height: 1.6 }, look: { location: 'bridge', point: [0, -.4], height: 1.2 }, lookTo: { location: 'bridge', point: [.2, -1.5], height: .1 } },
    { duration: 1.8, caption: 'Under the surface, someone is still trapped.', from: { location: 'bridge', point: [.9, -4.3], height: .35 }, to: { location: 'bridge', point: [.7, -3.7], height: .28 }, look: { location: 'bridge', point: [.2, -1.7], height: .05 } },
  ],
  cues: [{ at: 2.3, id: 'engine' }, { at: 3.4, id: 'impact' }, { at: 3.4, id: 'flash' }, { at: 4.9, id: 'splash' }],
  shakes: [{ at: 3.4, strength: .16 }, { at: 4.9, strength: .07 }],
};

// The Porsche lies nose-north in the river with its roof hinged towards the bridge.
// Clark works from the passenger (east) side and throws the roof over the car onto the west bank.
export const roofTear: CutsceneDefinition = {
  id: 'roof-tear',
  shots: [
    { duration: 1.4, caption: 'Clark grips the crumpled roof.', from: { location: 'bridge', point: [.3, -3.6], height: .6 }, to: { location: 'bridge', point: [.35, -3.2], height: .55 }, look: { location: 'bridge', point: [.3, -1.7], height: .5 } },
    { duration: 1.3, caption: 'Metal shrieks as it tears away.', fov: 48, from: { location: 'bridge', point: [.9, -4.6], height: 1.6 }, to: { location: 'bridge', point: [.6, -4.4], height: 1.3 }, look: { location: 'bridge', point: [-.9, -2], height: .7 }, lookTo: { location: 'bridge', point: [-1.3, -2.2], height: .4 } },
    { duration: 1.5, caption: 'He pulls Lex from the wreck.', fov: 50, from: { location: 'bridge', point: [.25, -3.9], height: 1.15 }, to: { location: 'bridge', point: [.3, -3.5], height: .95 }, look: { location: 'bridge', point: [.35, -1.7], height: .6 } },
  ],
  cues: [{ at: .1, id: 'strain' }, { at: 1.4, id: 'tear' }, { at: 1.4, id: 'flash' }, { at: 2.55, id: 'land' }, { at: 2.9, id: 'lift' }],
  shakes: [{ at: 1.4, strength: .09 }, { at: 2.55, strength: .05 }],
};

// Riley Field at night: Clark is tied to the post at [0, .24] facing south; Jeremy waits in the corn.
export const scarecrowNight: CutsceneDefinition = {
  id: 'scarecrow-night',
  shots: [
    { duration: 2.8, caption: 'That night, the team keeps its homecoming tradition.', fov: 44, from: { location: 'cornfield', point: [0, 6.5], height: 5.5 }, to: { location: 'cornfield', point: [0, 5], height: 3.6 }, look: { location: 'cornfield', point: [0, .2], height: 1.3 } },
    { duration: 2.2, caption: 'Lana’s necklace keeps him too weak to break free.', from: { location: 'cornfield', point: [.55, 1.45], height: .4 }, to: { location: 'cornfield', point: [.4, 1.25], height: .45 }, look: { location: 'cornfield', point: [0, .24], height: 1.7 } },
    { duration: 2.6, caption: 'Someone steps out of the corn.', from: { location: 'cornfield', point: [-.5, -.4], height: 2 }, to: { location: 'cornfield', point: [-.38, -.25], height: 1.9 }, look: { location: 'cornfield', point: [0, 2], height: .9 } },
  ],
  cues: [{ at: .1, id: 'night' }, { at: 5, id: 'rustle' }],
};

/** Letterbox, captions and timing for the last dance in the loft; LoftScene frames the dancers itself. */
export const lastDance: CutsceneDefinition = {
  id: 'last-dance',
  shots: [
    { duration: 4, caption: 'There is no music up here, and it does not matter.', from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
    { duration: 4.2, caption: 'They turn slowly in the lamplight, and for once nothing about Clark is strange.', from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
    { duration: 3.4, caption: '“I could stay right here.”', from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
  ],
  cues: [{ at: 10.4, id: 'flash' }, { at: 10.4, id: 'daydream' }],
};

/** Captions and timing for the bus leaving; BusScene frames the moving bus itself. */
export const busLeaves: CutsceneDefinition = {
  id: 'bus-leaves',
  shots: [
    { duration: 2.8, caption: 'Far down the road, the school bus pulls away without him.', from: { location: 'farm', point: [0, 2.2], height: 1.5 }, look: { location: 'farm', point: [0, 5], height: .6 } },
    { duration: 2, caption: 'Unless he runs.', from: { location: 'farm', point: [0, 5], height: 1 }, look: { location: 'farm', point: [0, 3.3], height: 1 } },
  ],
  cues: [{ at: .2, id: 'engine' }],
};

// Jeremy's truck in the school service lane at [-4.5, 1.7], nose to the south. Its driver's door
// faces east; Clark stands there and throws the door into the lane at [-3.05, 2.5].
export const truckDoor: CutsceneDefinition = {
  id: 'truck-door',
  shots: [
    { duration: 1.3, caption: 'The door is jammed shut. Clark takes hold of it.', from: { location: 'school', point: [-2.9, 2.2], height: .95 }, to: { location: 'school', point: [-3, 2], height: .9 }, look: { location: 'school', point: [-4.2, 1.6], height: .6 } },
    { duration: 1.3, caption: 'Metal gives way.', fov: 50, from: { location: 'school', point: [-1.7, 4.4], height: 2.3 }, to: { location: 'school', point: [-1.9, 4.2], height: 2 }, look: { location: 'school', point: [-3.4, 2.1], height: .6 } },
    { duration: 1.6, caption: 'He pulls Jeremy clear of the wreck.', fov: 46, from: { location: 'school', point: [-2.2, 3.95], height: 1.65 }, to: { location: 'school', point: [-2.35, 3.8], height: 1.5 }, look: { location: 'school', point: [-3.85, 2.05], height: .85 } },
  ],
  cues: [{ at: .1, id: 'strain' }, { at: 1.3, id: 'tear' }, { at: 1.3, id: 'flash' }, { at: 2.35, id: 'land' }, { at: 2.7, id: 'lift' }],
  shakes: [{ at: 1.3, strength: .08 }],
};

// Smallville Cemetery: Lana stands at [.4, 1.5] facing south, Clark at [.4, 2.15] facing her.
export const promAsk: CutsceneDefinition = {
  id: 'prom-ask',
  shots: [
    { duration: 4, caption: 'Clark: “The spring formal is tonight. I keep thinking I should have asked you to go with me.”', fov: 44, from: { location: 'cemetery', point: [2.35, 1.8], height: 1.35 }, to: { location: 'cemetery', point: [2.2, 1.82], height: 1.3 }, look: { location: 'cemetery', point: [.4, 1.82], height: 1.15 } },
    { duration: 3.6, caption: 'Lana: “Clark… I am going with Whitney. I said yes to him last week.”', fov: 40, from: { location: 'cemetery', point: [1.05, 3.35], height: 1.5 }, to: { location: 'cemetery', point: [1, 3.2], height: 1.47 }, look: { location: 'cemetery', point: [.3, 1.5], height: 1.15 } },
    { duration: 3, caption: 'Clark: “Right. Of course you are. Forget I asked.”', fov: 40, from: { location: 'cemetery', point: [-.3, .05], height: 1.5 }, to: { location: 'cemetery', point: [-.25, .2], height: 1.47 }, look: { location: 'cemetery', point: [.5, 2.15], height: 1.2 } },
    { duration: 4, caption: 'Lana: “Do not do that. Come anyway—and if you do, I will save you the last dance.”', fov: 40, from: { location: 'cemetery', point: [1.05, 3.3], height: 1.48 }, to: { location: 'cemetery', point: [1, 3.2], height: 1.45 }, look: { location: 'cemetery', point: [.3, 1.5], height: 1.15 } },
    { duration: 3.2, caption: 'She kisses him on the cheek before he can find anything to say.', fov: 40, from: { location: 'cemetery', point: [2.05, 1.95], height: 1.35 }, to: { location: 'cemetery', point: [1.9, 1.9], height: 1.3 }, look: { location: 'cemetery', point: [.4, 1.85], height: 1.18 } },
    { duration: 2.8, caption: 'Clark walks home with it turning over in his head.', from: { location: 'cemetery', point: [2.6, 4.3], height: 2.6 }, to: { location: 'cemetery', point: [2.9, 4.7], height: 3.1 }, look: { location: 'cemetery', point: [.4, 1.8], height: .8 } },
  ],
  cues: [{ at: 14.7, id: 'kiss' }],
};

// The Wall of Weird at school [4.1, -.7] faces south; the yearbook is on its left, the meteor clipping
// on its right, and the hospital report lies on the table at [4.9, .3]. Clark stands at [4.1, .35].
export const wallDiscovery: CutsceneDefinition = {
  id: 'wall-discovery',
  shots: [
    { duration: 3.4, caption: 'Chloe’s wall: everything Smallville would rather forget, pinned in one place.', from: { location: 'school', point: [5.35, 1.6], height: 2.05 }, to: { location: 'school', point: [5.05, 1.1], height: 1.7 }, look: { location: 'school', point: [4.1, -.62], height: 1 } },
    { duration: 3.6, caption: '1989: a freshman named Jeremy Creek, picked by the team to be the homecoming scarecrow.', fov: 32, from: { location: 'school', point: [3.35, .25], height: .95 }, to: { location: 'school', point: [3.45, .1], height: .9 }, look: { location: 'school', point: [3.5, -.62], height: .94 } },
    { duration: 3.6, caption: 'The same night, meteors fall on Riley Field. A boy is found twenty yards from an impact.', fov: 32, from: { location: 'school', point: [4.55, .25], height: .95 }, to: { location: 'school', point: [4.62, .1], height: .9 }, look: { location: 'school', point: [4.68, -.62], height: .94 } },
    { duration: 3.6, caption: 'Twelve years in a coma. Then a storm, a failed generator, and an empty hospital bed.', fov: 36, from: { location: 'school', point: [5.3, .9], height: 1.1 }, to: { location: 'school', point: [5.2, .78], height: 1 }, look: { location: 'school', point: [4.9, .3], height: .6 } },
    { duration: 3.8, caption: 'The players who left him in that field are being attacked, one by one. It is the same boy.', fov: 40, from: { location: 'school', point: [4.65, -.5], height: 1.35 }, to: { location: 'school', point: [4.6, -.45], height: 1.3 }, look: { location: 'school', point: [4.1, .35], height: 1.15 } },
  ],
  cues: [{ at: 14.3, id: 'realise' }],
};

/** The last look from the loft: towards the window, out through it, and up to the stars. */
/** “Goodnight, Lana.”: subtitles and timing only; LoftScene frames Clark at the telescope, then Lana on
 * her porch as she turns as if she heard him. The porch shot is silent. */
export const goodnight: CutsceneDefinition = {
  id: 'goodnight',
  shots: [
    { duration: 1.4, caption: 'Clark: “Goodnight, Lana.”', from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
    { duration: 3.3, from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
  ],
};

export const loftStars: CutsceneDefinition = {
  id: 'loft-stars',
  shots: [
    { duration: 3.6, caption: 'He lifts his eyes past the weathervane, past the fields, to the stars he fell from.', from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
    { duration: 4.2, caption: 'Every legend starts somewhere. This one starts here.', from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
    // Held on the stars while the series title fades up.
    { duration: 4.6, from: { location: 'farm', point: [-2, -1.9], height: 42 }, look: { location: 'farm', point: [-2, -1.9], height: 41 } },
  ],
  cues: [{ at: 8, id: 'logo' }],
};
