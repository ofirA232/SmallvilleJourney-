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
export function car(parent: THREE.Object3D, color: string, truck = false) {
  const root = group(parent, 0, 0, 0, true);
  box(root, color, 0, 0.33, 0, 0.9, 0.27, 1.6);
  box(root, color, 0, 0.61, truck ? -0.28 : 0, 0.81, 0.32, truck ? 0.64 : 0.85);
  box(root, '#aac4bd', 0, 0.65, -0.45, 0.68, 0.23, 0.03);
  box(root, '#344f52', 0, 0.64, truck ? 0.05 : 0.46, 0.67, 0.22, 0.025);
  if (truck) box(root, '#686c60', 0, 0.47, 0.51, 0.75, 0.025, 0.63);
  for (const x of [-0.47, 0.47]) for (const z of [-0.48, 0.5]) {
    const wheel = cylinder(root, '#35423b', x, 0.2, z, 0.2, 0.1); wheel.rotation.z = Math.PI / 2;
    const hub = cylinder(root, '#a7aca2', x * 1.02, 0.2, z, 0.085, 0.105); hub.rotation.z = Math.PI / 2;
  }
  for (const x of [-0.28, 0.28]) box(root, '#eee3b3', x, 0.38, -0.81, 0.17, 0.13, 0.03);
  return root;
}

/** Merge only immutable scenery; moving/story props and character rigs stay separate. */
export function batchScenery(root: THREE.Group) {
  root.updateWorldMatrix(true, true);
  const buckets = new Map<THREE.Material, { geometry: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  const visit = (object: THREE.Object3D) => {
    if (object.userData.dynamic) return;
    if (object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh) && !Array.isArray(object.material)) {
      const data = buckets.get(object.material) ?? { geometry: [], meshes: [] };
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      geometry.deleteAttribute('uv');
      data.geometry.push(geometry.index ? geometry.toNonIndexed() : geometry); data.meshes.push(object);
      buckets.set(object.material, data);
    }
    for (const child of [...object.children]) visit(child);
  };
  visit(root);
  for (const [mat, data] of buckets) {
    const geometry = mergeGeometries(data.geometry, false);
    data.geometry.forEach(value => value.dispose());
    if (!geometry) continue;
    data.meshes.forEach(mesh => mesh.removeFromParent());
    const combined = new THREE.Mesh(geometry, mat); combined.castShadow = combined.receiveShadow = true;
    root.add(combined);
  }
}
