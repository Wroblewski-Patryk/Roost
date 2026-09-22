// Copy with its two lib modules into the private owner profile control directory.
import http from 'node:http';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateManualState,manualEnvironment,requireModelAdmission,assertExpectedModel} from './lib/hermes-manual-profile.mjs';

async function localModelTags(){
  return new Promise((resolve,reject)=>{
    const request=http.get('http://127.0.0.1:11434/api/tags',{timeout:2000},response=>{
      if(response.statusCode!==200){response.resume();reject(Error('ollama_unavailable'));return;}
      let data='';response.on('data',chunk=>{data+=chunk;if(data.length>1048576)request.destroy(Error('ollama_response_budget'));});
      response.on('end',()=>{try{resolve(JSON.parse(data));}catch{reject(Error('ollama_response'));}});
      response.on('error',reject);
    });
    request.on('timeout',()=>request.destroy(Error('ollama_unavailable')));request.on('error',reject);
  });
}
try {
  const [statePath,expectedHash,mode]=process.argv.slice(2);
  if(process.argv.length<4||process.argv.length>5||(mode&&mode!=='--check'))throw Error('launcher_arguments');
  const {state}=validateManualState(statePath,expectedHash);
  if(mode==='--check'){
    console.log(JSON.stringify({result:'PASS',profile:state.profile,modelStatus:state.model.status,
      modelPresence:'not_queried',networkRequests:0,providerStarted:false,interactiveStarted:false,roostAuthority:false}));
  }else{
    // Pending receipt refuses BEFORE any endpoint query or child process.
    requireModelAdmission(state);
    assertExpectedModel(await localModelTags(),state.model.digest);
    // Only a separately admitted future state can reach this explicit manual CLI.
    // No Desktop bootstrap, PATH-selected Hermes, argument pass-through or auto-pull.
    const result=spawnSync(state.runtime.executable,['--cli','--ignore-rules','--provider','custom','--model',state.model.name],
      {cwd:path.join(state.root.path,'workspace'),env:manualEnvironment(state),stdio:'inherit',shell:false});
    if(result.error)throw Error('manual_start_failed');process.exitCode=result.status??1;
  }
}catch(error){
  const reason=/^[a-z_0-9]{1,80}$/.test(error.message)?error.message:'manual_launch_refused';
  console.error(reason==='model_pending_point_3'
    ?'Hermes manual: model gpt-oss:20b oczekuje na PUNKT 3 (pobranie i jawne dopuszczenie). Nic nie uruchomiono ani nie pobrano.'
    :'Hermes manual: odmowa uruchomienia ('+reason+'). Sprawdz prywatny receipt; nie wybieraj innego runtime ani providera.');
  process.exitCode=3;
}
