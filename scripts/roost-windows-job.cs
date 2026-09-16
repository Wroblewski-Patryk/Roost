using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
using System.Web.Script.Serialization;

// Attempt launcher, separate from the observer/scheduler launcher. No named job,
// credential lookup, shell, elevated operation or persistent machine resource.
internal static class RoostWindowsJob
{
    static string Version = "roost-windows-job-v1";
    const uint KillOnClose = 0x2000;
    static readonly object Gate = new object();
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 262144, RecursionLimit = 12 };
    static readonly Stream Control = Console.OpenStandardInput();
    static readonly Stream Wire = Console.OpenStandardOutput();
    static readonly Stopwatch Clock = Stopwatch.StartNew();
    static volatile string reason;
    static long killDeadline = 3500;
    static string attempt, identity = Guid.NewGuid().ToString(), challenge, resumeDigest;
    static IntPtr job, process, thread;
    static volatile bool resumed;
    static bool assigned, inheritedJob, controllerJob, limitsConfigured;
    static uint rootId, rootExit = 259;
    static string rootCreationTime;
    static readonly int launcherId = Process.GetCurrentProcess().Id;
    static readonly string launcherCreationTime = Process.GetCurrentProcess().StartTime.ToFileTimeUtc().ToString();
    static int stdoutBytes, stderrBytes;
    static void Need(bool ok) { if (!ok) throw new InvalidOperationException(); }
    static void Stop(string why) { lock (Gate) { Interlocked.CompareExchange(ref reason, why, null); } }
    static string Reason { get { return reason; } }
    static bool Emit(object message)
    {
        try { lock (Gate) { byte[] b = Encoding.UTF8.GetBytes(Json.Serialize(message) + "\n"); Wire.Write(b, 0, b.Length); Wire.Flush(); } return true; }
        catch { Stop("controller_closed"); return false; }
    }
    static string Line(int max)
    {
        using (var buffer = new MemoryStream()) {
            for (int b; (b = Control.ReadByte()) != -1;) {
                if (b == 10) return new UTF8Encoding(false, true).GetString(buffer.ToArray());
                Need(buffer.Length < max); buffer.WriteByte((byte)b);
            }
            return null;
        }
    }
    static string Str(Dictionary<string, object> d, string key) { Need(d.ContainsKey(key) && d[key] is string); return (string)d[key]; }
    static int Number(Dictionary<string, object> d, string key, int min, int max) {
        Need(d.ContainsKey(key) && d[key] is int); int v = (int)d[key]; Need(v >= min && v <= max); return v;
    }
    static void Exact(Dictionary<string, object> d, string[] keys) {
        Need(d.Count == keys.Length); foreach (var k in keys) Need(d.ContainsKey(k));
    }
    static string Quote(string value) {
        var b = new StringBuilder("\""); int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            b.Append('\\', c == '"' ? slashes * 2 + 1 : slashes); slashes = 0; b.Append(c);
        }
        b.Append('\\', slashes * 2); return b.Append('"').ToString();
    }
    static bool FullPath(string p) {
        return p.Length < 2048 && p.Length > 3 && p[1] == ':' && p[2] == '\\' &&
            p.IndexOfAny(new[] {'\0','\r','\n','"'}) < 0 && Path.GetFullPath(p) == p;
    }
    static Thread Background(ThreadStart action) { var t = new Thread(action); t.IsBackground = true; t.Start(); return t; }
    static uint Active() {
        Accounting a; Need(QueryInformationJobObject(job, 1, out a, Marshal.SizeOf(typeof(Accounting)), IntPtr.Zero)); return a.ActiveProcesses;
    }
    static void Pump(IntPtr handle, string channel) {
        try { using (var s = new FileStream(new SafeFileHandle(handle, true), FileAccess.Read)) {
            var b = new byte[4096]; int n, total = 0;
            while ((n = s.Read(b, 0, b.Length)) > 0) {
                total += n;
                if (total > (channel == "stdout" ? 131072 : 32768)) { Stop("output_limit"); return; }
                if (channel == "stdout") stdoutBytes = total; else stderrBytes = total;
                var chunk = new byte[n]; Buffer.BlockCopy(b, 0, chunk, 0, n);
                if (!Emit(new { version = Version, type = "data", attempt = attempt, channel = channel, data = Convert.ToBase64String(chunk) })) return;
            }
        }} catch { Stop("pipe_error"); }
    }
    static IntPtr[] Pipe(bool parentReads) {
        var sa = new Security { length = Marshal.SizeOf(typeof(Security)), inherit = true };
        IntPtr read, write; Need(CreatePipe(out read, out write, ref sa, 0));
        if (!SetHandleInformation(parentReads ? read : write, 1, 0)) { CloseHandle(read); CloseHandle(write); Need(false); }
        return new[] { read, write };
    }
    static bool Close(ref IntPtr h) { if (h == IntPtr.Zero) return true; bool ok = CloseHandle(h); h = IntPtr.Zero; return ok; }
    static int Main()
    {
        IntPtr attributes = IntPtr.Zero, handles = IntPtr.Zero, jobList = IntPtr.Zero, environment = IntPtr.Zero;
        var pipes = new List<IntPtr>(); Thread outPump = null, errPump = null;
        int stopMs = 3000, duration = 0; bool clean = false; uint active = 0;
        // A blocked request/read/output channel cannot indefinitely retain a job.
        Background(delegate { while (Clock.ElapsedMilliseconds < Interlocked.Read(ref killDeadline)) Thread.Sleep(10); Environment.Exit(3); });
        Background(delegate { Thread.Sleep(3000); if (!resumed) Stop("startup_timeout"); });
        Dictionary<string, object> request = null;
        Background(delegate {
            try { var line = Line(262144); if (line == null) { Stop("controller_closed"); return; }
                request = new JavaScriptSerializer { MaxJsonLength = 262144, RecursionLimit = 12 }.Deserialize<Dictionary<string, object>>(line);
            } catch { Stop("request_invalid"); }
        });
        try {
            while (Volatile.Read(ref request) == null && Reason == null) Thread.Sleep(5);
            Need(request != null && Reason == null);
            Version = Str(request, "version");
            Need(Version == "roost-windows-job-v1" || Version == "roost-windows-job-v2");
            var keys = new List<string>(new[] { "version", "attempt", "executable", "argv", "cwd", "environment", "input", "durationMs", "stopMs" });
#if TEST_FAULTS
            keys.Add("fault");
#endif
            Exact(request, keys.ToArray()); Need(Str(request, "version") == Version);
            Guid parsed; attempt = Str(request, "attempt"); Need(Guid.TryParseExact(attempt, "D", out parsed));
            string exe = Str(request, "executable"), cwd = Str(request, "cwd");
            Need(FullPath(exe) && exe.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && File.Exists(exe));
            Need(FullPath(cwd) && Directory.Exists(cwd));
            var args = request["argv"] as ArrayList; Need(args != null && args.Count <= 64);
            var command = new StringBuilder(Quote(exe));
            foreach (object o in args) { var s = o as string; Need(s != null && s.Length <= 8192 && s.IndexOf('\0') < 0); command.Append(" ").Append(Quote(s)); }
            Need(command.Length < 30000);
            duration = Number(request, "durationMs", 1, 3600000); stopMs = Number(request, "stopMs", 100, 3000);
            byte[] input = Convert.FromBase64String(Str(request, "input")); Need(input.Length <= 131072);
            var env = request["environment"] as Dictionary<string, object>; Need(env != null && env.Count <= 128);
            var sorted = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in env) { var v = pair.Value as string;
                Need(pair.Key.Length > 0 && pair.Key.IndexOfAny(new[] {'=','\0'}) < 0 && v != null && v.IndexOf('\0') < 0);
                sorted.Add(pair.Key, v);
            }
            var envText = new StringBuilder(); foreach (var p in sorted) envText.Append(p.Key).Append('=').Append(p.Value).Append('\0');
            envText.Append('\0'); if (sorted.Count == 0) envText.Append('\0'); Need(envText.Length <= 32767);
            environment = Marshal.StringToHGlobalUni(envText.ToString());
            Need(IsProcessInJob(GetCurrentProcess(), IntPtr.Zero, out controllerJob));
            job = CreateJobObject(IntPtr.Zero, null); Need(job != IntPtr.Zero);
            var limits = new ExtendedLimits(); limits.Basic.LimitFlags = KillOnClose;
            Need(SetInformationJobObject(job, 9, ref limits, Marshal.SizeOf(typeof(ExtendedLimits))));
            ExtendedLimits actual; Need(QueryInformationJobObject(job, 9, out actual, Marshal.SizeOf(typeof(ExtendedLimits)), IntPtr.Zero));
            Need(actual.Basic.LimitFlags == KillOnClose); limitsConfigured = true; // neither BREAKAWAY nor SILENT_BREAKAWAY
            IntPtr[] pin = Pipe(false); pipes.AddRange(pin);
            IntPtr[] pout = Pipe(true); pipes.AddRange(pout);
            IntPtr[] perr = Pipe(true); pipes.AddRange(perr);
            IntPtr size = IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero, 2, 0, ref size);
            attributes = Marshal.AllocHGlobal(size); Need(InitializeProcThreadAttributeList(attributes, 2, 0, ref size));
            handles = Marshal.AllocHGlobal(IntPtr.Size * 3);
            Marshal.Copy(new[] { pin[0], pout[1], perr[1] }, 0, handles, 3);
            Need(UpdateProcThreadAttribute(attributes, 0, (IntPtr)0x20002, handles, (IntPtr)(IntPtr.Size * 3), IntPtr.Zero, IntPtr.Zero));
            jobList = Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(jobList, job);
#if TEST_FAULTS
            if (Str(request, "fault") == "assign") Marshal.WriteIntPtr(jobList, new IntPtr(-1));
#endif
            // Windows 10+ assigns the job inside CreateProcess, including failure/crash
            // between process creation and userspace verification. No suspended orphan.
            Need(UpdateProcThreadAttribute(attributes, 0, (IntPtr)0x2000D, jobList, (IntPtr)IntPtr.Size, IntPtr.Zero, IntPtr.Zero));
            var start = new StartupEx(); start.Startup.cb = Marshal.SizeOf(typeof(StartupEx)); start.Startup.flags = 0x100;
            start.Startup.input = pin[0]; start.Startup.output = pout[1]; start.Startup.error = perr[1]; start.attributes = attributes;
            ProcessInfo pi;
            Need(CreateProcess(exe, command, IntPtr.Zero, IntPtr.Zero, true, 0x08080404, environment, cwd, ref start, out pi));
            process = pi.process; thread = pi.thread; rootId = pi.processId;
            long created, exited, kernel, user;
            Need(GetProcessTimes(process, out created, out exited, out kernel, out user));
            rootCreationTime = created.ToString();
            // CREATE_SUSPENDED | CREATE_NO_WINDOW | EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT
            inheritedJob = controllerJob; // no breakaway creation flag; nested restrictions are enforced by CreateProcess
bool member; Need(IsProcessInJob(process, job, out member) && member && Active() == 1); assigned = true;
            foreach (IntPtr h in new[] { pin[0], pout[1], perr[1] }) { CloseHandle(h); pipes.Remove(h); }
            // v2 keeps the actual kernel thread suspended until the controller
            // has durably bound this unpredictable assignment to its receipt.
            challenge = Guid.NewGuid().ToString();
            var assignment = new Dictionary<string, object> { { "version", Version }, { "type", "assigned" }, { "attempt", attempt }, { "job", identity }, { "rootPid", rootId },
                { "rootCreationTime", rootCreationTime }, { "launcherPid", launcherId }, { "launcherCreationTime", launcherCreationTime },
                { "assignedBeforeResume", true }, { "killOnClose", true }, { "breakaway", false }, { "controllerInJob", controllerJob }, { "inheritedJob", inheritedJob } };
            if (Version == "roost-windows-job-v2") assignment.Add("challenge", challenge);
            Need(Emit(assignment));
            if (Version == "roost-windows-job-v2") {
                Dictionary<string, object> acknowledgement = null;
                Background(delegate {
                    try { var line = Line(1024); if (line == null) { Stop("controller_closed"); return; }
                        var value = new JavaScriptSerializer { MaxJsonLength = 1024, RecursionLimit = 4 }.Deserialize<Dictionary<string, object>>(line);
                        Exact(value, new[] { "version", "attempt", "job", "challenge", "receipt", "resume" });
                        Need(Str(value, "version") == Version && Str(value, "attempt") == attempt && Str(value, "job") == identity && Str(value, "challenge") == challenge);
                        Need(value["resume"] is bool && (bool)value["resume"]);
                        string receipt = Str(value, "receipt"); Need(System.Text.RegularExpressions.Regex.IsMatch(receipt, "\\A[a-f0-9]{64}\\z"));
                        Volatile.Write(ref acknowledgement, value);
                    } catch { Stop("protocol_error"); }
                });
                while (Volatile.Read(ref acknowledgement) == null && Reason == null) Thread.Sleep(2);
                Need(acknowledgement != null && Reason == null);
                resumeDigest = Str(acknowledgement, "receipt");
            }
#if TEST_FAULTS
            if (Str(request, "fault") == "resume") Close(ref thread); // force actual ResumeThread failure
#endif
            lock (Gate) {
                Need(Reason == null && Clock.ElapsedMilliseconds < 3000);
                Need(ResumeThread(thread) == 1); resumed = true;
                Interlocked.Exchange(ref killDeadline, Clock.ElapsedMilliseconds + duration + stopMs + 500); Close(ref thread);
            }
            pipes.Remove(pout[0]); pipes.Remove(perr[0]);
            outPump = Background(delegate { Pump(pout[0], "stdout"); }); errPump = Background(delegate { Pump(perr[0], "stderr"); });
            pipes.Remove(pin[1]); Background(delegate {
                try { using (var s = new FileStream(new SafeFileHandle(pin[1], true), FileAccess.Write)) { s.Write(input, 0, input.Length); } }
                catch { Stop("stdin_error"); }
            });
            Background(delegate {
                try { var line = Line(1024); if (line == null) { Stop("controller_closed"); return; }
                    var control = new JavaScriptSerializer { MaxJsonLength = 1024, RecursionLimit = 4 }.Deserialize<Dictionary<string, object>>(line);
                    Exact(control, new[] { "version", "attempt", "stop" }); Need(Str(control, "version") == Version && Str(control, "attempt") == attempt);
                    string why = Str(control, "stop"); Need(Array.IndexOf(new[] { "cancel", "timeout", "lease_lost", "context_stop", "controller_shutdown", "preparation_failed" }, why) >= 0);
                    Stop(why);
                } catch { Stop("protocol_error"); }
            });
            long deadline = Clock.ElapsedMilliseconds + duration;
            while (Reason == null) {
                if (WaitForSingleObject(process, 0) == 0) { Stop("root_exit"); break; }
                if (Clock.ElapsedMilliseconds >= deadline) { Stop("timeout"); break; }
                Thread.Sleep(5);
            }
        } catch { Stop("preparation_failed"); }
        finally {
            var stopClock = Stopwatch.StartNew();
            // A stuck parent output pipe must still close the last job handle.
            Interlocked.Exchange(ref killDeadline, Clock.ElapsedMilliseconds + stopMs + 500);
            try {
                if (job != IntPtr.Zero) {
                    if (assigned) Need(TerminateJobObject(job, 130));
                    else if (process != IntPtr.Zero) Need(TerminateProcess(process, 130)); // our suspended handle only
                    while ((active = Active()) != 0 && stopClock.ElapsedMilliseconds < stopMs) Thread.Sleep(5);
                    Need(active == 0);
                }
                if (process != IntPtr.Zero) {
                    Need(WaitForSingleObject(process, (uint)Math.Max(0, stopMs - stopClock.ElapsedMilliseconds)) == 0);
                    Need(GetExitCodeProcess(process, out rootExit));
                }
                if (outPump != null) Need(outPump.Join((int)Math.Max(0, stopMs - stopClock.ElapsedMilliseconds)));
                if (errPump != null) Need(errPump.Join((int)Math.Max(0, stopMs - stopClock.ElapsedMilliseconds)));
                clean = true;
            } catch { clean = false; }
            foreach (IntPtr h in pipes) clean &= CloseHandle(h);
            clean &= Close(ref thread); clean &= Close(ref process); bool jobClosed = Close(ref job); clean &= jobClosed;
            if (attributes != IntPtr.Zero) { DeleteProcThreadAttributeList(attributes); Marshal.FreeHGlobal(attributes); }
            if (handles != IntPtr.Zero) Marshal.FreeHGlobal(handles);
            if (jobList != IntPtr.Zero) Marshal.FreeHGlobal(jobList);
            if (environment != IntPtr.Zero) Marshal.FreeHGlobal(environment);
            var finalReceipt = new { version = Version, type = "receipt", attempt = attempt, job = identity, assignedBeforeResume = assigned,
                rootPid = rootId, rootCreationTime = rootCreationTime, launcherPid = launcherId, launcherCreationTime = launcherCreationTime,
                resumed = resumed, killOnClose = limitsConfigured, breakaway = false, controllerInJob = controllerJob, inheritedJob = inheritedJob,
                rootExit = rootId == 0 ? (uint?)null : rootExit, activeProcesses = active, jobClosed = jobClosed, terminationReason = Reason, cleanup = clean,
                cleanupMs = stopClock.ElapsedMilliseconds, stdoutBytes = stdoutBytes, stderrBytes = stderrBytes };
            if (Version == "roost-windows-job-v2") {
                var record = Json.Deserialize<Dictionary<string, object>>(Json.Serialize(finalReceipt));
                record.Add("resumeReceipt", resumeDigest); Emit(record);
            } else Emit(finalReceipt);
        }
        return clean ? 0 : 3;
    }
    [StructLayout(LayoutKind.Sequential)] struct Security { public int length; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
    [StructLayout(LayoutKind.Sequential)] struct Startup { public int cb; public IntPtr reserved, desktop, title; public uint x,y,xSize,ySize,xChars,yChars,fill,flags; public short show,reservedSize; public IntPtr reservedBytes,input,output,error; }
    [StructLayout(LayoutKind.Sequential)] struct StartupEx { public Startup Startup; public IntPtr attributes; }
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process,thread; public uint processId,threadId; }
    [StructLayout(LayoutKind.Sequential)] struct BasicLimits { public long processTime,jobTime; public uint LimitFlags; public UIntPtr min,max; public uint processLimit; public UIntPtr affinity; public uint priority,scheduling; }
    [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong a,b,c,d,e,f; }
    [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits { public BasicLimits Basic; public IoCounters io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
    [StructLayout(LayoutKind.Sequential)] struct Accounting { public long a,b,c,d; public uint faults,total,ActiveProcesses,terminated; }
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr security, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessTimes(IntPtr process, out long creation, out long exit, out long kernel, out long user);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr h,int kind,ref ExtendedLimits info,int size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr h,int kind,out ExtendedLimits info,int size,IntPtr returned);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr h,int kind,out Accounting info,int size,IntPtr returned);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr h,IntPtr p);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool IsProcessInJob(IntPtr p,IntPtr job,out bool result);
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr h,uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr h,uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool CreatePipe(out IntPtr read,out IntPtr write,ref Security security,uint size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetHandleInformation(IntPtr h,uint mask,uint flags);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, EntryPoint="CreateProcessW", SetLastError=true)] static extern bool CreateProcess(string exe,StringBuilder args,IntPtr processSecurity,IntPtr threadSecurity,bool inherit,uint flags,IntPtr environment,string cwd,ref StartupEx start,out ProcessInfo info);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref IntPtr size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
    [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle,uint ms);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr handle,out uint code);
}
