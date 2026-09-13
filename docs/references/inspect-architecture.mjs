import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
// Run with the local Vite preview on 5187; output is review-only, never shipped.
const browser = await chromium.launch({ args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  await mkdir('test-results/architecture-models', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto('http://127.0.0.1:5187/model-review.html');
  await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { kentBarn, smallvilleSchool } = await import('/src/world/architecture.ts');
    document.body.replaceChildren();
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => node.remove());
    document.body.style.cssText = 'margin:0;display:block;width:1400px;height:1000px;overflow:hidden';
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(1400, 1000);
    renderer.setClearColor('#263d40'); renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
    document.body.style.margin = '0'; document.body.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#fff0d5', '#506453', 3));
    const sun = new THREE.DirectionalLight('#ffe3b0', 4); sun.position.set(-4, 9, 7); scene.add(sun);
    const actor = new THREE.Group(); scene.add(actor);
    const camera = new THREE.PerspectiveCamera(38, 1.4, .1, 100);
    window.reviewArchitecture = (name) => {
      actor.clear(); (name === 'barn' ? kentBarn : smallvilleSchool)(actor);
      camera.position.set(name === 'barn' ? 6.3 : 8, 5.8, name === 'barn' ? 9 : 12);
      camera.lookAt(0, 1.85, 0); renderer.render(scene, camera);
    };
  });
  for (const name of ['barn', 'school']) {
    await page.evaluate(name => window.reviewArchitecture(name), name);
    await page.screenshot({ path: `test-results/architecture-models/${name}.png` });
  }
} finally { await browser.close(); }
