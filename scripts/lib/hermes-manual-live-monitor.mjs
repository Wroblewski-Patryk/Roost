// Best-effort live containment/resource observation, not a filesystem sandbox.
// Only stopped-tree inventories are allowed to require file stability.
import fs from 'node:fs';
import path from 'node:path';
import {within,assertOwned} from './hermes-manual-install.mjs';
// Descendant I/O failures are gaps in sampling (Windows delete-pending races
// include ENOENT/EPERM/EBADF). Root ownership remains strict, and persistent
// unreadability fails stopped postflight. Never turn a gap into a safety claim.
const transient=error=>/^E[A-Z]+$/.test(error.code??'');
function deletePending(root,canonical) {
  // Observed NTFS delete-pending handle result during concurrent unlink. This
  // skips a vanished entry; it does NOT add the NTFS metadata area to write roots.
  const relative=path.relative(path.parse(root).root,canonical).replaceAll('\\','/');
  return /^\$Extend\/\$Deleted\/[a-f0-9]+$/i.test(relative);
}
export function inspectLiveOwned({root,identity,allowedRoots,protectedIds=new Set(),maxBytes=12*1024**3,maxEntries=200000,maxMs=250}) {
  assertOwned(root,identity);
  if(allowedRoots.some(p=>p===root||!within(root,p)))throw Error('live_allowlist');
  const start=performance.now();let bytes=0,entries=0,skipped=0,complete=true;
  const pending=[root];
  while(pending.length) {
    if(entries>=maxEntries||performance.now()-start>=maxMs){complete=false;break;}
    const dir=pending.pop();let children;
    try{
      const canonical=fs.realpathSync.native(dir);
      if(deletePending(root,canonical)){skipped++;continue;}
      if(canonical!==root&&!allowedRoots.some(p=>within(p,canonical)))throw Error('live_path_escape');
      children=fs.readdirSync(dir);
    }catch(error){if(transient(error)){skipped++;continue;}throw error;}
    for(const name of children) {
      if(entries>=maxEntries||performance.now()-start>=maxMs){complete=false;break;}
      const file=path.join(dir,name);entries++;
      if(!allowedRoots.some(p=>within(p,file)))throw Error('live_path_not_allowed');
      try{
        const stat=fs.lstatSync(file,{bigint:true});
        if(protectedIds.has(`${stat.dev}:${stat.ino}`))throw Error('live_protected_overlap');
        const canonical=fs.realpathSync.native(file);
        if(deletePending(root,canonical)){skipped++;continue;}
        // A handle can resolve to the new name after a concurrent rename. Only
        // leaving the allowlist is a boundary failure; an internal rename is fine.
        if(!allowedRoots.some(p=>within(p,canonical)))throw Error('live_path_escape');
        // uv creates private version aliases. Validate their target, then avoid
        // traversing it twice; its real directory is observed through its own name.
        if(stat.isSymbolicLink())continue;
        if(stat.isDirectory())pending.push(file);
        else if(stat.isFile()){
          // One observation only: changing size/mtime and disappearance are normal.
          bytes+=Number(stat.size);if(bytes>maxBytes)throw Error('live_size_budget');
        }else throw Error('live_special_file');
      }catch(error){if(transient(error)){skipped++;continue;}throw error;}
    }
  }
  return {observedBytes:bytes,entries,skipped,complete:complete&&skipped===0};
}
