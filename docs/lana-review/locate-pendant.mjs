// Inspect the original texture colors on the prepared mesh; no image pixels are changed.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch();
try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5187/model-review.html?actor=lana');
  const result=await page.evaluate(async()=>{
    const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const gltf=await new GLTFLoader().loadAsync('/models/lana/lana-rigged.glb');
    let mesh;gltf.scene.traverse(o=>{if(o.isMesh)mesh=o;});
    const image=mesh.material.map.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const context=canvas.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    const geometry=mesh.geometry,uv=geometry.attributes.uv,p=geometry.attributes.position,indices=geometry.index.array;
    const selected=[],points=[];
    const green=(u,v)=>{const x=Math.max(0,Math.min(canvas.width-1,Math.floor(u*canvas.width))),y=Math.max(0,Math.min(canvas.height-1,Math.floor(v*canvas.height))),i=(y*canvas.width+x)*4;return pixels[i+1]>pixels[i]*1.25&&pixels[i+1]>pixels[i+2]*1.2&&pixels[i+1]>45;};
    for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]];
      const x=ids.reduce((s,id)=>s+p.getX(id),0)/3,y=ids.reduce((s,id)=>s+p.getY(id),0)/3,z=ids.reduce((s,id)=>s+p.getZ(id),0)/3;
      if(Math.abs(x)>.1||y<.9||y>1.2||z<0)continue;
      if(green(ids.reduce((s,id)=>s+uv.getX(id),0)/3,ids.reduce((s,id)=>s+uv.getY(id),0)/3)){selected.push(i/3);points.push([x,y,z]);}
    }
    return {triangles:selected,points};
  });
  writeFileSync('docs/lana-review/pendant-triangles.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
