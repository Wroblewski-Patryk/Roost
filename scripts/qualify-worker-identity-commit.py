"""Owned, synthetic commit probe; all orchestration evidence stays in memory.

The caller explicitly selects an existing PostgreSQL container. No credentials,
private dotenv, Docker configuration, files or existing databases are changed.
Only the uniquely marked disposable database is written. Cleanup runs in finally.
"""
import argparse, hashlib, json, os, pathlib, re, socket, subprocess, threading, time, uuid

parser = argparse.ArgumentParser()
parser.add_argument('--container', required=True)
parser.add_argument('--db-user', required=True)
parser.add_argument('--pause-after-diagnosis', action='store_true')
parser.add_argument('--registration-probe', action='store_true')
parser.add_argument('--registration-matrix', action='store_true')
parser.add_argument('--scenario', choices=['commit','full'], default='commit')
parser.add_argument('--suite', choices=['lifecycle','issuer','channel','ticket','revocation','attestation','attested-reader'], default='lifecycle')
args = parser.parse_args()
assert not args.registration_probe or args.suite=='attestation','Registration probe requires attestation suite'
assert not args.registration_matrix or args.suite=='attestation' and not args.registration_probe,'Select one attestation experiment'
repo = pathlib.Path.cwd()
hidden = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

def run(command, source=None):
    result = subprocess.run(command, input=source, text=True, encoding='utf-8', capture_output=True, timeout=90, creationflags=hidden)
    if result.returncode:
        if args.suite in ('channel','ticket','revocation','attestation','attested-reader') and any(str(v).startswith('companycore_test_identity_') for v in command):
            print('Owned SQL diagnostic: '+result.stderr[:800],flush=True)
        raise RuntimeError('Command failed; private output suppressed: ' + command[0])
    return result.stdout.strip()

def docker(*command, source=None):
    return run(['docker', *command], source)

def sql(database, source):
    return docker('exec', '-i', args.container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', args.db_user, '-d', database, source=source)

def inventory():
    containers = []
    for cid in docker('ps', '-aq').splitlines():
        value = docker('inspect', '--format', '{{json .Id}}|{{json .State}}|{{json .Image}}|{{json .Mounts}}|{{.RestartCount}}', cid).split('|')
        containers.append({'id':json.loads(value[0]), 'state':json.loads(value[1]), 'image':json.loads(value[2]), 'mounts':json.loads(value[3]), 'restarts':value[4]})
    return {'containers':sorted(containers,key=lambda c:c['id']), 'volumes':sorted(docker('volume','ls','-q').splitlines()),
            'images':sorted(docker('image','ls','--no-trunc','-q').splitlines()), 'networks':sorted(docker('network','ls','--no-trunc','-q').splitlines())}

def fingerprint():
    catalog = json.loads(sql('postgres', "SELECT coalesce(json_agg(row_to_json(d) ORDER BY datname),'[]') FROM (SELECT oid,datname,datdba,encoding,datcollate,datctype,datistemplate,datallowconn FROM pg_database) d;"))
    result = {'catalog':catalog,'databases':{}}
    for item in catalog:
        if not item['datallowconn']: continue
        name = item['datname']
        tables = json.loads(sql(name,"SELECT coalesce(json_agg(row_to_json(x) ORDER BY s,t),'[]') FROM (SELECT n.nspname s,c.relname t,c.relkind k FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','S') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%') x;"))
        rows = []
        for table in tables:
            qualified = '"'+table['s'].replace('"','""')+'"."'+table['t'].replace('"','""')+'"'
            query = 'SELECT md5(json_build_array(last_value,is_called)::text) FROM '+qualified+';' if table['k']=='S' else "SELECT count(*)||':'||md5(coalesce(string_agg(h,'' ORDER BY h),'')) FROM (SELECT md5(to_jsonb(x)::text) h FROM "+qualified+' x) y;'
            rows.append([table['s'],table['t'],table['k'],sql(name,query)])
        structure = sql(name,"SELECT md5(coalesce(string_agg(v,'|' ORDER BY v),'')) FROM (SELECT to_jsonb(a)::text v FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' UNION ALL SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' UNION ALL SELECT pg_get_constraintdef(x.oid) FROM pg_constraint x JOIN pg_namespace n ON n.oid=x.connamespace WHERE n.nspname='public' UNION ALL SELECT indexdef FROM pg_indexes WHERE schemaname='public') s;")
        result['databases'][name] = {'rows':rows,'structure':structure}
    result['rolesDigest'] = sql('postgres',"SELECT md5(string_agg(to_jsonb(r)::text,'|' ORDER BY rolname)) FROM (SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolconnlimit,rolvaliduntil,rolbypassrls,rolconfig FROM pg_roles) r;")
    return result

bridge_code = r"""
const net=require('node:net'),{spawn}=require('node:child_process'),peers=new Set();
const emit=v=>console.log(JSON.stringify(v));
const server=net.createServer(socket=>{
 const child=spawn('docker',['exec','-i',process.env.PROBE_CONTAINER,'nc','127.0.0.1','5432'],{windowsHide:true,stdio:['pipe','pipe','ignore']});
 const peer={socket,child};peers.add(peer);let backend=Buffer.alloc(0),frontend=Buffer.alloc(0),startup=true,dropCommit=false,diagnostic=null;
 // Diagnostic traffic is passive. Only the explicit full-suite fault marker
 // arms a one-connection cut after PostgreSQL's real COMMIT completion. Never
 // log query text, row values or credentials; never replay. Only the explicit
 // owned synthetic registration probe exposes marked error metadata in memory.
 socket.on('data',data=>{frontend=Buffer.concat([frontend,data]);while(frontend.length>=5){
   if(startup){const n=frontend.readInt32BE(0);if(n<8||n>1048576||frontend.length<n)break;const ssl=n===8;frontend=frontend.subarray(n);if(!ssl)startup=false;continue;}
   const n=frontend.readInt32BE(1)+1;if(n<5||n>1048576||frontend.length<n)break;
   if(process.env.PROBE_FAULTS==='1'&&(frontend[0]===81||frontend[0]===80)){
     const start=frontend[0]===81?5:frontend.indexOf(0,5)+1,end=frontend.indexOf(0,start);
     if(frontend.subarray(start,end).toString()==="SELECT 'native_drop_commit_response'"){dropCommit=true;emit({faultArmed:'drop_commit_response'});}
     const marker=frontend.subarray(start,end).toString().match(/^SELECT 'native_registration_diagnostic:([a-f0-9-]{36}):([a-z_]+)'$/);
     if(process.env.PROBE_REGISTRATION==='1'&&marker)diagnostic={ticketId:marker[1],phase:marker[2]};
   }
   if(frontend[0]===81){const query=frontend.subarray(5,n-1).toString().trim().toUpperCase();if(query==='COMMIT'||query==='ROLLBACK')emit({wireRequest:query});}
   frontend=frontend.subarray(n);
 }});
 child.stdout.on('data',data=>{backend=Buffer.concat([backend,data]);while(backend.length){
   if(backend.length<5)break;const n=backend.readInt32BE(1)+1;if(n<5||n>16777216||backend.length<n)break;
   if(backend[0]===69){const fields=backend.subarray(5,n).toString().split('\0'),code=fields.find(x=>x.startsWith('C'));emit({wireErrorCode:code?.slice(1)});
    if(diagnostic){const get=k=>fields.find(x=>x.startsWith(k))?.slice(1)??null;
     emit({registrationWireError:{...diagnostic,sqlstate:get('C'),message:get('M'),constraint:get('n'),table:get('t'),context:get('W')}});}}
   if(backend[0]===67){const tag=backend.subarray(5,n-1).toString();if(tag==='COMMIT'||tag==='ROLLBACK')emit({wireCompletion:tag});
     if(tag==='COMMIT'||tag==='ROLLBACK')diagnostic=null;
     if(tag==='ROLLBACK'&&dropCommit){dropCommit=false;emit({faultDisarmed:'rollback'});}
     if(tag==='COMMIT'&&dropCommit){dropCommit=false;child.stdout.unpipe(socket);socket.destroy();emit({faultApplied:'drop_commit_response'});}
   }
   backend=backend.subarray(n);
 }});
 socket.pipe(child.stdin);child.stdout.pipe(socket);
 const close=()=>{socket.destroy();child.stdin.destroy();child.stdout.destroy();child.kill();};
 socket.on('error',close);socket.on('close',close);child.on('exit',()=>{socket.destroy();peers.delete(peer);});child.on('error',close);child.stdin.on('error',close);
});
server.listen(0,'127.0.0.1',()=>emit({port:server.address().port}));
process.stdin.once('data',()=>{server.close();for(const {socket,child} of peers){socket.destroy();child.kill();}process.stdin.destroy();});
"""

preamble = r"""
const fs=require('node:fs'),path=require('node:path'),privateEnv=path.resolve('.env').toLowerCase();
for(const method of ['readFileSync','readFile']){const original=fs[method];fs[method]=function(p,...a){if(path.resolve(String(p)).toLowerCase()===privateEnv){const e=Object.assign(Error('Private dotenv disabled'),{code:'ENOENT'});if(method==='readFile'){a.at(-1)(e);return;}throw e;}return original.call(this,p,...a);};}
const exists=fs.existsSync;fs.existsSync=p=>path.resolve(String(p)).toLowerCase()===privateEnv?false:exists.call(fs,p);
"""
diagnosis = r"""
const {PrismaClient,Prisma}=require('@prisma/client'),db=new PrismaClient(),responses=[];
(async()=>{try{
 await db.$connect();const engine=db._engine.engine,commit=engine.commitTransaction.bind(engine);
 engine.commitTransaction=async(...args)=>{const raw=await commit(...args),parsed=JSON.parse(raw);responses.push({engineResultKeys:Object.keys(parsed).sort(),engineErrorCode:parsed.error_code??null});return raw;};
 let callbackRan=false,resolved=false;
 try{await db.$transaction(async tx=>{await tx.$executeRaw`INSERT INTO native_commit_probe(id) VALUES(1)`;callbackRan=true;return 'callback_result';});resolved=true;}catch{}
 const count=(await db.$queryRaw`SELECT count(*)::int AS n FROM native_commit_probe`)[0].n;
 console.log(JSON.stringify({diagnosis:{prisma:Prisma.prismaVersion,callbackRan,transactionResolved:resolved,committedRows:count,responses}}));
}finally{await db.$disconnect();}})().catch(()=>{console.error('Bounded diagnostic failed');process.exitCode=1;});
"""

before = inventory()
target = next(c for c in before['containers'] if c['id'].startswith(args.container))
assert target['state']['Status'] in ('running','exited')
token = uuid.uuid4().hex
name = 'companycore_test_identity_'+token
marker = 'worker-identity-native:'+token
owned = False
bridge = None
baseline = None
wire = []
try:
    if target['state']['Status']=='exited': docker('start',args.container)
    for attempt in range(30):
        try:
            assert sql('postgres','SELECT 1;')=='1'
            break
        except Exception: time.sleep(.5)
    else: raise RuntimeError('PostgreSQL readiness timeout')
    baseline = fingerprint()
    print(json.dumps({'baselineDatabases':len(baseline['databases']),'baselineTablesSequences':sum(len(d['rows']) for d in baseline['databases'].values()),'baselineCaptured':True,'baselineSHA256':hashlib.sha256(json.dumps(baseline,sort_keys=True,separators=(',',':')).encode()).hexdigest()}),flush=True)
    assert name not in [d['datname'] for d in baseline['catalog']]
    docker('exec',args.container,'createdb','-U',args.db_user,name)
    owned = True
    sql('postgres',"COMMENT ON DATABASE "+name+" IS '"+marker+"';")
    oid = sql('postgres',"SELECT oid::text FROM pg_database WHERE datname='"+name+"';")
    print(json.dumps({'ownedDatabase':name,'oid':oid,'marker':marker}),flush=True)
    sql(name,"CREATE TABLE native_commit_probe(id INT); CREATE FUNCTION native_commit_probe_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic deferred commit rejection'; END $$; CREATE CONSTRAINT TRIGGER native_commit_probe_failure AFTER INSERT ON native_commit_probe DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION native_commit_probe_fail();")
    env = {k:v for k,v in os.environ.items() if k.upper() in ['PATH','PATHEXT','SYSTEMROOT','TEMP','TMP','APPDATA','LOCALAPPDATA','COMSPEC']}
    env['PROBE_CONTAINER'] = args.container
    env['PROBE_FAULTS'] = '1' if args.scenario=='full' or args.suite in ('issuer','channel','ticket','revocation','attestation','attested-reader') else '0'
    env['PROBE_REGISTRATION'] = '1' if args.registration_probe or args.registration_matrix or args.suite=='attested-reader' else '0'
    bridge = subprocess.Popen(['node','-e',bridge_code],env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,creationflags=hidden)
    port = json.loads(bridge.stdout.readline())['port']
    def collect():
        for line in bridge.stdout:
            value=json.loads(line);wire.append(value)
            if 'registrationWireError' in value: print(json.dumps(value),flush=True)
    reader = threading.Thread(target=collect,daemon=True);reader.start()
    env.update(DATABASE_URL=f'postgresql://{args.db_user}@127.0.0.1:{port}/{name}?schema=public&connection_limit=25&sslmode=disable',NODE_ENV='test',COMPANYCORE_SKIP_DOTENV='1',WORKER_IDENTITY_NATIVE_DATABASE=name,WORKER_IDENTITY_NATIVE_SCENARIO=args.scenario,WORKER_IDENTITY_NATIVE_FAULT_RELAY=env['PROBE_FAULTS'])
    result = subprocess.run(['node','-e',preamble+diagnosis],env=env,text=True,capture_output=True,timeout=60,creationflags=hidden)
    print(result.stdout,flush=True);assert result.returncode==0
    time.sleep(.1);print(json.dumps({'wireDiagnosis':wire}),flush=True)
    if args.pause_after_diagnosis:
        print('READY: enter verify to apply the migration chain and run the selected suite; any other input cleans up.',flush=True)
        if input().strip()!='verify': raise RuntimeError('Verification not requested; cleaning up')
    chain = []
    for migration in sorted((repo/'prisma/migrations').glob('*/migration.sql')):
        if args.suite=='channel' and migration.parent.name=='20260923230000_bootstrap_transport_authority':
            pre = subprocess.run(['node','-e',preamble+"require('./dist/tests/bootstrap-channel-native-fixture.js').preflight().catch(()=>{console.error('Preflight failed');process.exitCode=1;});"],env=env,text=True,capture_output=True,timeout=90,creationflags=hidden)
            print(pre.stdout,flush=True);assert pre.returncode==0,pre.stderr
        if args.suite=='ticket' and migration.parent.name=='20260924010000_bootstrap_ticket_lifecycle':
            pre = subprocess.run(['node','-e',preamble+"require('./dist/tests/bootstrap-ticket-native-fixture.js').preflight().catch(()=>{console.error('Ticket preflight failed');process.exitCode=1;});"],env=env,text=True,capture_output=True,timeout=90,creationflags=hidden)
            print(pre.stdout,flush=True);assert pre.returncode==0,pre.stderr
        if args.suite=='attestation' and migration.parent.name=='20260925010000_decision_attestation':
            pre = subprocess.run(['node','-e',preamble+"require('tsx/cjs');require('./src/tests/decision-attestation-native-fixture.ts').preflight().catch(e=>{console.error('Attestation preflight failed: '+e.message);process.exitCode=1;});"],env=env,text=True,capture_output=True,timeout=90,creationflags=hidden)
            print(pre.stdout,flush=True);assert pre.returncode==0,pre.stderr
        try: sql(name,migration.read_text(encoding='utf-8-sig'))
        except Exception:
            allowed = {'channel':'20260923230000_bootstrap_transport_authority','ticket':'20260924010000_bootstrap_ticket_lifecycle','attestation':'20260925010000_decision_attestation'}
            if migration.parent.name!=allowed.get(args.suite): raise
            print('UNAPPLIED_MIGRATION_FAILED: transaction rolled back. Enter retry after a minimal authorized correction, otherwise cleanup.',flush=True)
            if input().strip()!='retry': raise
            sql(name,migration.read_text(encoding='utf-8-sig'))
        chain.append(hashlib.sha256(migration.read_bytes()).hexdigest())
    print(json.dumps({'migrationsApplied':len(chain),'chainDigest':hashlib.sha256(''.join(chain).encode()).hexdigest()}),flush=True)
    if args.registration_probe or args.registration_matrix:
        experiment='registrationMatrix' if args.registration_matrix else 'registrationProbe'
        for probe_run in range(1,5):
            probe=subprocess.run(['node','-e',preamble+"require('tsx/cjs');require('./src/tests/decision-attestation-registration-probe.ts')."+experiment+"().catch(e=>{console.error(e.message);process.exitCode=1;});"],env=env,text=True,encoding='utf-8',capture_output=True,timeout=240,creationflags=hidden)
            print(probe.stdout,flush=True);print(probe.stderr,flush=True)
            print(json.dumps({'registrationProbeRun':probe_run,'experiment':experiment,'exitCode':probe.returncode}),flush=True)
            print('REGISTRATION_PROBE: enter probe for a new bounded experiment, full for native suite, otherwise cleanup.',flush=True)
            action=input().strip()
            if action=='full': break
            if action!='probe': raise RuntimeError('Registration investigation stopped; cleanup')
        else: raise RuntimeError('Registration experiment budget exhausted')
    native_runs = 1
    cuts_before_last_run = 0
    arms_before_last_run = 0
    suite = {'issuer':'bootstrap-issuer-native','channel':'bootstrap-channel-native','lifecycle':'worker-identity-lifecycle-native','ticket':'bootstrap-ticket-native','revocation':'bootstrap-ticket-revocation-native','attestation':'decision-attestation-native','attested-reader':'bootstrap-attested-reader-native'}[args.suite]
    native_code = preamble+("require('tsx/cjs');require('./src/tests/"+suite+".test.ts');" if args.suite in ('attestation','attested-reader') else "require('./dist/tests/"+suite+".test.js');")
    def native_run():
        # Stream public synthetic TAP while retaining it in memory for exact
        # final assertions. No log files or durable helper directories.
        child = subprocess.Popen(['node','-e',native_code],env=env,text=True,encoding='utf-8',errors='replace',stdout=subprocess.PIPE,stderr=subprocess.STDOUT,creationflags=hidden)
        lines = []
        def read_output():
            for line in child.stdout:
                lines.append(line)
                print(line,end='',flush=True)
        output_reader = threading.Thread(target=read_output,daemon=True);output_reader.start()
        try: child.wait(timeout=900 if args.suite in ('channel','ticket','revocation','attestation','attested-reader') else 240)
        except subprocess.TimeoutExpired:
            child.kill();child.wait();raise
        finally: output_reader.join(timeout=10)
        assert not output_reader.is_alive(),'Native output reader remains'
        return subprocess.CompletedProcess(['node'],child.returncode,''.join(lines),'')
    result = native_run()
    time.sleep(.1)
    print(json.dumps({'faultRelay':{'armed':sum(v.get('faultArmed')=='drop_commit_response' for v in wire),'applied':sum(v.get('faultApplied')=='drop_commit_response' for v in wire)}}),flush=True)
    if result.returncode and args.suite in ('channel','ticket','revocation','attestation','attested-reader'):
        print('NATIVE_FAILED: owned DB retained in this run. Enter retry after a bounded fix or anything else for cleanup.',flush=True)
        while native_runs<(8 if args.suite=='attestation' else 3) and input().strip()=='retry':
            native_runs += 1
            cuts_before_last_run = sum(v.get('faultApplied')=='drop_commit_response' for v in wire)
            arms_before_last_run = sum(v.get('faultArmed')=='drop_commit_response' for v in wire)
            result = native_run()
            if not result.returncode: break
            print('NATIVE_FAILED: retry or cleanup.',flush=True)
    if result.returncode: raise RuntimeError('Native '+args.suite+' qualification failed')
    assert re.search(r'^# skipped 0$',result.stdout,re.M) and re.search(r'^# fail 0$',result.stdout,re.M)
    if args.scenario=='full' or args.suite in ('issuer','channel','ticket','revocation','attestation','attested-reader'):
        expected = 18 if args.suite=='attested-reader' else 24 if args.suite=='attestation' else 13 if args.suite=='revocation' else 17 if args.suite=='ticket' else 19 if args.suite=='channel' else 17 if args.suite=='issuer' else 16
        assert re.search(r'^# tests '+str(expected)+'$',result.stdout,re.M),'Full suite count differs'
        time.sleep(.1)
        expected_cuts = cuts_before_last_run+(3 if args.suite=='attestation' else 1) if args.suite in ('revocation','attestation','attested-reader') else native_runs if args.suite=='channel' else 1
        expected_arms = arms_before_last_run+3 if args.suite=='attestation' else expected_cuts
        assert sum(v.get('faultArmed')=='drop_commit_response' for v in wire)==expected_arms
        assert sum(v.get('faultApplied')=='drop_commit_response' for v in wire)==expected_cuts
        print(json.dumps({'lostCommitResponseCuts':expected_cuts,'fullSuite':True,'skips':0}),flush=True)
    final_chain = [hashlib.sha256(m.read_bytes()).hexdigest() for m in sorted((repo/'prisma/migrations').glob('*/migration.sql'))]
    assert final_chain[:-1]==chain[:-1],'Earlier migration source changed'
    if args.suite=='attested-reader': assert final_chain==chain,'Reader qualification must preserve all 83 migrations'
    print(json.dumps({'nativeExitCode':result.returncode,'nativeRuns':native_runs,'migrations':len(final_chain),
        'finalSourceChainDigest':hashlib.sha256(''.join(final_chain).encode()).hexdigest(),'migration83SourceChanged':final_chain[-1]!=chain[-1]}),flush=True)
finally:
    if bridge is not None:
        bridge.stdin.write('close\n');bridge.stdin.flush();bridge.wait(timeout=15);reader.join(timeout=5)
        assert bridge.returncode==0,'Relay cleanup uncertain'
        with socket.socket() as probe:
            probe.settimeout(1)
            assert probe.connect_ex(('127.0.0.1',port))!=0,'Relay listener remains'
    if owned:
        actual = json.loads(sql('postgres',"SELECT row_to_json(x) FROM (SELECT oid::text,pg_get_userbyid(datdba) owner,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname='"+name+"') x;"))
        assert actual=={'oid':oid,'owner':args.db_user,'marker':marker},'Owned database identity mismatch'
        assert sql('postgres',"SELECT count(*) FROM pg_stat_activity WHERE datname='"+name+"';")=='0','Active owned sessions remain'
        docker('exec',args.container,'dropdb','-U',args.db_user,name)
        assert sql('postgres',"SELECT count(*) FROM pg_database WHERE datname='"+name+"';")=='0'
    after_data = fingerprint() if baseline is not None else None
    if target['state']['Status']=='exited': docker('stop','-t','30',args.container)
    after = inventory()
    for key in ['volumes','images','networks']: assert before[key]==after[key]
    assert len(before['containers'])==len(after['containers'])
    for a,b in zip(before['containers'],after['containers']):
        if a['id']==target['id']:
            assert b['state']['Status']==a['state']['Status']
            for key in ['id','image','mounts','restarts']: assert a[key]==b[key]
        else: assert a==b,'Unrelated container changed'
    assert baseline==after_data,'Existing database fingerprints differ'
    print(json.dumps({'cleanup':'PASS','helperFilesCreated':0,'databaseRemoved':owned,'inventoryRestored':True,'existingFingerprintSHA256':hashlib.sha256(json.dumps(baseline,sort_keys=True,separators=(',',':')).encode()).hexdigest()}),flush=True)
