import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {composeIngressFenceSchema,qualifyComposeIngressFence} from './lib/agent-host-release-compose-ingress-fence.cjs';
const file=fileURLToPath(new URL('./lib/agent-host-release-compose-ingress-runtime.py',import.meta.url));
const script=String.raw`
import importlib.util,json,copy,sys
spec=importlib.util.spec_from_file_location('guard',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
p={'schemaVersion':'roost-compose-proxy-network-fence-policy-v1','targetId':'example-project','networkId':'a'*64,'subnet':'192.0.2.0/24','proxyId':'b'*64,'proxyPid':321,'namespaceDigest':m.digest({'proxyId':'b'*64,'pid':321,'namespace':'net:[123]'}),'databaseContainerId':'c'*64,'databaseIpv4':'192.0.2.2','proxyIpv4':'192.0.2.6','ruleComment':'roost-release-hold-'+'d'*32,'originalRulesDigest':m.digest(['-P OUTPUT ACCEPT']),'controllerProgramDigest':'e'*64}
class Native:
 def __init__(self,case):self.case=case;self.mutations=[];self.rules=['-P OUTPUT ACCEPT'];self.inspect_count=0
 def __call__(self,a):
  if a[:3]==['docker','network','ls']:return 'a'*64+'\n'+'f'*64+'\n'
  if a[:3]==['docker','network','inspect']:
   members={'b'*64:{'IPv4Address':'192.0.2.6/24'},'c'*64:{'IPv4Address':'192.0.2.2/24'}}
   if self.case=='unrelated':members['9'*64]={'IPv4Address':'192.0.2.9/24'}
   return json.dumps([{'Id':'a'*64,'IPAM':{'Config':[{'Subnet':'192.0.2.0/24'}]},'Containers':members},{'Id':'f'*64,'IPAM':{'Config':[{'Subnet':'192.0.2.128/25' if self.case=='overlap' else '198.51.100.0/24'}]}}])
  if a[:2]==['docker','inspect']:
   ident=a[2]
   if ident=='b'*64:
    self.inspect_count+=1
    return json.dumps([{'Id':ident,'State':{'Running':True,'Pid':999 if self.case=='restart' and self.inspect_count>2 else 321}}])
   return json.dumps([{'Id':ident,'Config':{'Labels':{'com.docker.compose.project':'other' if self.case=='unrelated' and ident=='9'*64 else 'example-project','com.docker.compose.service':'db'}},'HostConfig':{'PortBindings':{'8000/tcp':[{}]} if self.case=='published' else {}},'NetworkSettings':{'Ports':{}}}])
  if '/usr/bin/readlink' in a:return 'net:[123]\n'
  i=a.index('/usr/sbin/iptables');args=a[i+3:]
  if args[:2]==['-S','OUTPUT']:return '\n'.join(self.rules)+'\n'
  self.mutations.append(args)
  if self.case=='timeout':raise TimeoutError('unknown native result')
  if args[:3]==['-I','OUTPUT','1']:self.rules.append('-A OUTPUT '+' '.join(args[3:]));return ''
  if args[:2]==['-D','OUTPUT']:self.rules.remove('-A OUTPUT '+' '.join(args[2:]));return ''
  raise AssertionError(a)
case=sys.argv[2];native=Native(case)
if case=='unowned':native.rules.append('-A OUTPUT -j ACCEPT')
if case=='conflict':native.rules.append('-A OUTPUT -m comment --comment '+p['ruleComment']+' -j ACCEPT')
c=m.Controller({'operation':'apply','policy':p},native)
try:
 applied=c.execute()
 if case=='positive':
  read=m.Controller({'operation':'read','policy':p},native).execute()
  removed=m.Controller({'operation':'remove','policy':p},native).execute()
  print(json.dumps({'applied':applied,'read':read,'removed':removed,'mutations':native.mutations}));sys.exit(0)
 if case=='repeat':m.Controller({'operation':'apply','policy':p},native).execute()
 print(json.dumps({'unexpected':True}))
except Exception as e:print(json.dumps({'refused':True,'code':str(e),'effects':c.effects,'mutations':native.mutations}))
`;
function run(kind){const r=spawnSync('python',['-c',script,file,kind],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
test('fixed Python controller with fixture transport applies, reads and removes exact owned OUTPUT rule',()=>{
 const r=run('positive');assert.equal(r.mutations.length,2);assert.equal(r.applied.effects,1);assert.equal(r.read.effects,0);
 assert.equal(r.removed.removed,true);assert.equal(r.removed.receipt.rulePresent,false);
 assert.equal(composeIngressFenceSchema.safeParse(r.applied.receipt).success,true);
 assert.equal(qualifyComposeIngressFence(r.applied.receipt,{targetId:'example-project',databaseContainerId:'c'.repeat(64)}).port,8000);
});
for(const kind of ['overlap','unrelated','published','unowned','conflict'])test(`native ingress refuses ${kind} before changing a rule`,()=>{
 const r=run(kind);assert.equal(r.refused,true);assert.equal(r.effects,0);assert.equal(r.mutations.length,0);
});
for(const kind of ['timeout','restart'])test(`native ingress preserves uncertain ${kind} after attempted effect`,()=>{
 const r=run(kind);assert.equal(r.refused,true);assert.equal(r.effects,1);assert.equal(r.mutations.length,1);
});
test('native ingress cannot automatically repeat an already applied effect',()=>{const r=run('repeat');assert.equal(r.refused,true);assert.match(r.code,/reconcile_before_apply/);assert.equal(r.mutations.length,1);});
