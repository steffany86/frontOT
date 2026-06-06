$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$jdk8 = "C:\Program Files\Java\jdk-1.8"
$override = (Resolve-Path (Join-Path $root "config\\java.security.override")).Path

if (-not (Test-Path $jdk8)) {
  Write-Host "No se encontro JDK8 en: $jdk8"
  Write-Host "Instala JDK8 o ajusta esta ruta en run-dev-jdk8.ps1."
  exit 1
}

$env:JAVA_HOME = $jdk8
$env:Path = "$jdk8\\bin;$env:Path"

$javaOpts = "-Djava.security.properties=`"$override`" -Djdk.tls.client.protocols=TLSv1,TLSv1.1,TLSv1.2 -Dhttps.protocols=TLSv1,TLSv1.1,TLSv1.2"
$env:JAVA_TOOL_OPTIONS = $javaOpts

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "JAVA_TOOL_OPTIONS=$env:JAVA_TOOL_OPTIONS"
& "$env:JAVA_HOME\\bin\\java.exe" -version

& "$root\\mvnw.cmd" -q -DskipTests clean package
& "$env:JAVA_HOME\\bin\\java.exe" -jar "$root\\target\\TigoStarSystem-0.0.1-SNAPSHOT.jar"
