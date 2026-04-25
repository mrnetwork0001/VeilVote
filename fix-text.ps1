$files = Get-ChildItem -Path "app\src" -Recurse -Include *.ts,*.tsx,*.css
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $changed = $false
    
    # Replace on-chain variants with onchain
    $new = $content -creplace 'On-Chain', 'Onchain' -creplace 'On-chain', 'Onchain' -creplace 'on-chain', 'onchain'
    
    # Replace em dash + space with hyphen + space
    $new = $new -replace [char]0x2014 + ' ', '- '
    
    if ($new -ne $content) {
        Set-Content $f.FullName $new -NoNewline
        Write-Output ("Fixed: " + $f.Name)
        $changed = $true
    }
}
