import {mkdir,copyFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),dest=new URL('public/ocr/',root);
await mkdir(dest,{recursive:true});
await copyFile(new URL('node_modules/tesseract.js/dist/worker.min.js',root),new URL('worker.min.js',dest));
for(const name of await readdir(new URL('node_modules/tesseract.js-core/',root)))if(name.includes('lstm')&&(name.endsWith('.wasm')||name.endsWith('.wasm.js')))await copyFile(new URL('node_modules/tesseract.js-core/'+name,root),new URL(name,dest));
await copyFile(new URL('node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz',root),new URL('eng.traineddata.gz',dest));
console.log('Local OCR assets prepared.');
