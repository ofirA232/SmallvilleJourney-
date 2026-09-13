// Run from the project root: node docs/model-review/convert.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
const actor = process.argv[2] ?? 'clark';
if (!['clark', 'lana', 'lex'].includes(actor)) throw new Error('Unknown actor');
const directory = actor === 'clark' ? 'docs/model-review' : `docs/${actor}-review`;
const outputPath = actor === 'clark' ? 'public/models/review/submitted.glb' : `${directory}/submitted.glb`;
const root = new OBJLoader().parse(readFileSync(`${directory}/source/model.obj`, 'utf8'));
const parts = []; const views = []; const accessors = []; let length = 0;
function append(bytes, target) {
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const id = views.length;
  views.push({ buffer: 0, byteOffset: length, byteLength: data.length, ...(target ? { target } : {}) });
  parts.push(data); length += data.length;
  const pad = (4 - length % 4) % 4; parts.push(Buffer.alloc(pad)); length += pad;
  return id;
}
const meshes = []; let triangles = 0; let vertices = 0; const bounds = [];
root.traverse(object => {
  if (!object.isMesh) return;
  const geometry = mergeVertices(object.geometry, 1e-7);
  // Convert OBJ bottom-origin UVs to glTF top-origin UVs.
  const uv = geometry.getAttribute('uv');
  if (uv) for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  geometry.computeBoundingBox();
  const attributes = {};
  for (const [name, semantic] of [['position', 'POSITION'], ['normal', 'NORMAL'], ['uv', 'TEXCOORD_0']]) {
    const attr = geometry.getAttribute(name); if (!attr) continue;
    attributes[semantic] = accessors.length;
    accessors.push({ bufferView: append(attr.array, 34962), componentType: 5126, count: attr.count,
      type: attr.itemSize === 2 ? 'VEC2' : 'VEC3',
      ...(name === 'position' ? { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() } : {}) });
  }
  const indices = accessors.length;
  accessors.push({ bufferView: append(geometry.index.array, 34963), componentType: geometry.index.array instanceof Uint32Array ? 5125 : 5123, count: geometry.index.count, type: 'SCALAR' });
  triangles += geometry.index.count / 3; vertices += geometry.attributes.position.count;
  bounds.push({ min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() });
  meshes.push({ name: object.name, primitives: [{ attributes, indices, material: 0 }] });
});
const texture = append(readFileSync(`${directory}/source/tex_img0.jpg`));
const gltf = { asset: { version: '2.0', generator: 'Smallville model inspection; no rig or simplification added' },
  scene: 0, scenes: [{ nodes: meshes.map((_, i) => i) }], nodes: meshes.map((_, mesh) => ({ mesh })), meshes,
  materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 } }],
  textures: [{ source: 0 }], images: [{ bufferView: texture, mimeType: 'image/jpeg' }],
  buffers: [{ byteLength: length }], bufferViews: views, accessors };
let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const bin = Buffer.alloc(8); bin.writeUInt32LE(length); bin.writeUInt32LE(0x004e4942, 4);
mkdirSync('public/models/review', { recursive: true });
const output = Buffer.concat([header, json, bin, ...parts]);
writeFileSync(outputPath, output);
const report = { triangles, vertices, bounds, glbBytes: output.length, rig: false, animations: 0 };
writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2));
console.log(report);
