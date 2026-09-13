import { readFileSync, writeFileSync } from 'node:fs';
import { validateBytes } from 'gltf-validator';
const actor=process.argv[2]??'clark';
if(!['clark','lana','lex'].includes(actor))throw new Error('Unknown actor');
const result = await validateBytes(new Uint8Array(readFileSync(`public/models/${actor}/${actor}-rigged.glb`)), { uri: `${actor}-rigged.glb`, maxIssues: 100 });
writeFileSync(`${actor==='clark'?'docs/model-review':`docs/${actor}-review`}/validation.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result.issues, messages: result.issues.messages.slice(0, 5) }, null, 2));
if (result.issues.numErrors) process.exitCode = 1;
