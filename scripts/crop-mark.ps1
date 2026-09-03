Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot '..\src\assets\loved-known-logo-transparent.png'
$dstPath = Join-Path $PSScriptRoot '..\src\assets\loved-known-mark.png'

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath))
$w = $src.Width
$h = $src.Height

# Text „LOVED“ začíná pod symbolem – skenuj jen horních ~44 % loga
$scanMaxY = [Math]::Min($h - 1, [Math]::Floor($h * 0.44))

$minX = $w; $minY = $h; $maxX = 0; $maxY = 0

for ($y = 0; $y -le $scanMaxY; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    if ($src.GetPixel($x, $y).A -gt 20) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

$pad = 6
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($w - 1, $maxX + $pad)
$maxY = [Math]::Min($scanMaxY, $maxY + $pad)

$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
$out = New-Object System.Drawing.Bitmap $cropW, $cropH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $cropH; $y++) {
  for ($x = 0; $x -lt $cropW; $x++) {
    $out.SetPixel($x, $y, $src.GetPixel($minX + $x, $minY + $y))
  }
}

$out.Save((Resolve-Path $dstPath).Path, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Mark: ${cropW}x${cropH} bounds ($minX,$minY)-($maxX,$maxY) scanMaxY=$scanMaxY"
