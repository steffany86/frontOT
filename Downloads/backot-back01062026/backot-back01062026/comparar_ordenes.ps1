# Script de PowerShell para comparar órdenes de BD vs Excel

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "COMPARACIÓN FINAL: BD vs EXCEL" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

# Órdenes del Excel (38 registros)
$ordenesExcel = @(
"29119172", "29122286", "29152051", "29158085", "29162779", "29166247",
"29166307", "29166472", "29168521", "29168783", "29169248", "29170502",
"29172091", "29173424", "29176801", "29178234", "29179740", "29179752",
"29185528", "29186660", "29188289", "29195054", "29200626", "29203571",
"29208851", "29208906", "29209953", "29210542", "29212288", "29212416",
"29214798", "29216520", "29216737", "29220488", "29223247", "29227369",
"29229465", "29242377"
)

# Órdenes de la BD (40 registros)
$ordenesBD = @(
"29119172", "29122286", "29152051", "29158085", "29160908", "29162712",
"29162779", "29166247", "29166307", "29166472", "29168521", "29168783",
"29169248", "29170502", "29172091", "29173424", "29176801", "29178234",
"29179740", "29179752", "29185528", "29186660", "29188289", "29195054",
"29200626", "29203571", "29208851", "29208906", "29209953", "29210542",
"29212288", "29212416", "29214798", "29216520", "29216737", "29220488",
"29223247", "29227369", "29229465", "29242377"
)

Write-Host ""
Write-Host "Total en Excel: $($ordenesExcel.Count)" -ForegroundColor Yellow
Write-Host "Total en BD:    $($ordenesBD.Count)" -ForegroundColor Yellow
Write-Host ""

# Encontrar registros en BD que NO están en Excel
$faltantesEnExcel = $ordenesBD | Where-Object { $_ -notin $ordenesExcel }

Write-Host "REGISTROS QUE ESTAN EN LA BD PERO NO EN EL EXCEL:" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red

if ($faltantesEnExcel.Count -gt 0) {
    foreach ($orden in $faltantesEnExcel) {
        Write-Host "  - Orden: $orden" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Total de registros faltantes en Excel: $($faltantesEnExcel.Count)" -ForegroundColor Red
} else {
    Write-Host "  ¡Todos los registros de la BD están en el Excel!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "ANÁLISIS DE DIFERENCIA" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host ""
Write-Host "Las 2 órdenes faltantes en el Excel son:" -ForegroundColor Yellow
$faltantesEnExcel | ForEach-Object {
    Write-Host "  • Orden: $_" -ForegroundColor White
}

Write-Host ""
Write-Host "POSIBLES RAZONES:" -ForegroundColor Cyan
Write-Host "  1. Duplicados eliminados por ROW_NUMBER() en la consulta SQL" -ForegroundColor White
Write-Host "     - La consulta SQL usa ROW_NUMBER() OVER (PARTITION BY id_transaccion...)" -ForegroundColor Gray
Write-Host "     - Esto mantiene solo el registro más reciente por transacción" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Filtros diferentes en el proceso de exportación al Excel" -ForegroundColor White
Write-Host "     - El Excel podría tener filtros adicionales aplicados" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Timing de la extracción" -ForegroundColor White
Write-Host "     - El Excel fue generado en un momento diferente" -ForegroundColor Gray
Write-Host ""

Write-Host "=" * 80 -ForegroundColor Cyan
