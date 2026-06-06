param(
  [string]$ProjectDir = ".",
  [string]$JavaHome = "C:\Program Files\BellSoft\LibericaJDK-8-Full",
  [int]$Port = 9060,
  [string]$JarName = "",
  [string]$KeyStorePath = "C:/certs/tigostar-backend.pfx",
  [string]$KeyStorePassword = "CAMBIAR_PASSWORD",
  [string]$KeyAlias = "tigostar-backend",
  [string]$EnabledProtocols = "TLSv1,TLSv1.1,TLSv1.2"
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectDir

if (-not (Test-Path $JavaHome)) {
  throw "JAVA_HOME no existe: $JavaHome"
}

$env:JAVA_HOME = $JavaHome
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# TLS saliente para conexiones legacy (SQL/correo antiguos)
$env:JAVA_TOOL_OPTIONS = "-Djdk.tls.client.protocols=$EnabledProtocols -Dhttps.protocols=$EnabledProtocols"

Write-Host "Compilando proyecto..."
if (Test-Path ".\mvnw.cmd") {
  .\mvnw.cmd -DskipTests clean package
} else {
  mvn -DskipTests clean package
}

if ([string]::IsNullOrWhiteSpace($JarName)) {
  $jarFile = Get-ChildItem ".\target\*.jar" | Where-Object { $_.Name -notlike "*original*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $jarFile) { throw "No se encontro .jar en .\target" }
  $JarName = $jarFile.Name
}

Write-Host "Levantando: $JarName en puerto $Port con $EnabledProtocols"
& "$env:JAVA_HOME\bin\java.exe" -jar ".\target\$JarName" `
  --server.port=$Port `
  --server.ssl.enabled=true `
  --server.ssl.key-store=$KeyStorePath `
  --server.ssl.key-store-password=$KeyStorePassword `
  --server.ssl.key-store-type=PKCS12 `
  --server.ssl.key-alias=$KeyAlias `
  --server.ssl.enabled-protocols=$EnabledProtocols
