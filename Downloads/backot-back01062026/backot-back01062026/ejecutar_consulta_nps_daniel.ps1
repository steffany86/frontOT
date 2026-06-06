# Script para consultar NPS de Daniel Carreno - Mayo 2026
# Base de datos: BDControlOrdenes (172.16.0.13)

$servidor = "172.16.0.13"
$baseDatos = "BDControlOrdenes"
$usuario = "sistemas"
$password = "sametsis"
$archivoSQL = "consulta_nps_daniel_mayo.sql"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Consultando NPS de Daniel Carreno Rojas" -ForegroundColor Cyan
Write-Host "Periodo: Mayo 2026 (01/05/2026 - 31/05/2026)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Intentar con sqlcmd
try {
    Write-Host "Ejecutando consulta con sqlcmd..." -ForegroundColor Yellow
    $tab = [char]9
    sqlcmd -S $servidor -d $baseDatos -U $usuario -P $password -i $archivoSQL -s $tab -W
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Consulta ejecutada exitosamente" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Error al ejecutar la consulta (codigo: $LASTEXITCODE)" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "NOTA: Asegurate de tener SQL Server Command Line Tools instalado" -ForegroundColor Yellow
    Write-Host "O ejecuta el archivo 'consulta_nps_daniel_mayo.sql' manualmente en SQL Server Management Studio" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Detalles de conexion:" -ForegroundColor Cyan
Write-Host "  Servidor: $servidor" -ForegroundColor White
Write-Host "  Base de datos: $baseDatos" -ForegroundColor White
Write-Host "  Usuario: $usuario" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
