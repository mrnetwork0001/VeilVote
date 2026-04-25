$emdash = [char]0x2014
$files = Get-ChildItem -Path "app\src" -Recurse -Include "*.ts","*.tsx","*.css"
foreach ($f in $files) {
    $lines = Get-Content $f.FullName -Encoding UTF8
    $text = $lines -join "`n"
    $replaced = $text.Replace($emdash + " ", "- ")
    if ($replaced -ne $text) {
        [System.IO.File]::WriteAllText($f.FullName, $replaced, [System.Text.Encoding]::UTF8)
        Write-Output ("Fixed em-dash: " + $f.Name)
    }
}
