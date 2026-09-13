import {chromium} from '@playwright/test';
const browser=await chromium.launch();
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:5187/model-review.html');
console.log(await page.evaluate(async()=>{
 const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
 const asset=await new GLTFLoader().loadAsync('/models/clark/clark-rigged.glb');let mesh;asset.scene.traverse(o=>{if(o.isMesh)mesh=o;});
 const img=mesh.material.map.image,c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
 const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,rows={};
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(Math.abs(x)<.025||Math.abs(x)>.12||y<1.24||y>1.39||z<.075)continue;
 const offset=(Math.min(c.height-1,Math.floor(uv.getY(i)*c.height))*c.width+Math.min(c.width-1,Math.floor(uv.getX(i)*c.width)))*4;
 const [r,g,b]=pixels.slice(offset,offset+3);if(r>110||g>90||b>80)continue;
 const key=(Math.round(y*100)/100).toFixed(2);(rows[key]??=[]).push([+x.toFixed(3),+z.toFixed(3),r,g,b]);}
 return rows;
}));}finally{await browser.close();}
