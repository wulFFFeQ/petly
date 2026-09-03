Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot '..\src\assets\loved-known-logo-transparent.png'
$dstPath = Join-Path $PSScriptRoot '..\src\assets\loved-known-mark.png'

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath))
$iconHeight = 72
$out = New-Object System.Drawing.Bitmap $src.Width, $iconHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $iconHeight; $y++) {
  for ($x = 0; $x -lt $src.Width; $x++) {
    $out.SetPixel($x, $y, $src.GetPixel($x, $y))
  }
}

$resolvedDst = Resolve-Path $dstPath -ErrorAction SilentlyContinue
if (-not $resolvedDst) {
  $dstFull = Join-Path (Split-Path $srcPath) 'loved-known-mark.png'
} else {
  $dstFull = $resolvedDst.Path
}

$out.Save($dstFull, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Mark: $($src.Width)x${iconHeight}"
