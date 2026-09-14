import * as THREE from 'three';
import { locations } from '../content/locations';
import { at, basis, centers, distance, isLocked, isWater, nearestLocation, PLANET_RADIUS, surfaceRadius, terrainRadius, UP, WATER_RADIUS } from '../core/sphere';
import type { Collider } from '../core/sphere';
import type { Story } from '../core/story';
import type { ActorId, LocationId, MemoryDefinition, Point, StoryPropId, WorldPosition } from '../types';
import { Character } from './character';
import { kentBarn, smallvilleSchool } from './architecture';
import { countryFence, cow, cropRows, cityBlock } from './countryside';
import { ball, batchScenery, beam, box, car, cylinder, fence, flower, group, material, plaque, roof, shape, windowBox } from './primitives';

export class World {
  root = new THREE.Group();
  scenery = new THREE.Group();
  terrain: THREE.Mesh;
  water: THREE.Mesh;
  colliders: Collider[] = [];
  characters = new Map<ActorId, Character>();
  landmarkAnchors = new Map<LocationId, THREE.Vector3>();
  dynamic: { crate?: THREE.Group; ship?: THREE.Group; car?: THREE.Group; truck?: THREE.Group; rotor?: THREE.Group; fountain?: THREE.Group; spray?: THREE.Group } = {};
  marker = new THREE.Group();
  scarecrowBindings?:THREE.Group;
  markerDiamond: THREE.Mesh;
  markerRing: THREE.Mesh;
  markerNormal = at('farm');
  clouds: THREE.Group[] = [];
  private cloudMeshes:THREE.InstancedMesh[]=[];
  private cloudPuffs:{cloud:number;mesh:number;index:number;local:THREE.Matrix4}[]=[];
  private puffMatrix=new THREE.Matrix4();
  meteorGroup = new THREE.Group();
  skyPoints: THREE.Points;
  roadPoints: THREE.Vector3[] = [];
  private randomSeed = 87651;
  private night = false;
  private stage = 0;
  memoryMarkers=new Map<string,THREE.Group>();
  private preview:{id:StoryPropId;position:THREE.Vector3;tilt:number;amount:number}|null=null;
  private propDefaults=new Map<StoryPropId,{position:THREE.Vector3;quaternion:THREE.Quaternion;tilt:number}>();
  constructor(private protectedPoints:WorldPosition[] = []) {
    this.root.name = 'Smallville'; this.root.add(this.scenery);
    const terrain = new THREE.IcosahedronGeometry(PLANET_RADIUS, 56);
    const positions = terrain.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i += 3) {
      const center = new THREE.Vector3();
      for (let j = 0; j < 3; j++) {
        const normal = new THREE.Vector3().fromBufferAttribute(positions, i + j).normalize(); center.add(normal);
        const radius = terrainRadius(normal); positions.setXYZ(i + j, normal.x * radius, normal.y * radius, normal.z * radius);
      }
      center.normalize();
      color.set(nearestLocation(center).color).multiplyScalar(0.985 + this.random() * 0.03);
      if (isWater(center)) color.set('#598e80').multiplyScalar(0.9 + this.random() * 0.1);
      for (let j = 0; j < 3; j++) { colors[(i+j)*3] = color.r; colors[(i+j)*3+1] = color.g; colors[(i+j)*3+2] = color.b; }
    }
    terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3)); terrain.computeVertexNormals();
    this.terrain = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, flatShading: true }));
    this.terrain.receiveShadow = true; this.root.add(this.terrain);
    this.water = new THREE.Mesh(new THREE.IcosahedronGeometry(WATER_RADIUS, 40), new THREE.MeshStandardMaterial({ color: '#4eafac', transparent: true, opacity: 0.76, metalness: 0.08, roughness: 0.35, flatShading: true }));
    this.water.renderOrder = 2; this.root.add(this.water);
    this.addRoads();
    this.buildFarm(); this.buildSchool(); this.buildBridge(); this.buildMansion(); this.buildCemetery(); this.buildCornfield(); this.buildMetropolis();
    this.buildCountryside(); this.addVegetation(); this.addClouds();
    batchScenery(this.scenery);
    for(const id of ['crate','ship','car','truck','spray'] as StoryPropId[]){const prop=this.dynamic[id]!;this.propDefaults.set(id,{position:prop.position.clone(),quaternion:prop.quaternion.clone(),tilt:prop.children[0]?.rotation.z??0});}
    for (const id of ['jonathan', 'martha', 'pete', 'chloe', 'lana', 'lex', 'whitney', 'jeremy'] as ActorId[]) {
      const actor = new Character(id, id === 'jonathan' ? 1.04 : ['lana','chloe','martha'].includes(id) ? .90 : .95); this.characters.set(id, actor); this.root.add(actor.root);
    }
    this.marker.userData.dynamic = true;
    this.markerRing = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.018, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffe1a2', transparent: true, opacity: 0.9, depthWrite: false }));
    this.markerRing.rotation.x = Math.PI / 2; this.markerRing.position.y = 0.045; this.marker.add(this.markerRing);
    this.markerDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: '#ffe0a0' }));
    this.markerDiamond.position.y = 1.9; this.marker.add(this.markerDiamond);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.5, 4), new THREE.MeshBasicMaterial({ color: '#dfc68c', transparent: true, opacity: 0.48 }));
    stem.position.y = 1.52; this.marker.add(stem); this.root.add(this.marker);
    const starPositions: number[] = [];
    for (let i = 0; i < 360; i++) {
      const normal = new THREE.Vector3(this.random() * 2 - 1, this.random() * 2 - 1, this.random() * 2 - 1).normalize().multiplyScalar(110 + this.random() * 20);
      starPositions.push(normal.x, normal.y, normal.z);
    }
    const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    this.skyPoints = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#bad1be', size: 0.095, transparent: true, opacity: 0.55, sizeAttenuation: true })); this.root.add(this.skyPoints);
    for (let i = 0; i < 12; i++) {
      const meteor = group(this.meteorGroup);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshBasicMaterial({ color: i % 3 ? '#f6c77c' : '#a2dc88' })); meteor.add(orb);
      const trail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 3, 5), new THREE.MeshBasicMaterial({ color: '#e1b47c', transparent: true, opacity: 0.45 })); trail.position.y = 1.5; meteor.add(trail);
    }
    this.meteorGroup.visible = false; this.root.add(this.meteorGroup);
    for (const location of locations) this.landmarkAnchors.set(location.id, at(location.id, [0, 0]).multiplyScalar(PLANET_RADIUS + 3.8));
  }
  random() { this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0; return this.randomSeed / 4294967296; }
  anchor(id: LocationId, point: Point = [0, 0], lift = 0, dynamic = false) {
    const result = group(this.scenery, 0, 0, 0, dynamic);
    const normal = at(id, point); const { east, north } = basis(normal);
    result.position.copy(normal).multiplyScalar(surfaceRadius(normal) + lift);
    result.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, normal, north.negate()));
    return result;
  }
  collider(id: LocationId, point: Point, radius: number) { this.colliders.push({ normal: at(id, point), radius }); }
  ruralClear(normal: THREE.Vector3) {
    return !isWater(normal) && !this.roadPoints.some(point => distance(normal,point)<.8)
      && !this.protectedPoints.some(point => distance(normal,at(point.location,point.point))<1.35);
  }
  groundFence(id: LocationId, start: Point, end: Point, white=false) {
    countryFence(this.scenery,id,start,end,n=>!isWater(n)
      && !this.roadPoints.some(p=>distance(n,p)<.55)
      && !this.protectedPoints.some(p=>distance(n,at(p.location,p.point))<.65),white);
  }
  patch(id: LocationId, point: Point, width: number, depth: number, color: string, lift=.025) {
    const geom = new THREE.BufferGeometry(); const vertices: number[] = [];
    const stepsX = Math.max(2, Math.ceil(width / 0.3)), stepsZ = Math.max(2, Math.ceil(depth / 0.3));
    const sample = (x: number, z: number) => { const n = at(id, [point[0] + (x / stepsX - 0.5) * width, point[1] + (z / stepsZ - 0.5) * depth]); return n.multiplyScalar(surfaceRadius(n) + lift).toArray(); };
    for (let x = 0; x < stepsX; x++) for (let z = 0; z < stepsZ; z++) {
      const a = sample(x,z), b = sample(x+1,z), c = sample(x,z+1), d = sample(x+1,z+1);
      vertices.push(...a,...c,...b,...b,...c,...d);
    }
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geom.computeVertexNormals();
    const mat = material(color); mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geom, mat); mesh.receiveShadow = true; this.scenery.add(mesh); return mesh;
  }
  path(a: THREE.Vector3, b: THREE.Vector3, width = 0.6) {
    const length = distance(a, b), steps = Math.ceil(length / 0.3);
    const vertices: number[] = [];
    const cross = new THREE.Vector3().crossVectors(a, b).normalize();
    for (let i = 0; i < steps; i++) {
      const points: THREE.Vector3[] = [];
      for (const t of [i / steps, (i + 1) / steps]) {
        const n = a.clone().lerp(b, t).normalize();
        this.roadPoints.push(n.clone());
        for (const side of [-1, 1]) {
          const position = n.clone().multiplyScalar(PLANET_RADIUS).addScaledVector(cross, width * side / 2).normalize();
          position.multiplyScalar(surfaceRadius(position) + 0.035); points.push(position);
        }
      }
      if(!isWater(a.clone().lerp(b,(i+.5)/steps).normalize()))vertices.push(...points[0].toArray(),...points[2].toArray(),...points[1].toArray(),...points[1].toArray(),...points[2].toArray(),...points[3].toArray());
    }
    const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geom.computeVertexNormals();
    const mat = material('#d2bf94'); mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geom, mat); mesh.receiveShadow = true; this.scenery.add(mesh);
  }
  addRoads() {
    const links: [LocationId, LocationId][] = [['farm','school'],['farm','bridge'],['farm','mansion'],['farm','cemetery'],['farm','cornfield'],['school','bridge'],['mansion','cornfield']];
    for (const [a, b] of links) this.path(at(a,[0,3.5]), at(b,[0,3.5]), 0.72);
    for (const location of locations.filter(value => !value.locked)) this.path(at(location.id,[0,3.5]), at(location.id,[0,0.8]), 0.9);
  }
  buildFarm() {
    this.patch('farm',[0,1.7],5.8,3,'#cabb91');
    const barn = this.anchor('farm',[-2,-1.9]);
    kentBarn(barn);
    this.collider('farm',[-2,-2],1.6);
    const house = this.anchor('farm',[2.1,-1.8]);
    box(house,'#e5c878',0,1.03,0,2.2,2.1,2.2); roof(house,2.55,2.58,.9,2.04,'#55666a');
    for (let y=.2;y<2.06;y+=.15) box(house,'#c8b069',0,y,1.11,2.18,.016,.02);
    box(house,'#685e46',0,.52,1.13,.4,1.04,.04);
    windowBox(house,-.67,.9,1.13,.42,.56); windowBox(house,.67,.9,1.13,.42,.56);
    windowBox(house,-.6,1.8,1.13,.35,.4);windowBox(house,.6,1.8,1.13,.35,.4);
    box(house,'#e2d6b2',0,.06,1.46,2.5,.13,.77);
    for(const x of [-1.05,1.05]) box(house,'#e9dfbe',x,.75,1.7,.065,1.5,.065);
    box(house,'#687475',0,1.45,1.4,2.5,.1,.9);
    for(const side of [-1,1]){fence(house,[side*.4,1.77],[side*1.05,1.77],3,'#eee1c1');}
    box(house,'#a47d5b',.72,2.23,-.35,.32,.84,.38);
    box(house,'#847767',0,.02,0,2.24,.16,2.24);
    for(const side of [-1,1]) {
      const wall=group(house,side*1.11,0,0);wall.rotation.y=side*Math.PI/2;
      for(let y=.2;y<2.06;y+=.15)box(wall,'#c8b069',0,y,0,2.18,.016,.02);
      for(const x of [-.61,.61])for(const y of [.85,1.72])windowBox(wall,x,y,.03,.39,.51);
      for(const z of [-1.1,1.1])box(house,'#e9dfbe',side*1.08,1.05,z,.075,2.1,.075);
      for(let x=.47;x<1.05;x+=.12)box(house,'#e9dfbe',side*x,.4,1.77,.025,.49,.025);
      box(house,'#e9dfbe',side*1.05,.13,1.7,.15,.2,.15);
    }
    box(house,'#e2d6b2',0,.015,1.94,.83,.09,.3);
    this.collider('farm',[2.1,-1.9],1.38);
    const silo = this.anchor('farm',[-4.3,-2.4]);
    cylinder(silo,'#aebcb0',0,1.25,0,.53,2.5); ball(silo,'#c9ccba',0,2.48,0,.55,.3,.55);
    for(const y of [.4,.95,1.5,2.05]) { const ring=new THREE.Mesh(new THREE.TorusGeometry(.54,.018,5,20),material('#7f9285')); ring.rotation.x=Math.PI/2; ring.position.y=y; silo.add(ring); }
    for(const x of [-.12,.12])beam(silo,'#7f9285',[x,.18,.55],[x,2.55,.55],.018);
    for(let y=.24;y<2.55;y+=.17)beam(silo,'#7f9285',[-.12,y,.55],[.12,y,.55],.013);
    this.collider('farm',[-4.3,-2.4],.57);
    const mill=this.anchor('farm',[-4.6,.5]);
    for(const side of [-1,1]) beam(mill,'#a4ae99',[side*.34,0,0],[side*.075,2.55,0],.034);
    beam(mill,'#a4ae99',[-.27,.55,0],[.18,1.75,0],.025);
    this.dynamic.rotor=group(mill,0,2.55,0,true);
    for(let i=0;i<8;i++){ const blade=box(this.dynamic.rotor,'#c6c9ad',0,.39,0,.14,.63,.032); const carrier=group(this.dynamic.rotor); carrier.add(blade); carrier.rotation.z=i*Math.PI/4; }
    cylinder(this.dynamic.rotor,'#9b8c6a',0,0,0,.09,.12).rotation.x=Math.PI/2;
    this.groundFence('farm',[-4.6,3.2],[-1.4,3.2],true); this.groundFence('farm',[1.7,3.2],[4.6,3.2],true); this.groundFence('farm',[4.6,3.2],[4.6,.6],true);
    const tractor=this.anchor('farm',[3.9,-4]);
    box(tractor,'#567a56',0,.46,0,.63,.42,1.12); box(tractor,'#75935c',0,.57,-.34,.55,.37,.43); box(tractor,'#a3b69d',0,1.05,.18,.83,.055,.77);
    for(const x of [-.35,.35])for(const z of [-.4,.4]){const wheel=cylinder(tractor,'#465043',x,z>0?.32:.22,z,z>0?.33:.22,.18);wheel.rotation.z=Math.PI/2;}
    for(const x of [-.31,.31])box(tractor,'#56695a',x,.82,.4,.045,.55,.045);
    for(let i=0;i<5;i++){const hay=this.anchor('farm',[-4.1+i%2*.58,-4.4+Math.floor(i/2)*.58]);cylinder(hay,'#d4b56d',0,.26,0,.28,.48).rotation.z=Math.PI/2;}
    this.dynamic.crate=this.anchor('farm',[1.7,1.6],0,true); box(this.dynamic.crate,'#b88b54',0,.25,0,.55,.5,.52);
    for(const y of [.08,.25,.43])box(this.dynamic.crate,'#dbb572',0,y,.267,.57,.035,.025);
    this.dynamic.ship=this.anchor('farm',[-2,.5],0,true);
    box(this.dynamic.ship,'#756953',0,.04,0,1.2,.08,1.65);
    for(const x of [-.66,.66]){const hatch=box(this.dynamic.ship,'#9a8057',x,.22,0,.55,.055,1.6);hatch.rotation.z=x<0?-.6:.6;}
    ball(this.dynamic.ship,'#658b89',0,.23,0,.52,.23,.8); ball(this.dynamic.ship,'#aaccc0',0,.36,-.05,.29,.13,.38);
    for(const x of [-.36,.36])box(this.dynamic.ship,'#b7d7ac',x,.27,.05,.035,.02,.45);
    for(let i=0;i<12;i++){const a=this.anchor('farm',[2.8+this.random()*.8,.1+this.random()*.8]);flower(a,0,0,i%2?'#e9cb82':'#eee4bd');}
    const mailbox=this.anchor('farm',[-.85,3.4]);box(mailbox,'#8b6c49',0,.38,0,.065,.76,.065);box(mailbox,'#ac4337',0,.79,0,.34,.24,.23);plaque(mailbox,'KENT',0,.79,.13,.28,.12,'#ac4337');
  }
  buildSchool() {
    this.patch('school',[0,1],7,4.5,'#c5bd9c');
    const school=this.anchor('school',[0,-2.25]);
    smallvilleSchool(school);
    for(const x of [-2,-.8,.8,2]) this.collider('school',[x,-2.2],1.13);
    this.patch('school',[5.4,-4.1],3.5,5.8,'#6e9663');
    for(let z=-6.3;z<=-2;z+=.63)this.patch('school',[5.4,z],3.2,.035,'#d2d4ad');
    for(const z of [-7,-1.3]){const goal=this.anchor('school',[5.4,z]);beam(goal,'#e5c991',[0,0,0],[0,.9,0],.035);beam(goal,'#e5c991',[-.8,.9,0],[.8,.9,0],.035);beam(goal,'#e5c991',[-.8,.9,0],[-.8,1.6,0],.029);beam(goal,'#e5c991',[.8,.9,0],[.8,1.6,0],.029);}
    const flag=this.anchor('school',[-2.8,.1]);cylinder(flag,'#b6b8a4',0,1.4,0,.028,2.8);box(flag,'#b44d39',.24,2.57,0,.48,.3,.022);box(flag,'#edd7a5',.24,2.6,.015,.32,.035,.014);
    const wall=this.anchor('school',[4.1,-.7]);
    box(wall,'#78684e',0,.85,0,1.8,1.27,.14);for(const x of [-.79,.79])box(wall,'#827352',x,.46,0,.055,.92,.075);
    for(let i=0;i<7;i++){const paper=box(wall,i%3?'#e3d5af':'#c7b9a0',-.6+(i%3)*.59,.53+Math.floor(i/3)*.32,.09,.39,.25,.01);paper.rotation.z=(i%2?.05:-.05);for(let j=0;j<2;j++)box(wall,'#9b9276',paper.position.x,paper.position.y+j*.055,.102,.23,.014,.01);}
    box(wall,'#344e46',0,1.61,.05,2.02,.24,.19);
    plaque(wall,'WALL OF WEIRD',0,1.61,.16,1.94,.2);
    const table=this.anchor('school',[4.9,.3]);box(table,'#9e825b',0,.56,0,.68,.06,.42);for(const x of [-.25,.25])box(table,'#6c7052',x,.27,0,.035,.54,.28);box(table,'#e4d7b9',0,.6,0,.34,.014,.25);
    const valve=this.anchor('school',[-3.9,-1]);box(valve,'#697c70',0,.37,0,.29,.72,.28);const wheel=new THREE.Mesh(new THREE.TorusGeometry(.16,.026,6,14),material('#b36445'));wheel.position.set(0,.62,.18);valve.add(wheel);
    this.dynamic.truck=this.anchor('school',[-4.5,1.7],0,true);car(this.dynamic.truck,'#8b9c8d',true).rotation.y=Math.PI;
    this.dynamic.spray=this.anchor('school',[-4.5,1.3],0,true);
    for(let i=0;i<9;i++)ball(this.dynamic.spray,'#a0d7d0',(this.random()-.5)*.7,.3+this.random()*.9,(this.random()-.5)*.6,.038,.09,.038);
    this.dynamic.spray.visible=false;
    const bike=this.anchor('school',[-2.5,2.8]);for(const x of [-.3,.3]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.22,.02,5,14),material('#4d6252'));wheel.position.set(x,.24,0);bike.add(wheel);}beam(bike,'#b08357',[-.3,.24,0],[0,.56,0],.02);beam(bike,'#b08357',[0,.56,0],[.3,.24,0],.02);
  }
  buildBridge() {
    const bridge=this.anchor('bridge',[0,0],-.36);
    box(bridge,'#898e83',0,.2,0,5.8,.32,1.38);
    box(bridge,'#555e59',0,.365,0,5.8,.018,1.2);
    for(let x=-2.5;x<2.6;x+=.65)box(bridge,'#d5c28b',x,.378,0,.34,.012,.025);
    for(const z of [-.56,.56])box(bridge,'#d4cfb2',0,.38,z,5.8,.015,.025);
    for(const side of [-1,1]){
      const z=side*.69;
      beam(bridge,'#749089',[-2.8,.34,z],[2.8,.34,z],.065);
      beam(bridge,'#657b76',[-2.8,1.5,z],[2.8,1.5,z],.055);
      beam(bridge,'#657b76',[-2.8,1.5,z],[-1.65,2.05,z],.045);
      beam(bridge,'#657b76',[-1.65,2.05,z],[1.65,2.05,z],.045);
      beam(bridge,'#657b76',[1.65,2.05,z],[2.8,1.5,z],.045);
      for(const x of [-1.65,0,1.65])beam(bridge,'#657b76',[x,.4,z],[x,2.05,z],.04);
      for(let x=-2.8;x<=2.8;x+=.8){beam(bridge,'#8d9d8f',[x,.34,z],[x,1.5,z],.032);if(x<2.5)beam(bridge,'#8d9d8f',[x,.38,z],[x+.8,1.49,z],.025);}
    }
    for(const x of [-1.8,1.8]){box(bridge,'#858f7d',x,-.4,0,.48,1.1,1.1);box(bridge,'#b0ae98',x,.025,0,.69,.16,1.3);}
    for(const x of [-2.73,2.73]){const sign=group(bridge,x,.76,.82);box(sign,'#b6ac86',0,0,0,.19,.42,.035);for(const y of [-.13,0,.13]){const stripe=box(sign,'#4e5347',0,y,.023,.18,.055,.018);stripe.rotation.z=-.4;}}
    this.dynamic.car=this.anchor('bridge',[0,-1.7],-.25,true);car(this.dynamic.car,'#a9b8b2').rotation.set(.13,.25,.18);
    const bank=this.anchor('bridge',[3,1.5]);box(bank,'#b7aa83',0,.04,0,1.05,.08,.8);
    const reeds=this.anchor('bridge',[2,-2.8]);for(let i=0;i<12;i++){const x=(this.random()-.5)*1.4,z=(this.random()-.5)*.9;beam(reeds,'#789971',[x,0,z],[x+.05,.45+this.random()*.25,z],.016);}
    for(let i=0;i<8;i++){const stone=this.anchor('bridge',[(i%2?1:-1)*(1.3+this.random()*.3),-4+i*.9]);shape(stone,'rock','#93a492',0,.08,0,.16,.12,.24);}
  }
  buildMansion() {
    this.patch('mansion',[0,1.5],4.7,3.7,'#a6b29a');
    const mansion=this.anchor('mansion',[0,-2]);
    box(mansion,'#8a9591',0,1.2,0,4.7,2.5,3.0);roof(mansion,5.05,3.35,.9,2.4,'#515f60');
    box(mansion,'#93978c',.85,2.05,.35,1.35,4.1,1.65);
    box(mansion,'#b9b7a1',.85,3.92,.35,1.52,.14,1.8);
    for(const x of [.23,.65,1.07,1.49])for(const z of [-.42,1.12])box(mansion,'#999d8f',x,4.19,z,.22,.38,.24);
    for(const y of [1.7,2.8,3.5])windowBox(mansion,.85,y,1.2,.37,.5);
    for(const x of [-1.6,2]){const gable=group(mansion,x,0,.1);roof(gable,1.65,3.23,1.25,2.4,'#455b5f');windowBox(gable,0,2.7,1.62,.36,.53);box(gable,'#c2bda9',.42,3.25,-.8,.21,1.15,.24);}
    for(const x of [-2.2,-1.85,-.25,.22,1.48,2.2])for(let y=.3;y<3.4;y+=.42){if(y>2.4&&x<.2)continue;box(mansion,'#576e49',x,y,1.54,.19,.47,.06);}
    for(const x of [-1.3,-.62,.62,1.3])windowBox(mansion,x,1.72,1.52,.28,.78);
    box(mansion,'#d1cbb3',0,.78,1.62,.84,1.56,.3);box(mansion,'#514f42',0,.7,1.8,.54,1.35,.035);
    box(mansion,'#b7b39b',0,.08,1.95,1.6,.15,.74);
    for(const x of [-1.7,0,1.7])this.collider('mansion',[x,-2.1],1.5);
    const gates=this.anchor('mansion',[0,3.4]);for(const x of [-2.3,2.3]){box(gates,'#9b9f8b',x,.67,0,.35,1.35,.35);ball(gates,'#d5ccab',x,1.43,0,.19);}
    for(const side of [-1,1])for(let i=0;i<7;i++){const x=side*(.65+i*.22);box(gates,'#536857',x,.52,0,.025,1,.025);}
    for(const side of [-1,1]){const hedge=this.anchor('mansion',[side*2.55,1.3]);box(hedge,'#567e5e',0,.29,0,.47,.58,2.4);}
    const fountain=this.anchor('mansion',[-3.6,1.0]);cylinder(fountain,'#b6b69e',0,.16,0,.71,.32);cylinder(fountain,'#75aaa0',0,.34,0,.59,.028);cylinder(fountain,'#c6c3ab',0,.59,0,.1,.55);ball(fountain,'#d7ceae',0,.9,0,.14);this.collider('mansion',[-3.6,1],.72);
  }
  buildCemetery() {
    this.patch('cemetery',[0,1.4],1.2,5,'#bfbd98');
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const grave=this.anchor('cemetery',[side*(1.2+i%2*.42),-2.5+i*1.0]);
      box(grave,'#a9b3a0',0,.28,0,.4,.54,.16);ball(grave,'#b8c1aa',0,.53,0,.2,.1,.085);box(grave,'#c0c4aa',0,.036,.4,.47,.06,.82);
      box(grave,'#829481',0,.31,.086,.15,.023,.012);flower(grave,.1,.5,i%2?'#d9b2a2':'#ecdcaa');
      this.collider('cemetery',[side*(1.2+i%2*.42),-2.5+i*1.0],.24);
    }
    const bench=this.anchor('cemetery',[.6,2.5]);box(bench,'#9d8760',0,.34,0,1.3,.09,.37);box(bench,'#aa956d',0,.64,-.17,1.3,.32,.065);for(const x of [-.48,.48])box(bench,'#69735a',x,.16,0,.055,.32,.3);
    const arch=this.anchor('cemetery',[0,3.7]);for(const x of [-1,1])box(arch,'#9ca88e',x,.63,0,.32,1.3,.4);beam(arch,'#6d816a',[-1,1.28,0],[0,1.78,0],.07);beam(arch,'#6d816a',[0,1.78,0],[1,1.28,0],.07);
    const angel=this.anchor('cemetery',[-2.1,-2.3]);box(angel,'#c1c1ab',0,.12,0,.52,.24,.5);shape(angel,'cone','#d0ceb8',0,.6,0,.2,.8,.2);ball(angel,'#d7d2bd',0,1.08,0,.13,.16,.13);for(const side of [-1,1]){const wing=ball(angel,'#c5c8b3',side*.29,.84,-.055,.16,.42,.055);wing.rotation.z=side*-.55;}
  }
  buildCornfield() {
    this.patch('cornfield',[0,-.8],7.8,7.7,'#ae9c66');
    this.patch('cornfield',[0,1],.8,6.5,'#c5b07a');
    const pole=this.anchor('cornfield',[0,.1]);box(pole,'#8e714c',0,1,0,.13,2,.13);box(pole,'#9f7a4e',0,1.38,0,1.65,.11,.1);
    this.scarecrowBindings=this.anchor('cornfield',[0,.24],0,true);
    for(const x of [-.64,.64]){
      const rope=new THREE.Mesh(new THREE.TorusGeometry(.065,.017,6,16),material('#d0bc8a'));rope.rotation.y=Math.PI/2;rope.position.set(x,1.375,.02);this.scarecrowBindings.add(rope);
      beam(this.scarecrowBindings,'#d0bc8a',[x,1.375,.02],[x,1.375,-.14],.02);
    }
    this.scarecrowBindings.visible=false;
    const clearCrop=(n:THREE.Vector3)=>this.ruralClear(n)&&![at('cornfield',[3.2,2]),at('cornfield',[3.8,1.4]),at('cornfield',[3.2,.8])].some(bale=>distance(n,bale)<.62);
    cropRows(this.root,'cornfield',[-2.1,-.9],2.9,6.5,clearCrop);
    cropRows(this.root,'cornfield',[2.1,-.9],2.9,6.5,clearCrop);
    this.groundFence('cornfield',[-4,3.2],[-.8,3.2]);this.groundFence('cornfield',[.8,3.2],[4,3.2]);
    for(let i=0;i<3;i++){const bale=this.anchor('cornfield',[3.2+i%2*.6,2-i*.6]);cylinder(bale,'#cfb373',0,.3,0,.33,.58).rotation.z=Math.PI/2;}
  }
  buildMetropolis() {
    this.patch('metropolis',[0,0],9,8,'#859591');
    for(const x of [-2.1,0,2.1])this.patch('metropolis',[x,0],.55,8,'#586964',.045);
    for(const z of [-2.05,0,2.05])this.patch('metropolis',[0,z],9,.55,'#586964',.048);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){
      if(row===1&&col===2)continue;
      const x=-3.15+col*2.1,z=-3.08+row*2.05;
      cityBlock(this.anchor('metropolis',[x,z]),1.2+((row*3+col*5)%7)*.43,row+col);
    }
    const planet=this.anchor('metropolis',[1.05,-1.03]);box(planet,'#bfc3a9',0,2.8,0,1.6,5.6,1.8);cylinder(planet,'#bda96d',0,6.0,0,.05,.7);
    for(const side of [-1,1]){const face=group(planet,0,0,side*.91);face.rotation.y=side<0?Math.PI:0;for(let y=.5;y<5.3;y+=.43)for(const x of [-.51,0,.51])box(face,'#526e70',x,y,.015,.22,.29,.025);}
    box(planet,'#d0c4a0',0,5.6,0,1.79,.16,1.99);box(planet,'#9a9d8e',0,5.8,0,1.1,.28,1.3);
    plaque(planet,'DAILY PLANET',0,5.32,.94,1.48,.22,'#52655e');
    const globe=new THREE.Mesh(new THREE.SphereGeometry(.56,14,10),new THREE.MeshStandardMaterial({color:'#d8bc77',metalness:.35,roughness:.55}));globe.position.y=6.65;planet.add(globe);
    const orbit=new THREE.Mesh(new THREE.TorusGeometry(.78,.026,5,36),material('#e1c98a'));orbit.position.y=6.65;orbit.rotation.x=1.05;planet.add(orbit);
  }
  buildCountryside() {
    for(const x of [-2.2,2.2]) {
      this.patch('farm',[x,-7.4],3.8,3.5,'#a99a61');
      cropRows(this.root,'farm',[x,-7.4],3.6,3.3,n=>this.ruralClear(n));
      this.groundFence('farm',[x-1.9,-9.3],[x+1.9,-9.3]);
    }
    this.patch('farm',[-7.3,-1.7],3.1,5.2,'#99a36c');
    const paddock: [Point,Point][] = [ [[-8.9,-4.4],[-8.9,1]], [[-8.9,-4.4],[-5.8,-4.4]], [[-5.8,-4.4],[-5.8,1]], [[-8.9,1],[-7.8,1]], [[-6.8,1],[-5.8,1]] ];
    for(const [a,b] of paddock)this.groundFence('farm',a,b);
    for(const [i,point] of ([[-7.7,-2.8],[-6.9,-1.5],[-7.9,-.1]] as Point[]).entries()) {
      if(!this.ruralClear(at('farm',point)))continue;
      const animal=this.anchor('farm',point);const model=group(animal);model.rotation.y=i*1.8;cow(model,i===1,i!==1);
      this.collider('farm',point,.46);
    }
    const trough=this.anchor('farm',[-8.3,-3.7]);box(trough,'#8d9690',0,.18,0,.72,.36,.36);box(trough,'#699998',0,.365,0,.62,.015,.27);
    const shed=this.anchor('farm',[4.6,-6.3]);box(shed,'#8d6950',0,.52,0,1.1,1.04,1.45);roof(shed,1.3,1.65,.28,1.04,'#666e68');box(shed,'#453f33',0,.44,.735,.8,.87,.025);this.collider('farm',[4.6,-6.3],.72);
    for(const x of [-1,0,1]){const bale=this.anchor('cornfield',[x+5.2,-4.8]);cylinder(bale,'#c5ab68',0,.28,0,.29,.58).rotation.z=Math.PI/2;}
    for(const [i,x] of [-2.2,0,2.2].entries()){
      const storefront=this.anchor('school',[x,-6.8]);box(storefront,i%2?'#a27b60':'#bcac87',0,.65,0,1.6,1.3,1.3);
      box(storefront,'#dacbb0',0,1.35,0,1.73,.13,1.43);
      for(const wx of [-.5,.5])windowBox(storefront,wx,.62,.665,.35,.62);
      box(storefront,'#52675e',0,.46,.68,.3,.9,.04);
      box(storefront,i%2?'#8a493e':'#657657',0,1.05,.83,1.7,.09,.4);
      plaque(storefront,['FEED & SEED','SMALLVILLE HARDWARE','GENERAL STORE'][i],0,1.24,.74,1.47,.17,'#645746');
      this.collider('school',[x,-6.8],.87);
    }
    this.path(at('school',[-3.4,-5.5]),at('school',[3.4,-5.5]),.85);
  }
  addVegetation() {
    const normals: { n: THREE.Vector3; scale: number; pine: boolean }[] = [];
    for(let i=0;i<540;i++){
      const y=1-2*(i+.5)/540,angle=i*2.399963;const n=new THREE.Vector3(Math.sqrt(1-y*y)*Math.sin(angle),y,Math.sqrt(1-y*y)*Math.cos(angle));
      if(isWater(n)||isLocked(n))continue;
      if(locations.some(location=>distance(n,centers[location.id])<(location.id==='school'?8.2:location.id==='cornfield'?6.4:5.6)))continue;
      if(this.roadPoints.some(point=>distance(n,point)<.85))continue;
      if(i%5!==0)continue;
      normals.push({n,scale:.67+this.random()*.66,pine:false});
    }
    for(const id of ['farm','mansion','cemetery','bridge','school'] as LocationId[])for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9;const n=at(id,[Math.cos(angle)*6.0,Math.sin(angle)*6.0]);
      if(isWater(n)||this.roadPoints.some(point=>distance(n,point)<.85)||this.protectedPoints.some(q=>distance(n,at(q.location,q.point))<1.5))continue;
      if(id==='farm'&&i>=4)continue;
      if(id==='school'&&distance(n,at('school',[5.4,-4.1]))<3.5)continue;
      if(this.colliders.some(c=>distance(n,c.normal)<c.radius+.6))continue;
      normals.push({n,scale:.85+this.random()*.35,pine:id==='cemetery'});
    }
    for(let i=0;i<12;i++){
      const n=at('farm',[-4.4+i*.8,-10.3]);if(!this.ruralClear(n))continue;
      normals.push({n,scale:.67+(i%3)*.07,pine:false});
    }
    const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.1,.14,1,6),material('#8e7654'),normals.length);
    const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material('#688f62'),normals.length);
    const pines=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),material('#507e5b'),normals.length*3);
    const object=new THREE.Object3D();let pi=0;
    normals.forEach(({n,scale,pine},index)=>{
      object.position.copy(n).multiplyScalar(surfaceRadius(n)+.48*scale);object.quaternion.setFromUnitVectors(UP,n);object.scale.set(scale,scale,scale);object.updateMatrix();trunks.setMatrixAt(index,object.matrix);
      this.colliders.push({normal:n.clone(),radius:.13*scale});
      object.position.copy(n).multiplyScalar(surfaceRadius(n)+1.34*scale);object.scale.setScalar(pine?0:.73*scale);object.updateMatrix();crowns.setMatrixAt(index,object.matrix);
      crowns.setColorAt(index,new THREE.Color(index%5===0?'#a5af69':index%3===0?'#809c64':'#608e5e'));
      if(pine)for(let tier=0;tier<3;tier++){
        object.position.copy(n).multiplyScalar(surfaceRadius(n)+(.92+tier*.4)*scale);object.scale.set((.73-tier*.14)*scale,1.12*scale,(.73-tier*.14)*scale);object.updateMatrix();pines.setMatrixAt(pi++,object.matrix);
      }
    });pines.count=pi;for(const mesh of [trunks,crowns,pines]){mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);}
    for(let i=0;i<130;i++){
      const y=this.random()*2-1,a=this.random()*Math.PI*2;const n=new THREE.Vector3(Math.sqrt(1-y*y)*Math.sin(a),y,Math.sqrt(1-y*y)*Math.cos(a));
      if(isWater(n)||isLocked(n)||locations.some(location=>distance(n,centers[location.id])<5.5))continue;
      const stone=group(this.scenery);stone.position.copy(n).multiplyScalar(surfaceRadius(n));stone.quaternion.setFromUnitVectors(UP,n);
      const s=.12+this.random()*.23;shape(stone,'rock','#b0b49b',0,s*.32,0,s,s*.6,s*.8);
    }
  }
  addClouds() {
    // Thirteen drifting clouds are 65 puffs; two instanced meshes draw them instead of 65 separate calls.
    const geometry=new THREE.IcosahedronGeometry(1,1);
    const meshes=[new THREE.InstancedMesh(geometry,material('#d4ddc6'),13*3),new THREE.InstancedMesh(geometry,material('#e5e3cc'),13*2)];
    const counts=[0,0],puff=new THREE.Object3D();
    for(let i=0;i<13;i++){
      const cloud=new THREE.Group();
      for(let j=0;j<5;j++){
        puff.position.set((j-2)*.49,Math.sin(j*2)*.18,0);puff.scale.set(.45+this.random()*.12,.26+this.random()*.14,.37);puff.updateMatrix();
        const mesh=j%2;this.cloudPuffs.push({cloud:i,mesh,index:counts[mesh]++,local:puff.matrix.clone()});
      }
      cloud.userData.phase=i*2.399;cloud.userData.latitude=(this.random()-.5)*1.8;cloud.userData.radius=PLANET_RADIUS+3+this.random()*1.8;this.clouds.push(cloud);
    }
    for(const mesh of meshes){mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;this.root.add(mesh);}
    this.cloudMeshes=meshes;
  }
  placeActor(id: ActorId, location: LocationId, point: Point, visible=true) {
    const actor=this.characters.get(id)!;actor.root.visible=visible;
    const normal=at(location,point);const {east,north}=basis(normal);
    actor.root.position.copy(normal).multiplyScalar(surfaceRadius(normal)+.03);actor.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east,normal,north.negate()));
  }
  sync(story: Story) {
    if(this.scarecrowBindings)this.scarecrowBindings.visible=story.restrained;
    this.endPreview();
    const state=story.world;this.stage=story.index;this.night=state.night;
    for(const actor of this.characters.values()){actor.root.visible=false;actor.necklace.visible=false;actor.root.position.set(0,0,0);actor.root.quaternion.identity();}
    for(const [id,placement] of Object.entries(state.actors)){
      this.placeActor(id as ActorId,placement.location,placement.point,placement.visible!==false);
      this.characters.get(id as ActorId)!.necklace.visible=placement.necklace===true;
    }
    for(const [id,initial] of this.propDefaults){
      const prop=this.dynamic[id]!,placement=state.props[id];
      prop.visible=placement?.visible??false;prop.position.copy(initial.position);prop.quaternion.copy(initial.quaternion);
      if(placement?.position){
        const normal=at(placement.position.location,placement.position.point),{east,north}=basis(normal);
        prop.position.copy(normal).multiplyScalar(surfaceRadius(normal)+(placement.lift??0));
        prop.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east,normal,north.negate()));
      }
      if(prop.children[0])prop.children[0].rotation.z=initial.tilt+(placement?.tilt??0);
    }
    this.marker.visible=!!story.quest;
    if(story.quest){this.markerNormal=at(story.quest.location,story.quest.point);this.marker.position.copy(this.markerNormal).multiplyScalar(surfaceRadius(this.markerNormal)+.06);this.marker.quaternion.setFromUnitVectors(UP,this.markerNormal);}
  }
  kryptoniteNormals(story: Story) {
    return story.world.kryptonite.map(position=>at(position.location,position.point));
  }
  addMemories(memories:MemoryDefinition[]){
    for(const note of memories){
      const marker=this.anchor(note.location,note.point,0,true);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.012,5,28),new THREE.MeshBasicMaterial({color:'#dac58e',transparent:true,opacity:.7}));ring.rotation.x=Math.PI/2;ring.position.y=.055;marker.add(ring);
      const page=box(marker,'#e0d1a5',0,.45,0,.14,.18,.035);page.rotation.y=.35;box(page,'#66846f',0,.025,.54,.6,.07,.08);this.memoryMarkers.set(note.id,marker);
    }
  }
  syncMemories(found:Set<string>){for(const [id,marker] of this.memoryMarkers)marker.visible=!found.has(id);}
  previewPower(id:StoryPropId,amount:number,lift:number,dt:number,time:number){
    const prop=this.dynamic[id];if(!prop)return;
    if(this.preview?.id!==id){this.endPreview();this.preview={id,position:prop.position.clone(),tilt:prop.children[0]?.rotation.z??0,amount:0};}
    const preview=this.preview;preview.amount=THREE.MathUtils.damp(preview.amount,amount,9,dt);
    prop.position.copy(preview.position).addScaledVector(preview.position.clone().normalize(),preview.amount*lift);
    if(prop.children[0])prop.children[0].rotation.z=preview.tilt+Math.sin(time*19)*preview.amount*.018;
  }
  endPreview(){if(!this.preview)return;const prop=this.dynamic[this.preview.id]!;prop.position.copy(this.preview.position);if(prop.children[0])prop.children[0].rotation.z=this.preview.tilt;this.preview=null;}
  facePlayer(normal:THREE.Vector3,dt:number){
    const position=normal.clone().multiplyScalar(PLANET_RADIUS);
    for(const actor of this.characters.values()){
      if(!actor.root.visible||actor.root.position.distanceTo(position)>4.5)continue;
      const up=actor.root.position.clone().normalize(),forward=position.clone().sub(actor.root.position);forward.addScaledVector(up,-forward.dot(up)).normalize();
      if(forward.lengthSq()<.1)continue;
      const right=new THREE.Vector3().crossVectors(up,forward).normalize();const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,forward));actor.root.quaternion.slerp(rotation,1-Math.exp(-dt*3));
    }
  }
  update(dt: number, time: number, reduced: boolean, intro: boolean, sceneActor?:ActorId) {
    const animTime=reduced?0:time;
    this.markerDiamond.rotation.y=animTime*.65;this.markerDiamond.position.y=1.9+Math.sin(animTime*2.3)*.07;
    this.markerRing.scale.setScalar(1+Math.sin(animTime*2)*.07);
    if(this.dynamic.rotor)this.dynamic.rotor.rotation.z=animTime*.7;
    this.clouds.forEach(cloud=>{
      const angle=cloud.userData.phase+animTime*.009,latitude=cloud.userData.latitude;
      cloud.position.set(Math.cos(latitude)*Math.sin(angle),Math.sin(latitude),Math.cos(latitude)*Math.cos(angle)).multiplyScalar(cloud.userData.radius);
      cloud.quaternion.setFromUnitVectors(UP,cloud.position.clone().normalize());cloud.updateMatrix();
    });
    for(const puff of this.cloudPuffs)this.cloudMeshes[puff.mesh].setMatrixAt(puff.index,this.puffMatrix.multiplyMatrices(this.clouds[puff.cloud].matrix,puff.local));
    for(const mesh of this.cloudMeshes)mesh.instanceMatrix.needsUpdate=true;
    for(const actor of this.characters.values())if(actor.root.visible&&actor.id!==sceneActor)actor.update(dt,0,false,false,reduced);
    this.meteorGroup.visible=intro;
    if(intro)this.meteorGroup.children.forEach((meteor,index)=>{const travel=(animTime*.27+index*.113)%1;meteor.position.set(-14+index*2.8,37-travel*30,24-travel*15);meteor.rotation.z=-.35;meteor.scale.setScalar(reduced?0:1);});
    if(this.dynamic.spray?.visible)this.dynamic.spray.children.forEach((drop,index)=>{drop.position.y=.1+((animTime*1.4+index*.1)%1)*1.2;});
  }
  get isNight() { return this.night; }
  get currentStage() { return this.stage; }
}
