# Generic credentials are encrypted by Windows for this Windows user. Never
# write returned values to the console, a file, or a command-line argument.
if (-not ('RoostCredential' -as [type])) {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class RoostCredential {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  struct Credential {
    public uint Flags, Type;
    public string TargetName, Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist, AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias, UserName;
  }
  [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredWrite(ref Credential credential, uint flags);
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredRead(string target, uint type, uint flags, out IntPtr credential);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr credential);
  public static void Write(string target, string user, string secret) {
    byte[] bytes=Encoding.Unicode.GetBytes(secret);
    IntPtr blob=Marshal.AllocHGlobal(bytes.Length);
    try {
      Marshal.Copy(bytes,0,blob,bytes.Length);
      var c=new Credential { Type=1,TargetName=target,UserName=user,CredentialBlob=blob,CredentialBlobSize=(uint)bytes.Length,Persist=2 };
      if(!CredWrite(ref c,0)) throw new InvalidOperationException("credential_write_failed");
    } finally {
      for(int i=0;i<bytes.Length;i++) Marshal.WriteByte(blob,i,0);
      Array.Clear(bytes,0,bytes.Length); Marshal.FreeHGlobal(blob);
    }
  }
  public static string Read(string target) {
    IntPtr ptr;
    if(!CredRead(target,1,0,out ptr)) throw new InvalidOperationException("credential_unavailable");
    try { var c=(Credential)Marshal.PtrToStructure(ptr,typeof(Credential)); return Marshal.PtrToStringUni(c.CredentialBlob,(int)c.CredentialBlobSize/2); }
    finally { CredFree(ptr); }
  }
}
'@
}
