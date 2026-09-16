using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Runtime.InteropServices;
using System.Text;
internal static class OwnedTreeFixture {
    static Process Child(string mode) {
        var child = new Process { StartInfo = new ProcessStartInfo { FileName=Process.GetCurrentProcess().MainModule.FileName,
            Arguments=mode, UseShellExecute=false, CreateNoWindow=true, RedirectStandardOutput=true, RedirectStandardError=true } };
        child.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if(e.Data!=null) {Console.WriteLine(e.Data);Console.Out.Flush();} };
        child.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { };
        child.Start();child.BeginOutputReadLine();child.BeginErrorReadLine();return child;
    }
    static int Main(string[] args) {
        string mode=args.Length==0?"natural":args[0];
        // Self-expiry is an extra fixture safety bound, never ownership evidence.
        var safety=new Thread(delegate() {Thread.Sleep(15000);Environment.Exit(4);});safety.IsBackground=true;safety.Start();
        Console.WriteLine("PID:"+Process.GetCurrentProcess().Id);Console.Out.Flush();
        // B9 standard-argv fixture: drain sealed stdin without executing tools.
        if(mode=="chat") {
            string input=Console.In.ReadToEnd();
            if(input.Contains("owned budget tree fixture")) mode="tree";
            else if(input.Contains("owned budget failure fixture")) return 2;
            else {Console.WriteLine("Untrusted candidate fixture result.");return 0;}
        }
        if(mode=="foreign"||mode=="grandchild") {Thread.Sleep(10000);return 0;}
        if(mode=="child") {using(var c=Child("grandchild")) {Thread.Sleep(10000);}return 0;}
        if(mode=="tree"||mode=="survivor") {using(var c=Child("child")){Thread.Sleep(mode=="tree"?10000:700);}return 0;}
        if(mode=="stdout"||mode=="stderr") {var s=mode=="stdout"?Console.OpenStandardOutput():Console.OpenStandardError();var b=new byte[4096];for(int i=0;i<100;i++)s.Write(b,0,b.Length);Thread.Sleep(10000);return 0;}
        if(mode=="echo") {Console.Write(Console.In.ReadToEnd());for(int i=1;i<args.Length;i++)Console.WriteLine("ARG:"+Convert.ToBase64String(Encoding.UTF8.GetBytes(args[i])));return 0;}
        if(mode=="breakaway") {
            var si=new Startup();si.cb=Marshal.SizeOf(typeof(Startup));Info pi;
            bool ok=CreateProcess(Process.GetCurrentProcess().MainModule.FileName,new StringBuilder("fixture.exe grandchild"),IntPtr.Zero,IntPtr.Zero,false,0x01000004,IntPtr.Zero,null,ref si,out pi);
            if(ok){TerminateProcess(pi.process,9);CloseHandle(pi.thread);CloseHandle(pi.process);Console.WriteLine("BREAKAWAY:allowed");return 8;}
            Console.WriteLine("BREAKAWAY:denied");return 0;
        }
        return 0;
    }
    [StructLayout(LayoutKind.Sequential)] struct Startup {public int cb;public IntPtr reserved,desktop,title;public uint x,y,xSize,ySize,xChars,yChars,fill,flags;public short show,reservedSize;public IntPtr reservedBytes,input,output,error;}
    [StructLayout(LayoutKind.Sequential)] struct Info {public IntPtr process,thread;public uint pid,tid;}
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,EntryPoint="CreateProcessW",SetLastError=true)]static extern bool CreateProcess(string exe,StringBuilder cmd,IntPtr a,IntPtr b,bool inherit,uint flags,IntPtr env,string cwd,ref Startup si,out Info pi);
    [DllImport("kernel32.dll")]static extern bool TerminateProcess(IntPtr p,uint code);
    [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr p);
}
