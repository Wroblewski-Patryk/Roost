using System;
using System.Diagnostics;
using System.IO;

// Compile as winexe: Task Scheduler must never create an initial console.
internal static class RoostAgentHostLauncher
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length != 1 || !Path.IsPathRooted(args[0]) ||
                args[0].IndexOfAny(new[] { '"', '\r', '\n' }) >= 0 ||
                !File.Exists(args[0]) || !args[0].EndsWith(".ps1", StringComparison.OrdinalIgnoreCase)) return 1;
            var start = new ProcessStartInfo
            {
                FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
                    @"WindowsPowerShell\v1.0\powershell.exe"),
                Arguments = "-NoProfile -NonInteractive -WindowStyle Hidden -File \"" + args[0] + "\" -Action Run",
                WorkingDirectory = Path.GetDirectoryName(args[0]),
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            // No credential access here. The existing Run path owns the mutex,
            // Credential Manager read and hidden Node child. Do not detach:
            // Task Scheduler needs the real lifetime and exit code for restart.
            using (var child = Process.Start(start))
            {
                child.WaitForExit();
                return child.ExitCode;
            }
        }
        catch { return 1; } // No popup, arbitrary exception output or secret log.
    }
}
