// Offline preparation of the supplied T-pose. Run from the project root.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { MeshoptSimplifier } from 'meshoptimizer';
import { Quaternion, Euler, Matrix4 } from 'three';

await MeshoptSimplifier.ready;
const actor = process.argv[2] ?? 'clark';
if (!['clark', 'lana', 'lex'].includes(actor)) throw new Error('Unknown actor');
const directory = actor === 'clark' ? 'docs/model-review' : `docs/${actor}-review`;
const source = readFileSync(actor === 'clark' ? 'public/models/review/submitted.glb' : `${directory}/submitted.glb`);
const jsonLength = source.readUInt32LE(12);
const original = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const binary = source.subarray(28 + jsonLength);
function readAccessor(id) {
  const a = original.accessors[id], view = original.bufferViews[a.bufferView];
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const Type = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType];
  const bytes = binary.subarray((view.byteOffset || 0) + (a.byteOffset || 0), (view.byteOffset || 0) + (a.byteOffset || 0) + a.count * width * Type.BYTES_PER_ELEMENT);
  return new Type(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const primitive = original.meshes[0].primitives[0];
const positions = readAccessor(primitive.attributes.POSITION), normals = readAccessor(primitive.attributes.NORMAL), uvs = readAccessor(primitive.attributes.TEXCOORD_0);
const sourceIndices = new Uint32Array(readAccessor(primitive.indices));
// Standard game coordinates: feet at Y=0, forward +Z, height 1.48.
const sourcePosition = original.accessors[primitive.attributes.POSITION];
const scale = 1.48 / (sourcePosition.max[1] - sourcePosition.min[1]);
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i], z = positions[i + 2];
  positions[i] = -z * scale; positions[i + 1] = (positions[i + 1] - sourcePosition.min[1]) * scale; positions[i + 2] = x * scale;
  const nx = normals[i]; normals[i] = -normals[i + 2]; normals[i + 2] = nx;
  const normalLength = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
  if (normalLength > 0) for (let j = 0; j < 3; j++) normals[i + j] /= normalLength;
}
const attributes = new Float32Array(positions.length / 3 * 5);
for (let i = 0; i < positions.length / 3; i++) attributes.set([...normals.subarray(i * 3, i * 3 + 3), ...uvs.subarray(i * 2, i * 2 + 2)], i * 5);
const [indices, error] = MeshoptSimplifier.simplifyWithAttributes(sourceIndices, positions, 3, attributes, 5, [.2, .2, .2, 1, 1], null, 24000 * 3, .012, ['RegularizeLight']);
const [remap, count] = MeshoptSimplifier.compactMesh(indices);
function compact(array, width) {
  const output = new Float32Array(count * width);
  for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) output.set(array.subarray(i * width, (i + 1) * width), remap[i] * width);
  return output;
}
const p = compact(positions, 3), n = compact(normals, 3), uv = compact(uvs, 2);
// Joint positions were fitted to this supplied mesh. These are provisional geometric weights,
// not a replacement for artist-authored topology and hand-painted deformation weights.
const bones = [
  ['Hips', -1, [0, .58, 0]], ['Spine', 0, [0, .78, 0]], ['Chest', 1, [0, .96, 0]],
  ['Neck', 2, [0, 1.10, 0]], ['Head', 3, [0, 1.18, 0]],
];
for (const [side, s] of [['Left', 1], ['Right', -1]]) {
  const first = bones.length;
  bones.push([`${side}Arm`, 2, [s * .205, 1.045, 0]], [`${side}Forearm`, first, [s * .435, 1.035, 0]], [`${side}Hand`, first + 1, [s * .635, 1.025, 0]]);
}
for (const [side, s] of [['Left', 1], ['Right', -1]]) {
  const first = bones.length;
  bones.push([`${side}Thigh`, 0, [s * .09, .56, 0]], [`${side}Shin`, first, [s * .09, .30, 0]], [`${side}Foot`, first + 1, [s * .09, .075, .02]]);
}
const joints = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
for (let i = 0; i < count; i++) {
  const x = p[i * 3], y = p[i * 3 + 1], ax = Math.abs(x);
  let a, b, t;
  if (ax > .175 && y > .82 && y < 1.145) {
    const arm = x > 0 ? 5 : 8;
    if (ax < .28) { a = 2; b = arm; t = smooth(.175, .26, ax); }
    else if (ax < .56) { a = arm; b = arm + 1; t = smooth(.385, .475, ax); }
    else { a = arm + 1; b = arm + 2; t = smooth(.6, .66, ax); }
  } else if (y > 1.065) { a = 2; b = 4; t = smooth(1.065, 1.17, y); }
  else if (y < .61) {
    const leg = x > 0 ? 11 : 14;
    if (y > .48) { a = leg; b = 0; t = smooth(.49, .61, y); }
    else if (y > .13) { a = leg + 1; b = leg; t = smooth(.25, .35, y); }
    else { a = leg + 2; b = leg + 1; t = smooth(.06, .13, y); }
  } else if (y < .85) { a = 0; b = 1; t = smooth(.61, .81, y); }
  else { a = 1; b = 2; t = smooth(.85, .98, y); }
  joints.set([t === 1 ? 0 : a, t === 0 ? 0 : b, 0, 0], i * 4); weights.set([1 - t, t, 0, 0], i * 4);
}
const chunks = [], views = [], accessors = []; let length = 0;
function append(data, target) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength), id = views.length;
  views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, ...(target ? { target } : {}) });
  chunks.push(bytes); length += bytes.length; const padding = (4 - length % 4) % 4; chunks.push(Buffer.alloc(padding)); length += padding; return id;
}
function accessor(data, type, componentType = 5126, target, bounds = false) {
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
  const result = { bufferView: append(data, target), componentType, count: data.length / width, type };
  if (bounds) { result.min = Array(width).fill(Infinity); result.max = Array(width).fill(-Infinity); for (let i = 0; i < data.length; i++) { result.min[i % width] = Math.min(result.min[i % width], data[i]); result.max[i % width] = Math.max(result.max[i % width], data[i]); } }
  accessors.push(result); return accessors.length - 1;
}
const attrs = { POSITION: accessor(p, 'VEC3', 5126, 34962, true), NORMAL: accessor(n, 'VEC3', 5126, 34962), TEXCOORD_0: accessor(uv, 'VEC2', 5126, 34962), JOINTS_0: accessor(joints, 'VEC4', 5123, 34962), WEIGHTS_0: accessor(weights, 'VEC4', 5126, 34962) };
let bodyIndices=indices, pendantIndices;
if(actor==='lana'){
  const selection=new Set(JSON.parse(readFileSync('docs/lana-review/pendant-triangles.json','utf8')).triangles);
  const body=[],pendant=[];
  for(let i=0;i<indices.length;i+=3)(selection.has(i/3)?pendant:body).push(indices[i],indices[i+1],indices[i+2]);
  if(pendant.length!==31*3)throw new Error('Pendant selection no longer matches the prepared Lana mesh; inspect again.');
  bodyIndices=new Uint32Array(body);pendantIndices=new Uint32Array(pendant);
}
const indexAccessor = accessor(bodyIndices, 'SCALAR', 5125, 34963);
const pendantAccessor=pendantIndices?accessor(pendantIndices,'SCALAR',5125,34963):undefined;
const inverse = new Float32Array(bones.length * 16);
bones.forEach(([, , pos], i) => inverse.set(new Matrix4().makeTranslation(...pos).invert().elements, i * 16));
const inverseAccessor = accessor(inverse, 'MAT4');
const nodes = [{ name: 'Clark', children: [2] }, { name: 'ClarkMesh', mesh: 0, skin: 0 }, ...bones.map(([name, parent, pos]) => ({ name, translation: pos.map((v, i) => v - (parent < 0 ? 0 : bones[parent][2][i])), children: [] }))];
bones.forEach(([, parent], i) => { if (parent >= 0) nodes[parent + 2].children.push(i + 2); });
for (const node of nodes) if (node.children?.length === 0) delete node.children;
nodes[0].name=actor[0].toUpperCase()+actor.slice(1);nodes[1].name=`${actor}Body`;
const animations = [];
for (const name of ['Idle', 'Walk', 'Run', 'Jump', 'Swim', 'Strength', 'Restrained']) {
  const duration = name === 'Run' ? .56 : name === 'Walk' ? .9 : 2;
  const times = Float32Array.from({ length: 33 }, (_, i) => i / 32 * duration);
  const input = accessor(times, 'SCALAR', 5126, undefined, true), samplers = [], channels = [];
  for (let b = 0; b < bones.length; b++) {
    const values = [];
    for (let frame = 0; frame <= 32; frame++) {
      const phase = frame / 32 * Math.PI * 2, walk = name === 'Walk' || name === 'Run', run = name === 'Run';
      let rx = 0, ry = 0, rz = 0;
      if (b === 1) rx = run ? .12 : name === 'Swim' ? -.25 : name === 'Strength' ? .12 : 0;
      if (b === 4 && name === 'Idle') ry = Math.sin(phase) * .04;
      for (const [arm, sign] of [[5, 1], [8, -1]]) {
        const swing = Math.sin(phase + (sign > 0 ? 0 : Math.PI));
        if (b === arm) {
          rz = -sign * (name === 'Restrained' ? 0 : name === 'Strength' ? 1.32 : 1.40);
          rx = walk ? swing * (run ? .75 : .45) : name === 'Strength' ? -1.15 : name === 'Jump' ? -.55 : name === 'Swim' ? -1.3 + swing * .35 : Math.sin(phase) * .02;
        }
        if (b === arm + 1) ry = name === 'Restrained' ? 0 : -sign * (run ? 1 : name === 'Strength' ? .55 : .12);
      }
      for (const [leg, sign] of [[11, 1], [14, -1]]) {
        const swing = Math.sin(phase + (sign > 0 ? 0 : Math.PI));
        if (b === leg) rx = walk ? -swing * (run ? .75 : .48) : name === 'Jump' ? -.3 : 0;
        if (b === leg + 1) rx = walk ? Math.max(0, swing) * (run ? 1 : .65) : name === 'Jump' ? .6 : 0;
      }
      values.push(...new Quaternion().setFromEuler(new Euler(rx, ry, rz)).toArray());
    }
    samplers.push({ input, output: accessor(new Float32Array(values), 'VEC4'), interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: b + 2, path: 'rotation' } });
  }
  animations.push({ name, samplers, channels });
}
const imageView = original.bufferViews[original.images[0].bufferView];
const image = append(binary.subarray(imageView.byteOffset, imageView.byteOffset + imageView.byteLength));
const sceneNodes=[0,1];
const meshes=[{name:`${actor}Body`,primitives:[{attributes:attrs,indices:indexAccessor,material:0}]}];
if(pendantAccessor!==undefined){
  sceneNodes.push(nodes.length);nodes.push({name:'LanaPendant',mesh:1,skin:0});
  meshes.push({name:'LanaPendant',primitives:[{attributes:attrs,indices:pendantAccessor,material:0}]});
}
const document = { asset: { version: '2.0', generator: 'Smallville character preparation — provisional geometric skin weights' }, scene: 0, scenes: [{ nodes: [0, 1] }], nodes,
  meshes,
  skins: [{ name: 'ClarkHumanoid', inverseBindMatrices: inverseAccessor, skeleton: 2, joints: bones.map((_, i) => i + 2) }], animations,
  materials: original.materials, textures: [{ source: 0 }], images: [{ bufferView: image, mimeType: 'image/jpeg' }],
  buffers: [{ byteLength: length }], bufferViews: views, accessors };
document.scenes[0].nodes=sceneNodes;document.skins[0].name=`${actor}Humanoid`;
let json = Buffer.from(JSON.stringify(document)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(length); binHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, json, binHeader, ...chunks]);
mkdirSync(`public/models/${actor}`, { recursive: true }); writeFileSync(`public/models/${actor}/${actor}-rigged.glb`, output);
const report = { sourceTriangles: sourceIndices.length / 3, triangles: indices.length / 3, vertices: count, bytes: output.length, simplificationError: error, bones: bones.length, clips: animations.map(a => a.name), skinning: 'Provisional geometric weights; inspect extreme poses before production.' };
writeFileSync(`${directory}/rig-report.json`, JSON.stringify(report, null, 2)); console.log(report);
