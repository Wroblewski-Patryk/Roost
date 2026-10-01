// Owner-only interactive setup bridge. The generate reply contains a secret;
// invoke only from the local owner setup script, never from an agent/log runner.
import { generateOneTimeRecoveryCode, acknowledgeRecoveryCode, createReleaseRestoreKey } from './lib/agent-host-release-backup.mjs';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>16384)throw Error('owner_setup_input_invalid');}
const value=JSON.parse(input), common={installationId:value.installationId,repositoryRoot:value.repositoryRoot,receiptFile:value.receiptFile};
try {
 if(value.command==='generate')console.log(JSON.stringify(generateOneTimeRecoveryCode(common)));
 else if(value.command==='ack')console.log(JSON.stringify(acknowledgeRecoveryCode({...common,challengeId:value.challengeId,code:value.code,storedOffDevice:true})));
 else if(value.command==='key')console.log(JSON.stringify(createReleaseRestoreKey({repositoryRoot:value.repositoryRoot,keyFile:value.keyFile})));
 else throw Error();
}catch{console.error('release_owner_setup_failed');process.exitCode=1;}
