using System;
using System.Runtime.InteropServices;

// Closed program: no arguments, input, paths, interpreter, network or child.
// The launcher supplies one inherited disk-file handle, never a name to open.
internal static class RoostFixedEffect
{
    [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int id);
    [DllImport("kernel32.dll")] static extern uint GetFileType(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool WriteFile(IntPtr handle, byte[] bytes, uint length, out uint written, IntPtr overlapped);
    static int Main()
    {
        var handle = GetStdHandle(-11);
        if (GetFileType(handle) != 1) return 2;
        byte[] bytes = { 82, 79, 79, 83, 84, 45, 70, 73, 88, 69, 68, 45, 69, 70, 70, 69, 67, 84, 45, 86, 49, 10 };
        uint written;
        return WriteFile(handle, bytes, (uint)bytes.Length, out written, IntPtr.Zero) && written == bytes.Length ? 0 : 3;
    }
}
