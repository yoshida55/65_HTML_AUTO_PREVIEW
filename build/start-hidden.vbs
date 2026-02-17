Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' 起動時に少し待つ（システム負荷軽減のため10秒待機）
WScript.Sleep 10000

' 作業フォルダをスクリプトのある場所に移動
WshShell.CurrentDirectory = ScriptPath

' EXEをバックグラウンドで起動
WshShell.Run Chr(34) & ScriptPath & "\clipboard-watch.exe" & Chr(34), 0, False
