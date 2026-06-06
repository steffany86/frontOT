$path = "C:\Users\JOSUE CABRERA\TigoStarSystem\TigoStarSystem\sp_dump_flat.tsv"
$out = "C:\Users\JOSUE CABRERA\TigoStarSystem\TigoStarSystem\sp_report.md"
$lines = Get-Content -Path $path
$rows = @()
foreach($line in $lines){
  if([string]::IsNullOrWhiteSpace($line)){ continue }
  $parts = $line -split "`t", 3
  if($parts.Count -lt 3){ continue }
  $rows += [pscustomobject]@{Schema=$parts[0].Trim(); Proc=$parts[1].Trim(); Def=$parts[2].Trim()}
}
$opPatterns = @{
  SELECT='\bselect\b'
  INSERT='\binsert\b'
  UPDATE='\bupdate\b'
  DELETE='\bdelete\b'
  MERGE='\bmerge\b'
  EXEC='\bexec(?:ute)?\b'
}
$tablePatterns = @(
  '\bfrom\s+([\[\]\w\.]+)',
  '\bjoin\s+([\[\]\w\.]+)',
  '\binsert\s+into\s+([\[\]\w\.]+)',
  '\bupdate\s+([\[\]\w\.]+)',
  '\bdelete\s+from\s+([\[\]\w\.]+)',
  '\bmerge\s+into\s+([\[\]\w\.]+)'
)
$usageKeywords = @(
  @{label='auth'; keys=@('login','auth','token','session','user','usuario','cred')},
  @{label='report'; keys=@('report','reporte','rep_','rpt','dashboard','kpi')},
  @{label='maintenance'; keys=@('maintenance','manten','cleanup','purge','archive')},
  @{label='sync'; keys=@('sync','sincron','import','export','etl')},
  @{label='config'; keys=@('config','param','setting','catalog','cat_','maestro','lookup')},
  @{label='billing'; keys=@('bill','invoice','factura','cobro','payment','pago')},
  @{label='inventory'; keys=@('stock','invent','almacen','warehouse','producto','item')},
  @{label='customer'; keys=@('cliente','customer','account','cuenta','abonado')},
  @{label='order'; keys=@('order','pedido','venta','sale')},
  @{label='tech'; keys=@('tecnico','antena','ticket','soporte','support')}
)
function Add-Count([hashtable]$h, [string]$key){ if($h.ContainsKey($key)){$h[$key] += 1}else{$h[$key] = 1} }
