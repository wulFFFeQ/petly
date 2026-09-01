Add-Type -AssemblyName System.Drawing

function Test-Background([int]$r, [int]$g, [int]$b) {
  if ($r -gt 225 -and $g -gt 212 -and $b -gt 198) { return $true }
  return $false
}

$srcPath = Join-Path $PSScriptRoot '..\src\assets\loved-known-logo.png'
$dstPath = Join-Path $PSScriptRoot '..\src\assets\loved-known-logo-transparent.png'

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath))
$w = $src.Width
$h = $src.Height

$minX = $w
$minY = $h
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $c = $src.GetPixel($x, $y)
    if (-not (Test-Background $c.R $c.G $c.B)) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

# Ignore export smudges on the far-right edge (outside the actual logo artwork).
$maxX = [Math]::Min($maxX, 258)

$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
$out = New-Object System.Drawing.Bitmap $cropW, $cropH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $cropH; $y++) {
  for ($x = 0; $x -lt $cropW; $x++) {
    $c = $src.GetPixel($minX + $x, $minY + $y)
    if (Test-Background $c.R $c.G $c.B) {
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    } else {
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
    }
  }
}

$resolvedDst = Resolve-Path $dstPath
$out.Save($resolvedDst.Path, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Cropped: ${cropW}x${cropH} bounds ($minX,$minY)-($maxX,$maxY)"
