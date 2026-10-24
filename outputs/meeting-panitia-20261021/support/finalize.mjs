import fs from 'node:fs/promises';
import console from 'node:console';
import path from 'node:path';
import JSZip from 'jszip';
const root = path.resolve('outputs/meeting-panitia-20261021');
const zip = new JSZip();
for (const directory of ['data','latihan-error']) {
  for(const name of await fs.readdir(path.join(root,directory))){
    if(name.endsWith('.inspect.ndjson')) {
      await fs.rename(path.join(root,directory,name),path.join(root,'support',name));
      continue;
    }
    if(!/^\d{2}-.*\.(xlsx|csv)$/.test(name))continue;
    zip.file(`meeting-panitia/${directory}/${name}`,await fs.readFile(path.join(root,directory,name)));
  }
}
for(const name of ['MULAI-DI-SINI.md','Panduan-Meeting.html','Lembar-Hasil-Meja.html','Catatan-Keputusan-Meeting.md','support/hasil-verifikasi.json']){
  zip.file(`meeting-panitia/${name}`,await fs.readFile(path.join(root,name)));
}
await fs.writeFile(path.resolve('outputs/meeting-panitia-20261021.zip'),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('ZIP ready, excluding builders, previews, and dependency junction.');
