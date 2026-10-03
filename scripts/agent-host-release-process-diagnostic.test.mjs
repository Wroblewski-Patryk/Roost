import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseChildStderrDiagnostic} from './lib/agent-host-release-process.mjs';

test('OpenSSH stderr produces fixed categories without retaining private message content',()=>{
 const executable='C:\\Windows\\System32\\OpenSSH\\ssh.exe';
 const cases=[
  ['ssh: connect to host private.example port 22: Connection timed out','ssh_timeout'],
  ['Connection timed out during banner exchange','ssh_timeout'],
  ['Timeout, server private.example not responding.','ssh_timeout'],
  ['kex_exchange_identification: read: Connection reset by peer','ssh_connection_closed'],
  ['Connection closed by private.example port 22','ssh_connection_closed'],
  ['Connection to private.example closed.','ssh_connection_closed'],
  ['client_loop: send disconnect: Broken pipe','ssh_connection_closed'],
  ['WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!','ssh_host_identity_unproven'],
  ['Host key verification failed.','ssh_host_identity_unproven'],
  ['No ED25519 host key is known for private.example and you have requested strict checking.','ssh_host_identity_unproven'],
  ['private-user@private.example: Permission denied (publickey).','native_access_denied']
 ];
 for(const [message,expected] of cases){
  const input=Buffer.from(message+'\nBearer private-value\nC:\\private\\credential');
  const output=releaseChildStderrDiagnostic(executable,input);
  assert.equal(output,expected);assert(!JSON.stringify(output).includes('private'));
 }
});
test('SSH signatures never classify another executable or arbitrary error text',()=>{
 for(const executable of ['git','docker','ssh-helper.exe','C:\\private\\ssh.exe.other'])
  for(const message of ['Host key verification failed.','Connection timed out','Connection reset by peer'])
   assert.equal(releaseChildStderrDiagnostic(executable,message),undefined);
 for(const message of ['Bearer private-value','unproven','SQL statement timeout','deployment failed',''])
  assert.equal(releaseChildStderrDiagnostic('/usr/bin/ssh',message),undefined);
 assert.equal(releaseChildStderrDiagnostic('git','fatal: detected dubious ownership in repository at C:\\private'),'git_ownership_unproven');
 assert.equal(releaseChildStderrDiagnostic('git','fatal: not a git repository'),'git_repository_unavailable');
});
