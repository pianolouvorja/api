# LouvorJA PIANO — Palco kiosk multi-monitor (Windows, PowerShell)
# Alternativa ao .cmd p/ quem preferir colar 1 linha no PowerShell.
# Uso: .\palco-kiosk.ps1 -Url "https://.../palco/?code=ABC123"
# Cada monitor vira slot N na URL (tela 1 = slot 1, tela 2 = slot 2...).
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [string]$ChromePath
)

if (-not $ChromePath) {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  )
  $ChromePath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $ChromePath) {
    $cmd = Get-Command chrome.exe -ErrorAction SilentlyContinue
    if ($cmd) { $ChromePath = $cmd.Source }
  }
  if (-not $ChromePath) { Write-Error 'Chrome não encontrado'; exit 127 }
}

Add-Type -AssemblyName System.Windows.Forms
$monitors = [System.Windows.Forms.Screen]::AllScreens

$n = 0
foreach ($m in $monitors) {
  $n++
  $sep = if ($Url.Contains('?')) { '&' } else { '?' }
  $screenUrl = if ($Url -match '[?&]slot=\d+') {
    $Url -replace '([?&])slot=\d+', "`$1slot=$n"
  } else {
    "$Url$sep slot=$n" -replace ' ', ''
  }
  $dir = "$env:LOCALAPPDATA\louvorja-palco-kiosk\screen-$n"
  Write-Host "Tela $n (slot $n): $screenUrl @ $($m.Bounds)"
  Start-Process -FilePath $ChromePath -ArgumentList @(
    '--kiosk', "--app=$screenUrl",
    "--user-data-dir=$dir",
    "--window-position=$($m.Bounds.X),$($m.Bounds.Y)",
    "--window-size=$($m.Bounds.Width),$($m.Bounds.Height)",
    '--no-first-run', '--disable-session-crashed-bubble'
  ) | Out-Null
}
Write-Host "Palco iniciado em $n tela(s). Encerrar: feche cada janela (Alt+F4)."
