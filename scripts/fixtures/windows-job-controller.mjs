// Owned crash-test controller: paths remain private argv, output only fixture PIDs.
import { buildWindowsJobLauncher, startWindowsJob } from "../lib/agent-host-windows-job.mjs";
const [directory,fixture]=process.argv.slice(2);
const artifact=await buildWindowsJobLauncher(directory);
const handle=await startWindowsJob(artifact,{executable:fixture,argv:["tree"],cwd:directory,
 environment:{SystemRoot:process.env.SystemRoot},input:"",durationMs:10000,
 onData:(channel,b)=>{if(channel==="stdout")process.stdout.write(b);},onAssigned:a=>process.stdout.write(`LAUNCHER_ROOT:${a.rootPid}\n`)});
process.stdout.write(`LAUNCHER:${handle.launcher.pid}\n`);
await handle.completion;
