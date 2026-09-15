"""RF016 system-only research fixtures. Never accepts or launches a Codex path.

Uses the running Python interpreter and a fixed harmless actor in owned scratch.
Not an isolation adapter: filesystem/network/handle/disk enforcement is unproven.
"""
import ctypes as c
from ctypes import wintypes as w
import hashlib
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import sys
import tempfile
import threading
import time

GATES = ('argv', 'artifact', 'trust', 'closure', 'principal', 'environment',
         'discovery', 'filesystem', 'network', 'process_tree', 'budgets',
         'output', 'host', 'authority', 'review')


def admitted(gates):
    return set(gates) == set(GATES) and all(gates[k] is True for k in GATES)


def environment(root):
    buf = c.create_unicode_buffer(32768)
    assert c.windll.kernel32.GetWindowsDirectoryW(buf, len(buf)), 'windows_directory'
    return {'SYSTEMROOT': buf.value, 'WINDIR': buf.value,
            **{k: str(root / v) for k, v in
               [('HOME', 'home'), ('CODEX_HOME', 'codex'), ('TEMP', 'temp'), ('TMP', 'tmp')]}}


ACTOR = r'''
import os,sys,time,json,subprocess
from pathlib import Path
root=Path(sys.argv[2]); mode=sys.argv[1]
if mode=='env':
    expected={'SYSTEMROOT','WINDIR','HOME','CODEX_HOME','TEMP','TMP'}
    assert set(os.environ)==expected
    assert all(os.environ[k]==str(root/v) for k,v in [('HOME','home'),('CODEX_HOME','codex'),('TEMP','temp'),('TMP','tmp')])
    print('ENV_OK',flush=True)
elif mode=='flood':
    for i in range(1000):
        os.write(1,b'x'*128+b'\n');os.write(2,b'y'*128+b'\n')
elif mode=='line': os.write(1,b'x'*2048)
elif mode=='sleep': time.sleep(15)
elif mode=='job':
    child=subprocess.Popen([sys.executable,'-I','-S',__file__,'sleep',str(root)],creationflags=0x08000000)
    denied=False
    try:
        escaped=subprocess.Popen([sys.executable,'-I','-S',__file__,'sleep',str(root)],creationflags=0x01000000|0x08000000)
        escaped.terminate();escaped.wait(timeout=2)
    except OSError as e: denied=e.winerror==5
    (root/'ready.json').write_text(json.dumps({'pid':child.pid,'breakawayDenied':denied}))
    time.sleep(15)
'''


def capture(actor, root, mode, line=1024, total=4096, deadline=2):
    """Bounded two-pipe collector for a fixed actor with no descendants."""
    proc = subprocess.Popen([sys.executable, '-I', '-S', str(actor), mode, str(root)],
                            cwd=root, env=environment(root), shell=False,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            creationflags=0x08000000)
    events = queue.Queue(maxsize=4)
    stop = threading.Event()

    def reader(pipe, channel):
        try:
            while not stop.is_set():
                data = pipe.read1(256)
                while not stop.is_set():
                    try:
                        events.put((channel, data), timeout=.05)
                        break
                    except queue.Full:
                        pass
                if not data:
                    break
        finally:
            pipe.close()

    threads = [threading.Thread(target=reader, args=(p, i), daemon=True)
               for i, p in enumerate((proc.stdout, proc.stderr))]
    for t in threads:
        t.start()
    start = time.monotonic()
    used, lengths, closed, reason = 0, [0, 0], set(), 'clean'
    try:
        while len(closed) < 2:
            if time.monotonic() - start > deadline:
                reason = 'timeout'; break
            try:
                channel, data = events.get(timeout=.02)
            except queue.Empty:
                continue
            if not data:
                closed.add(channel); continue
            if used + len(data) > total:
                reason = 'aggregate_limit'; break
            used += len(data)
            for byte in data:
                lengths[channel] = 0 if byte == 10 else lengths[channel] + 1
                if lengths[channel] > line:
                    reason = 'line_limit'; break
            if reason != 'clean':
                break
        if reason != 'clean':
            proc.terminate()
        proc.wait(timeout=2)
    finally:
        stop.set()
        if proc.poll() is None:
            proc.kill(); proc.wait(timeout=2)
        for t in threads:
            t.join(timeout=2)
        assert not any(t.is_alive() for t in threads), 'collector_not_stopped'
    return reason, used, proc.returncode


def manifest(root):
    rows, seen = [], set()
    for p in sorted(root.iterdir()):
        name = p.name
        assert re.fullmatch(r'[A-Za-z0-9_-]{1,64}\.(json|ts)', name), 'name'
        assert name.split('.')[0].upper() not in {'CON', 'PRN', 'AUX', 'NUL',
               *('COM'+str(i) for i in range(1,10)), *('LPT'+str(i) for i in range(1,10))}, 'reserved'
        assert name.casefold() not in seen, 'collision'
        seen.add(name.casefold())
        info = p.lstat()
        assert not info.st_file_attributes & 0x400 and p.is_file() and info.st_nlink == 1, 'file_type'
        assert info.st_size <= 1024 and len(rows) < 4, 'fixture_quota'
        with p.open('rb') as stream:
            raw = stream.read(1025)
        assert len(raw) == info.st_size, 'file_changed'
        rows.append({'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    return json.dumps(rows, sort_keys=True, separators=(',', ':')).encode()


def job_fixture(actor, root):
    """Create suspended, assign owned Job, resume; close Job and confirm handles."""
    k = c.WinDLL('kernel32', use_last_error=True)
    class STARTUP(c.Structure):
        _fields_ = [('cb', w.DWORD), ('reserved', w.LPWSTR), ('desktop', w.LPWSTR),
                    ('title', w.LPWSTR), *[(n,w.DWORD) for n in ('x','y','xs','ys','xc','yc','fill','flags')],
                    ('show',w.WORD), ('reserved2Size',w.WORD), ('reserved2',c.c_void_p),
                    ('stdin',w.HANDLE), ('stdout',w.HANDLE), ('stderr',w.HANDLE)]
    class PROCESS(c.Structure):
        _fields_ = [('process',w.HANDLE),('thread',w.HANDLE),('pid',w.DWORD),('tid',w.DWORD)]
    class BASIC(c.Structure):
        _fields_ = [('processTime',c.c_int64),('jobTime',c.c_int64),('flags',w.DWORD),
                    ('minWS',c.c_size_t),('maxWS',c.c_size_t),('active',w.DWORD),
                    ('affinity',c.c_size_t),('priority',w.DWORD),('scheduling',w.DWORD)]
    class LIMITS(c.Structure):
        _fields_ = [('basic',BASIC),('io',c.c_uint64*6),('processMemory',c.c_size_t),
                    ('jobMemory',c.c_size_t),('peakProcess',c.c_size_t),('peakJob',c.c_size_t)]
    def bind(name, args, result=w.BOOL):
        f=getattr(k,name);f.argtypes=args;f.restype=result;return f
    createjob=bind('CreateJobObjectW',[c.c_void_p,w.LPCWSTR],w.HANDLE)
    setjob=bind('SetInformationJobObject',[w.HANDLE,c.c_int,c.c_void_p,w.DWORD])
    create=bind('CreateProcessW',[w.LPCWSTR,w.LPWSTR,c.c_void_p,c.c_void_p,w.BOOL,w.DWORD,c.c_void_p,w.LPCWSTR,c.POINTER(STARTUP),c.POINTER(PROCESS)])
    assign=bind('AssignProcessToJobObject',[w.HANDLE,w.HANDLE])
    resume=bind('ResumeThread',[w.HANDLE],w.DWORD)
    close=bind('CloseHandle',[w.HANDLE])
    wait=bind('WaitForSingleObject',[w.HANDLE,w.DWORD],w.DWORD)
    openprocess=bind('OpenProcess',[w.DWORD,w.BOOL,w.DWORD],w.HANDLE)
    isinjob=bind('IsProcessInJob',[w.HANDLE,w.HANDLE,c.POINTER(w.BOOL)])
    terminate=bind('TerminateProcess',[w.HANDLE,w.UINT])
    job=createjob(None,None);assert job,'job_create'
    pi=PROCESS(); child=None
    try:
        limits=LIMITS();limits.basic.flags=0x2000|0x8|0x200;limits.basic.active=4;limits.jobMemory=256*1024*1024
        assert setjob(job,9,c.byref(limits),c.sizeof(limits)), 'job_limits'
        cmd=c.create_unicode_buffer(subprocess.list2cmdline([sys.executable,'-I','-S',str(actor),'job',str(root)]))
        env=c.create_unicode_buffer('\0'.join(k+'='+v for k,v in sorted(environment(root).items()))+'\0\0')
        si=STARTUP();si.cb=c.sizeof(si)
        assert create(sys.executable,cmd,None,None,False,0x4|0x400|0x08000000,env,str(root),c.byref(si),c.byref(pi)), 'create_suspended'
        assert assign(job,pi.process), 'job_assign'
        assert resume(pi.thread) != 0xffffffff, 'resume'
        end=time.monotonic()+4
        while not (root/'ready.json').is_file() and time.monotonic()<end:
            time.sleep(.02)
        raw=(root/'ready.json').read_bytes();assert len(raw)<256,'ready_size'
        ready=json.loads(raw);assert ready['breakawayDenied'] is True,'breakaway_allowed'
        child=openprocess(0x100000|0x1000,False,ready['pid']);assert child,'child_handle'
        owned=w.BOOL();assert isinjob(child,job,c.byref(owned)) and owned.value,'child_ownership'
        start=time.monotonic();assert close(job),'job_close';job=None
        assert wait(pi.process,5000)==0 and wait(child,max(0,int((5-(time.monotonic()-start))*1000)))==0,'tree_stop'
        return round((time.monotonic()-start)*1000)
    finally:
        if job:close(job)
        if pi.process:
            if wait(pi.process,100)!=0:terminate(pi.process,1);wait(pi.process,2000)
            close(pi.process)
        if pi.thread:close(pi.thread)
        if child:close(child)


def main():
    assert os.name=='nt','windows_only'
    temp=Path(tempfile.gettempdir()).resolve()
    root=Path(tempfile.mkdtemp(prefix='roost-rf016-',dir=temp)).resolve()
    assert root.parent==temp and root.name.startswith('roost-rf016-'),'scratch_owner'
    try:
        for name in ('home','codex','temp','tmp','output'):(root/name).mkdir()
        actor=root/'actor.py';actor.write_text(ACTOR,encoding='utf-8')
        gates={k:True for k in GATES};assert admitted(gates)
        for key in GATES:
            for value in (None,False,'true',1):assert not admitted({**gates,key:value})
        assert not admitted({**gates,'extra':True}) and not admitted({})
        assert capture(actor,root,'env')==('clean',8,0),'env_replacement'
        assert capture(actor,root,'line')[0]=='line_limit','line_bound'
        assert capture(actor,root,'flood')[0]=='aggregate_limit','aggregate_bound'
        assert capture(actor,root,'sleep',deadline=.15)[0]=='timeout','timeout'
        out=root/'output';a=out/'schema.json';a.write_bytes(b'{"fixture":true}')
        seal=hashlib.sha256(manifest(out)).hexdigest();assert seal==hashlib.sha256(manifest(out)).hexdigest()
        link=out/'alias.json';os.link(a,link)
        try:
            try:manifest(out)
            except AssertionError:pass
            else:raise AssertionError('hardlink_accepted')
        finally:link.unlink()
        a.write_bytes(b'x'*1025)
        try:manifest(out)
        except AssertionError:pass
        else:raise AssertionError('oversize_accepted')
        elapsed=job_fixture(actor,root)
        return {'result':'PASS','fixtureFamilies':7,'gateDenials':62,'jobDescendants':1,
                'jobCloseStopMillis':elapsed,'networkAttempts':0,'codexExecutions':0,
                'filesystemIsolationQualified':False,'networkIsolationQualified':False}
    finally:
        # Only this fresh owned tree; never recurse through a link/reparse entry.
        assert root.parent==temp and root.name.startswith('roost-rf016-')
        for p in sorted(root.rglob('*'),key=lambda p:len(p.parts),reverse=True):
            assert p.resolve().is_relative_to(root) and not p.lstat().st_file_attributes&0x400,'cleanup_scope'
            p.rmdir() if p.is_dir() else p.unlink()
        root.rmdir()


if __name__=='__main__':
    try:print(json.dumps(main()))
    except Exception:
        print(json.dumps({'result':'FAIL','scope':'system_only_fixture','codexExecutions':0}));sys.exit(1)
