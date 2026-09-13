import * as THREE from 'three';
import './model-review.css';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadImportedActor, type ClarkMotion } from './world/imported-clark';
const requestedActor=new URLSearchParams(location.search).get('actor');
const actorId=requestedActor==='lana'||requestedActor==='lex'?requestedActor:'clark';
document.querySelector('h1')!.textContent=`${{lana:'Lana Lang',lex:'Lex Luthor',clark:'Clark Kent'}[actorId]} · Motion lab`;
const choices=document.createElement('p');choices.innerHTML='<a href="/model-review.html">Clark Kent</a> <a href="/model-review.html?actor=lana">Lana Lang</a> <a href="/model-review.html?actor=lex">Lex Luthor</a>';
document.querySelector('aside')!.append(choices);
if(actorId!=='clark')document.querySelector<HTMLElement>('#original')!.hidden=true;
const status = document.querySelector<HTMLElement>('#status')!;
try {
  const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas')!, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor('#172328'); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .01, 100); camera.position.set(0, 1.0, 3.4);
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, .75, 0); controls.minDistance = .5; controls.maxDistance = 8;
  scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x80735e, 2));
  const key = new THREE.DirectionalLight(0xffefd9, 2.4); key.position.set(3, 5, 3); scene.add(key);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.MeshStandardMaterial({ color: '#43514b', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; scene.add(floor);
  const actor = await loadImportedActor(actorId); if(actorId==='lana')actor.root.scale.setScalar(.90); scene.add(actor.root);
  const skeleton = new THREE.SkeletonHelper(actor.root); skeleton.visible = false; scene.add(skeleton);
  let original: THREE.Group | undefined, paused = false;
  const summary = document.querySelector<HTMLElement>('#summary')!; status.textContent = 'Loaded · Provisional rig · Idle';
  function resize() { const canvas=renderer.domElement; renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); controls.update(); }
  window.addEventListener('resize', resize); resize();
  document.querySelector('#front')!.addEventListener('click', () => { camera.position.set(0, 1.0, innerWidth < 600 ? 4.5 : 3.4); controls.update(); });
  document.querySelector('#back')!.addEventListener('click', () => { camera.position.set(0, 1.0, innerWidth < 600 ? -4.5 : -3.4); controls.update(); });
  document.querySelector('#wire')!.addEventListener('click', () => { (original?.visible ? original : actor.root).traverse(object => { if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material instanceof THREE.MeshStandardMaterial) material.wireframe = !material.wireframe; }); });
  document.querySelector('#skeleton')!.addEventListener('click', () => { skeleton.visible = !skeleton.visible; });
  document.querySelector('#pause')!.addEventListener('click', event => { paused = !paused; (event.target as HTMLButtonElement).textContent = paused ? 'Play' : 'Pause'; });
  document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach(button => button.addEventListener('click', () => {
    if (original) original.visible = false; actor.root.visible = true; actor.setMotion(button.dataset.motion as ClarkMotion, true);
    summary.textContent = '24,000 triangles · 17 bones · 7 motion clips'; status.textContent = `Loaded · Provisional rig · ${button.dataset.motion}`;
  }));
  document.querySelector<HTMLButtonElement>('#original')!.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
    try {
      if (!original) { status.textContent = 'Loading original 29 MB mesh…'; original = (await new GLTFLoader().loadAsync('/models/review/submitted.glb')).scene; original.rotation.y = -Math.PI / 2; original.scale.setScalar(1.48 / 1.8); original.position.y = .900206685 * 1.48 / 1.8; scene.add(original); }
      original.visible = true; actor.root.visible = false; skeleton.visible = false; summary.textContent = '990,606 triangles · No rig'; status.textContent = 'Loaded · Original T-pose';
    } catch { status.textContent = 'Original could not load. Choose a motion to return to the prepared model.'; } finally { button.disabled = false; }
  });
  let previous = performance.now();
  renderer.setAnimationLoop(now => { const dt = Math.min(.05, (now - previous) / 1000); previous = now; if (document.hidden) return; if (!paused && actor.root.visible) actor.update(dt); renderer.render(scene, camera); });
} catch (error) { status.textContent = `Cannot display this model: ${error instanceof Error ? error.message : String(error)}`; }
