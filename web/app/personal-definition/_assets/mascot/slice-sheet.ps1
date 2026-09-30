# One-time asset prep. Run by hand, commit the output.
#   powershell -File slice-sheet.ps1 -Sheet "D:\download\mascot\mascot_momo_4-1-2048x1171.png"
param(
  [Parameter(Mandatory=$true)][string]$Sheet,
  [string]$OutDir,      # default: "<script dir>\faces", resolved below
  [int]$Step = 4,      # alpha sampling stride; bands are far wider than 4px
  [int]$Pad  = 8       # padding restored around each detected box
)

# Resolved here rather than as the param default: with a Mandatory parameter
# present, $PSScriptRoot is not yet populated while parameter defaults are
# evaluated on this host, even though it is populated by the time the body
# runs. Evaluating it here keeps the documented no-flags invocation writing
# into the repo instead of silently landing outside it.
if (-not $OutDir) { $OutDir = Join-Path $PSScriptRoot "faces" }

Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Sheet))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function Get-Bands([int[]]$occupied, [int]$limit) {
  # Turn a per-line "has any opaque pixel" flag array into [start,end] runs.
  $bands = @(); $start = -1
  for ($i = 0; $i -lt $limit; $i++) {
    if ($occupied[$i] -and $start -lt 0) { $start = $i }
    elseif (-not $occupied[$i] -and $start -ge 0) { $bands += ,@($start, ($i - 1)); $start = -1 }
  }
  if ($start -ge 0) { $bands += ,@($start, ($limit - 1)) }
  return $bands
}

# Row bands -> the three rows of the sheet.
$rowOccupied = New-Object int[] $bmp.Height
for ($y = 0; $y -lt $bmp.Height; $y += $Step) {
  for ($x = 0; $x -lt $bmp.Width; $x += $Step) {
    if ($bmp.GetPixel($x, $y).A -gt 16) { for ($k = 0; $k -lt $Step -and ($y + $k) -lt $bmp.Height; $k++) { $rowOccupied[$y + $k] = 1 }; break }
  }
}
$rows = Get-Bands $rowOccupied $bmp.Height
Write-Output "Rows detected: $($rows.Count)"

$n = 0
foreach ($row in $rows) {
  # Column bands within this row -> the faces in it.
  $colOccupied = New-Object int[] $bmp.Width
  for ($x = 0; $x -lt $bmp.Width; $x += $Step) {
    for ($y = $row[0]; $y -le $row[1]; $y += $Step) {
      if ($bmp.GetPixel($x, $y).A -gt 16) { for ($k = 0; $k -lt $Step -and ($x + $k) -lt $bmp.Width; $k++) { $colOccupied[$x + $k] = 1 }; break }
    }
  }
  foreach ($col in (Get-Bands $colOccupied $bmp.Width)) {
    $n++
    $x0 = [Math]::Max(0, $col[0] - $Pad); $y0 = [Math]::Max(0, $row[0] - $Pad)
    $x1 = [Math]::Min($bmp.Width  - 1, $col[1] + $Pad)
    $y1 = [Math]::Min($bmp.Height - 1, $row[1] + $Pad)
    $rect = New-Object System.Drawing.Rectangle $x0, $y0, ($x1 - $x0 + 1), ($y1 - $y0 + 1)
    $crop = $bmp.Clone($rect, $bmp.PixelFormat)
    $name = "face-{0:d2}.png" -f $n
    $crop.Save((Join-Path $OutDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Output "  $name  $($rect.Width)x$($rect.Height)"
  }
}
$bmp.Dispose()
Write-Output "Wrote $n faces to $OutDir"
