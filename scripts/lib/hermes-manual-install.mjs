// Manual owner tool only. No provider admission, profile or launcher creation.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const sourcePin = 'a3d7f9ae257d5db6bb9759a10c437d786eec1610';
export const installerHash = '226a342a3f409a0e3b6a716b3ba4d464f286adc1e7356d08edd3ff33d6b35e39';
export const stages = ['repository', 'python', 'venv', 'dependencies'];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function within(root, child) {
  const rel = path.relative(root, child);
  return !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep);
}
export function assertNewRoot(root, denied) {
  if (!path.isAbsolute(root) || fs.existsSync(root) || denied.some(p => within(p, root) || within(root, p))) throw Error('target_not_private');
  for (let p=path.dirname(root);;p=path.dirname(p)) {
    if (fs.lstatSync(p).isSymbolicLink() || fs.realpathSync.native(p).toLowerCase() !== p.toLowerCase()) throw Error('target_ancestry');
    if (p === path.dirname(p)) break;
  }
}
export function inventory(root, { hashes=true, maxBytes=12*1024**3, allowInternalLinks=false }={}) {
  const rows=[]; let bytes=0; const deadline=Date.now()+60000;
  function walk(dir) { for (const name of fs.readdirSync(dir).sort()) {
    if (Date.now()>deadline || rows.length>200000) throw Error('inventory_budget');
    const f=path.join(dir,name), s=fs.lstatSync(f,{bigint:true});
    if (s.isSymbolicLink()) {
      if(!allowInternalLinks)throw Error('tree_link');
      const target=fs.realpathSync.native(f);
      if(!within(root,target))throw Error('tree_link_escape');
      rows.push({path:path.relative(root,f).replaceAll('\\','/'),fileId:`${s.dev}:${s.ino}`,kind:'link',target:path.relative(root,target).replaceAll('\\','/')});
      continue;
    }
    const row={path:path.relative(root,f).replaceAll('\\','/'),fileId:`${s.dev}:${s.ino}`,kind:s.isDirectory()?'directory':'file'};
    if(s.isDirectory()){ rows.push(row);walk(f); }
    else if(s.isFile()) {
      bytes+=Number(s.size);if(bytes>maxBytes)throw Error('size_budget');
      Object.assign(row,{bytes:Number(s.size),mtimeNs:String(s.mtimeNs)});
      if(hashes)row.sha256=sha256(fs.readFileSync(f));
      const after=fs.lstatSync(f,{bigint:true});
      if(s.size!==after.size||s.mtimeNs!==after.mtimeNs||s.ino!==after.ino)throw Error('tree_changed');
      rows.push(row);
    } else throw Error('tree_special');
  }}
  walk(root);return {rows,bytes,files:rows.filter(r=>r.kind==='file').length,digest:sha256(JSON.stringify(rows))};
}
export function assertNoOverlap(manual, protectedInventories) {
  const ids=new Set(protectedInventories.flatMap(i=>i.rows.map(r=>r.fileId)));
  if(manual.rows.some(r=>ids.has(r.fileId)))throw Error('physical_overlap');
}
export function validateFrames(text, exitCode) {
  if(Buffer.byteLength(text)>32768||exitCode!==0)throw Error('installer_failed');
  const frames=text.trim().split(/\r?\n/).map(l=>JSON.parse(l.replace(/^\uFEFF/,'')));
  const results=frames.filter(f=>f.type==='stage');
  if(results.length!==4 || results.some((f,i)=>f.stage!==stages[i]||f.ok!==true||f.skipped!==false||f.exitCode!==0)
    ||frames.at(-1)?.type!=='complete'||frames.at(-1)?.ok!==true||frames.some(f=>!['start','stage','fallback','complete'].includes(f.type)))throw Error('stages_incomplete');
  return results;
}
export function assertOwned(root, identity) {
  if(fs.realpathSync.native(root)!==root||fs.lstatSync(root).isSymbolicLink()||String(fs.statSync(root,{bigint:true}).ino)!==identity)throw Error('rollback_ownership');
}
export function validateReceipt(receipt, current) {
  if(receipt.schemaVersion!=='hermes-manual-install-v1'||receipt.sourcePin!==sourcePin||receipt.version!=='0.21.3'
    ||receipt.inventoryDigest!==current.digest||receipt.installerSha256!==installerHash||receipt.profileCreated!==false)throw Error('manual_runtime_drift');
}
