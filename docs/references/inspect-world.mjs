import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({args:['--enable-webgl','--ignore-gpu-blocklist']});
try {
  await mkdir('test-results/kansas-review',{recursive:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.route('**/model-review.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'}));
  await page.goto('http://127.0.0.1:5187/model-review.html');
  await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {World}=await import('/src/world/world.ts');
    const {at,basis,surfaceRadius}=await import('/src/core/sphere.ts');
    const {pilot}=await import('/src/content/pilot.ts');
    document.body.replaceChildren();document.querySelectorAll('style,link[rel="stylesheet"]').forEach(n=>n.remove());document.body.style.cssText='margin:0;overflow:hidden';
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,1000);renderer.setClearColor('#789ba4');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),world=new World(pilot.quests);scene.add(world.root);
    scene.add(new THREE.HemisphereLight('#fff1d4','#687956',3));
    const sun=new THREE.DirectionalLight('#ffdfa1',3);scene.add(sun);
    const camera=new THREE.PerspectiveCamera(43,1.44,.1,200);
    window.reviewWorld=(id,point,wide)=>{
      const n=at(id,point),{east,north}=basis(n),target=n.clone().multiplyScalar(surfaceRadius(n)+.5);
      camera.position.copy(target).addScaledVector(n,wide*.8).addScaledVector(north,-wide).addScaledVector(east,wide*.35);camera.up.copy(n);camera.lookAt(target);
      sun.position.copy(target).addScaledVector(n,15).addScaledVector(east,-10).addScaledVector(north,-6);sun.target.position.copy(target);scene.add(sun.target);
      renderer.render(scene,camera);return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
    };
  });
  for(const [name,id,point,wide] of [['farm','farm',[-2,-3],13],['pasture','farm',[-7,-1.5],5],['bridge','bridge',[0,0],8],['metropolis','metropolis',[0,0],15],['town','school',[0,-4.5],12],['corn','cornfield',[0,-1],9]]){
    const stats=await page.evaluate(([id,p,w])=>window.reviewWorld(id,p,w),[id,point,wide]);console.log(name,stats);
    await page.screenshot({path:`test-results/kansas-review/${name}.png`});
  }
}finally{await browser.close();}
