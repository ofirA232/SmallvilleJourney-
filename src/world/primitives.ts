import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const materials = new Map<string, THREE.MeshStandardMaterial>();
const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.IcosahedronGeometry(1, 1),
  rock: new THREE.IcosahedronGeometry(1, 0),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 7),
};
export function material(color: string, emissive = false) {
  const key = color + emissive;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true, emissive: emissive ? color : '#000000', emissiveIntensity: emissive ? 0.35 : 0 }));
  return materials.get(key)!;
}
export function group(parent?: THREE.Object3D, x = 0, y = 0, z = 0, dynamic = false) {
  const result = new THREE.Group(); result.position.set(x, y, z); result.userData.dynamic = dynamic;
  parent?.add(result); return result;
}
export function shape(parent: THREE.Object3D, kind: keyof typeof geometries, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const mesh = new THREE.Mesh(geometries[kind], material(color));
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function box(parent: THREE.Object3D, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) { return shape(parent, 'box', color, x, y, z, sx, sy, sz); }
export function ball(parent: THREE.Object3D, color: string, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) { return shape(parent, 'sphere', color, x, y, z, sx, sy, sz); }
export function cylinder(parent: THREE.Object3D, color: string, x: number, y: number, z: number, radius: number, height: number) { return shape(parent, 'cylinder', color, x, y, z, radius, height, radius); }
export function beam(parent: THREE.Object3D, color: string, start: number[], end: number[], radius = 0.035) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const mesh = cylinder(parent, color, 0, 0, 0, radius, a.distanceTo(b));
  mesh.position.copy(a).add(b).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); return mesh;
}
export function roof(parent: THREE.Object3D, width: number, depth: number, height: number, y: number, color: string) {
  const geom = new THREE.BufferGeometry();
  const w = width / 2, d = depth / 2;
  geom.setAttribute('position', new THREE.Float32BufferAttribute([
    -w,y,-d, 0,y+height,-d, w,y,-d, -w,y,d, w,y,d, 0,y+height,d,
    -w,y,-d, -w,y,d, 0,y+height,d, -w,y,-d, 0,y+height,d, 0,y+height,-d,
    0,y+height,-d, 0,y+height,d, w,y,d, 0,y+height,-d, w,y,d, w,y,-d,
  ], 3)); geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, material(color)); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function fence(parent: THREE.Object3D, start: number[], end: number[], count = 6, color = '#e6d4ab') {
  for (let i = 0; i <= count; i++) {
    const f = i / count;
    box(parent, color, THREE.MathUtils.lerp(start[0], end[0], f), 0.33, THREE.MathUtils.lerp(start[1], end[1], f), 0.085, 0.66, 0.085);
  }
  for (const y of [0.24, 0.48]) beam(parent, color, [start[0], y, start[1]], [end[0], y, end[1]], 0.031);
}
export function flower(parent: THREE.Object3D, x: number, z: number, color = '#f2d28d') {
  cylinder(parent, '#5f8351', x, 0.11, z, 0.009, 0.22);
  ball(parent, color, x, 0.23, z, 0.07, 0.04, 0.07);
  ball(parent, '#f6e2aa', x, 0.26, z, 0.025);
}
export function windowBox(parent: THREE.Object3D, x: number, y: number, z: number, width = 0.4, height = 0.6) {
  box(parent, '#e7dcbc', x, y, z, width + 0.075, height + 0.075, 0.035);
  box(parent, '#5c8d8b', x, y, z + 0.025, width, height, 0.04);
  box(parent, '#d9ceac', x, y, z + 0.051, 0.025, height, 0.015);
  box(parent, '#d9ceac', x, y, z + 0.053, width, 0.025, 0.015);
}
export function plaque(parent:THREE.Object3D,text:string,x:number,y:number,z:number,width:number,height:number,background='#29443c',ink='#efe1b9'){
  const root=group(parent,x,y,z,true);
  box(root,background,0,0,0,width,height,.035);
  if(typeof document==='undefined')return root;
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*height/width);
  const context=canvas.getContext('2d');if(!context)return root;
  context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle=ink;
  context.textAlign='center';context.textBaseline='middle';context.font=`600 ${Math.min(canvas.height*.46,canvas.width/(text.length*.69))}px Georgia`;
  context.fillText(text,canvas.width/2,canvas.height/2,canvas.width*.92);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}));label.position.z=.022;root.add(label);return root;
}
/** A printed page: a bold headline, a few lines of text and, optionally, a photograph of someone.
 * It is a dynamic group, like plaque(), so scenery batching keeps its texture. */
export function clipping(parent:THREE.Object3D,title:string,lines:string[],x:number,y:number,z:number,width:number,height:number,photo=false,paper='#ece2c4'){
  const root=group(parent,x,y,z,true);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:paper}));root.add(mesh);
  if(typeof document==='undefined')return root;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.round(512*height/width);
  const context=canvas.getContext('2d');if(!context)return root;
  context.fillStyle=paper;context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#2a2620';context.textBaseline='top';
  context.font='700 44px Georgia';context.fillText(title,24,20,canvas.width-48);
  let text=24;
  if(photo){context.fillStyle='#8f887a';context.fillRect(24,84,150,170);context.fillStyle='#4d463d';context.beginPath();context.arc(99,150,34,0,Math.PI*2);context.fill();context.fillRect(49,196,100,58);text=196;}
  context.fillStyle='#3b362e';context.font='26px Georgia';lines.forEach((line,index)=>context.fillText(line,text,86+index*36,canvas.width-text-24));
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mat=mesh.material as THREE.MeshBasicMaterial;mat.map=texture;mat.color.set('#ffffff');
  return root;
}
export function gambrelRoof(parent:THREE.Object3D,width:number,depth:number,height:number,y:number){
  const profile=[[-width/2,0],[-width*.33,height*.73],[0,height],[width*.33,height*.73],[width/2,0]];
  for(let i=0;i<profile.length-1;i++){
    const [a,b]=[profile[i],profile[i+1]],vertices:number[]=[];
    vertices.push(a[0],y+a[1],-depth/2,a[0],y+a[1],depth/2,b[0],y+b[1],depth/2,a[0],y+a[1],-depth/2,b[0],y+b[1],depth/2,b[0],y+b[1],-depth/2);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
    const mat=material('#59616a');mat.side=THREE.DoubleSide;const panel=new THREE.Mesh(geometry,mat);panel.castShadow=true;parent.add(panel);
    for(const z of [-depth/2,depth/2])beam(parent,'#e5dac4',[a[0],y+a[1],z],[b[0],y+b[1],z],.035);
  }
  for(const z of [-depth/2+.02,depth/2-.02]){
    const outline=new THREE.Shape();outline.moveTo(profile[0][0],y);for(const [x,h] of profile.slice(1))outline.lineTo(x,y+h);outline.closePath();
    const face=new THREE.Mesh(new THREE.ShapeGeometry(outline),material('#a74439'));face.position.z=z;face.material.side=THREE.DoubleSide;parent.add(face);
  }
}

/** Bake a material's flat colour into a vertex colour attribute so meshes of many colours share one draw call. */
export function bakeColor(geometry: THREE.BufferGeometry, color: THREE.Color) {
  const count = geometry.attributes.position.count, colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
/** A colour-only standard material can join a shared vertex-coloured batch; anything textured, emissive or transparent stays separate. */
export function plainMaterial(material: THREE.Material): material is THREE.MeshStandardMaterial {
  return material instanceof THREE.MeshStandardMaterial && !material.map && !material.transparent && material.metalness === 0 && material.emissive.getHex() === 0;
}
/** Merge only immutable scenery; moving/story props and character rigs stay separate. */
export function batchScenery(root: THREE.Group) {
  root.updateWorldMatrix(true, true);
  type Bucket = { geometry: THREE.BufferGeometry[]; meshes: THREE.Mesh[]; material: THREE.Material };
  const buckets = new Map<string, Bucket>();
  const visit = (object: THREE.Object3D) => {
    if (object.userData.dynamic) return;
    if (object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh) && !Array.isArray(object.material)) {
      const source = object.material, plain = plainMaterial(source);
      // One batch per shading variant rather than per colour: 190 colours become a handful of draw calls.
      const key = plain ? `plain|${source.flatShading}|${source.roughness}|${source.side}` : `material|${source.uuid}`;
      const data: Bucket = buckets.get(key) ?? { geometry: [], meshes: [], material: plain ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: source.roughness, flatShading: source.flatShading, side: source.side }) : source };
      const transformed = object.geometry.clone().applyMatrix4(object.matrixWorld);
      transformed.deleteAttribute('uv');
      const geometry = transformed.index ? transformed.toNonIndexed() : transformed;
      if (geometry !== transformed) transformed.dispose();
      data.geometry.push(plain ? bakeColor(geometry, source.color) : geometry); data.meshes.push(object);
      buckets.set(key, data);
    }
    for (const child of [...object.children]) visit(child);
  };
  visit(root);
  for (const data of buckets.values()) {
    const geometry = mergeGeometries(data.geometry, false);
    data.geometry.forEach(value => value.dispose());
    if (!geometry) continue;
    data.meshes.forEach(mesh => mesh.removeFromParent());
    const combined = new THREE.Mesh(geometry, data.material); combined.castShadow = combined.receiveShadow = true;
    root.add(combined);
  }
}
